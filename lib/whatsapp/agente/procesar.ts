import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { tenantBookingPageUrl } from '@/lib/urls';
import { enviarTexto } from '@/lib/whatsapp/texto';
import { descargarMedia } from '@/lib/whatsapp/media';
import { TRANSCRIPCION_ACTIVA, transcribir } from '@/lib/whatsapp/transcribir';
import { extraerConstancia } from '@/lib/whatsapp/cotiza/constancia';
import { NOMBRES_COTIZA, TOOLS_COTIZA, TOOLS_FACTURA, ejecutarHerramientaCotiza, type ContextoCotiza } from '@/lib/whatsapp/cotiza/herramientas';
import { correrAgente, type Turno } from './agente';
import { TOOLS, ejecutarHerramienta } from './herramientas';
import { agenteDisponible, cotizaDisponible, resolverTenant } from './ruteo';
import { puedeMandarArchivo, revisarTope } from './tope';

// Un mensaje entrante, de punta a punta: dedup → negocio → tope →
// conversación → (si está en modo IA) agente → respuesta. Corre DESPUÉS
// de que el webhook ya contestó 200 a Meta (next/server `after`).

export type MensajeEntrante = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  texto: string | null;
  phoneNumberId: string;
  /** Imagen, documento o audio: el id para bajarlo de Meta. */
  mediaId?: string;
};

// Lo que se guarda en whatsapp_conversaciones.historial. El modelo ve
// los últimos HISTORIAL_MODELO; el panel, estos.
const HISTORIAL_GUARDADO = 30;

/** Saca los mensajes del payload de Meta (entry[].changes[].value.messages[]). Ignora estados de entrega. */
export function extraerMensajes(payload: unknown): MensajeEntrante[] {
  const out: MensajeEntrante[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    for (const ch of Array.isArray(changes) ? changes : []) {
      const value = (ch as { value?: Record<string, unknown> })?.value;
      const phoneNumberId = (value?.metadata as { phone_number_id?: string } | undefined)?.phone_number_id;
      const messages = value?.messages;
      if (!phoneNumberId || !Array.isArray(messages)) continue;
      for (const m of messages as Record<string, unknown>[]) {
        if (typeof m?.id !== 'string' || typeof m?.from !== 'string') continue;
        const media = (['image', 'document', 'audio'].includes(String(m.type)) ? m[String(m.type)] : null) as { id?: unknown } | null;
        out.push({
          id: m.id,
          from: m.from.replace(/\D/g, ''),
          timestamp: String(m.timestamp ?? ''),
          type: String(m.type ?? ''),
          texto: m.type === 'text' ? String((m.text as { body?: string } | undefined)?.body ?? '').slice(0, 2000) : null,
          phoneNumberId,
          ...(typeof media?.id === 'string' ? { mediaId: media.id } : {}),
        });
      }
    }
  }
  return out;
}

export type Deps = {
  db?: SupabaseClient;
  client?: Pick<Anthropic, 'messages'>;
  enviar?: typeof enviarTexto;
  descargar?: typeof descargarMedia;
  extraer?: (bytes: ArrayBuffer, mime: string) => ReturnType<typeof extraerConstancia>;
  factura?: ContextoCotiza['deps'];
};

export type Resultado = 'duplicado' | 'ignorado' | 'sin_resolver' | 'agente_apagado' | 'tope' | 'humano' | 'respondido' | 'error';

const AVISO_TOPE = 'Recibí muchos mensajes seguidos. Dame un rato y te contesto, o espera a que alguien del negocio te escriba por aquí.';
const SOLO_TEXTO = 'Por ahora solo puedo leer mensajes de texto. ¿Me lo escribes?';
const SIN_AUDIO = 'Por ahora no puedo escuchar notas de voz. ¿Me escribes tu mensaje?';

export async function procesarMensaje(m: MensajeEntrante, deps: Deps = {}): Promise<Resultado> {
  const db = deps.db ?? createAdminClient();
  const enviar = deps.enviar ?? enviarTexto;
  // Solo metadatos. Nunca el contenido ni el teléfono.
  console.info('whatsapp entrante', { id: m.id, type: m.type, timestamp: m.timestamp });

  // Dedup ANTES de cualquier efecto: Meta reintenta y un reintento no
  // debe agendar dos veces. 23505 = ya lo procesamos. La misma fila sirve
  // para contar el tope (teléfono, negocio, si trae archivo).
  const archivo = m.type === 'image' || m.type === 'document';
  let { error: dupError } = await db.from('whatsapp_mensajes_procesados').insert({ wamid: m.id, telefono: m.from, archivo });
  // Sin db/057 esas columnas no existen: dedup igual, sin tope.
  if (dupError?.code === '42703' || dupError?.code === 'PGRST204') {
    ({ error: dupError } = await db.from('whatsapp_mensajes_procesados').insert({ wamid: m.id }));
  }
  if (dupError) {
    if (dupError.code === '23505') return 'duplicado';
    // Sin tabla de dedup (db/056 sin correr) no se arriesga a duplicar citas.
    console.error('whatsapp dedup falló', { id: m.id, code: dupError.code });
    return 'error';
  }

  const ruteo = await resolverTenant(db, { phoneNumberId: m.phoneNumberId, from: m.from, texto: m.texto });
  if (ruteo.tipo === 'ignorar') return 'ignorado';
  if (ruteo.tipo === 'sin_resolver') {
    await enviar(
      m.phoneNumberId,
      m.from,
      '¡Hola! ¿Con qué negocio quieres agendar? Escribe "Hola" y el nombre corto del negocio, como aparece en su página de reservas (por ejemplo: Hola salon-maria).'
    );
    return 'sin_resolver';
  }

  const { tenant, porPlataforma } = ruteo;
  const citas = agenteDisponible(tenant);
  const cotiza = cotizaDisponible(tenant, porPlataforma);
  const factura = cotiza && tenant.facturacion_enabled === true;
  if (!citas && !cotiza) {
    // Por el número propio del negocio, el dueño contesta a mano: silencio.
    if (porPlataforma) {
      await enviar(m.phoneNumberId, m.from, `${tenant.name} todavía no atiende por WhatsApp. Puedes reservar aquí: ${tenantBookingPageUrl(tenant.slug)}`);
    }
    return 'agente_apagado';
  }

  // Tope ANTES de cualquier llamada a Claude. Este mensaje ya cuenta (está en el dedup).
  await db.from('whatsapp_mensajes_procesados').update({ tenant_id: tenant.id }).eq('wamid', m.id);
  const tope = await revisarTope(db, m.from, tenant.id);
  if (tope !== 'ok') {
    console.info('whatsapp tope', { id: m.id, veredicto: tope });
    if (tope === 'avisar') await enviar(m.phoneNumberId, m.from, AVISO_TOPE);
    return 'tope';
  }

  // Conversación (una por negocio + teléfono).
  const { data: existente } = await db
    .from('whatsapp_conversaciones')
    .select('id, historial, estado')
    .eq('tenant_id', tenant.id)
    .eq('telefono', m.from)
    .maybeSingle();
  type Conv = { id: string; historial: Turno[] | null; estado: string };
  let conv = existente as Conv | null;
  if (!conv) {
    const { data, error } = await db
      .from('whatsapp_conversaciones')
      .insert({ tenant_id: tenant.id, telefono: m.from, phone_number_id: m.phoneNumberId })
      .select('id, historial, estado')
      .single();
    if (error || !data) {
      console.error('whatsapp conversación no creada', { id: m.id, code: error?.code });
      return 'error';
    }
    conv = data as Conv;
  }
  const c = conv;

  const ahora = new Date().toISOString();
  let texto = m.texto;
  // Nota de voz: con la transcripción apagada ni se descarga.
  if (m.type === 'audio' && TRANSCRIPCION_ACTIVA && m.mediaId) {
    const audio = await (deps.descargar ?? descargarMedia)(m.mediaId);
    if (audio.ok) texto = (await transcribir(audio.bytes, audio.mime))?.slice(0, 2000) ?? null;
  }
  const historial: Turno[] = [
    ...(Array.isArray(c.historial) ? c.historial : []),
    { role: 'user', content: texto ?? (archivo ? '[mandó un archivo]' : `[${m.type || 'mensaje'} sin texto]`), at: ahora },
  ];

  // shortcut: dos mensajes simultáneos del mismo cliente pueden pisarse el historial (último gana); si molesta, mover el append a una RPC.
  const guardar = (h: Turno[], extra: Record<string, unknown> = {}) =>
    db
      .from('whatsapp_conversaciones')
      .update({ historial: h.slice(-HISTORIAL_GUARDADO), last_message_at: new Date().toISOString(), phone_number_id: m.phoneNumberId, ...extra })
      .eq('id', c.id)
      .eq('tenant_id', tenant.id);

  if (c.estado === 'humano') {
    await guardar(historial);
    return 'humano';
  }

  let respuesta: string;
  let fallo = false;
  const ctx = { db, tenantId: tenant.id, slug: tenant.slug, timezone: tenant.timezone, telefono: m.from, conversacionId: c.id };
  if (texto === null && archivo && factura) {
    respuesta = await leerConstancia(db, deps, ctx, m);
  } else if (texto === null) {
    respuesta = m.type === 'audio' ? SIN_AUDIO : SOLO_TEXTO;
  } else {
    const ctxCotiza: ContextoCotiza = {
      ...ctx,
      phoneNumberId: m.phoneNumberId,
      facturacion: factura,
      confirmarFacturas: tenant.cotiza_confirmar_facturas !== false,
      turnoInicio: ahora,
      deps: deps.factura,
    };
    const tools = [...TOOLS.filter((t) => citas || t.name === 'pasar_a_humano'), ...(cotiza ? TOOLS_COTIZA : []), ...(factura ? TOOLS_FACTURA : [])];
    const permitidas = new Set(tools.map((t) => t.name));
    try {
      ({ respuesta, fallo } = await correrAgente({
        tenant,
        historial,
        client: deps.client,
        ctx,
        modo: { citas, cotiza, factura },
        tools,
        // Solo corre lo que se ofreció: con citas o facturación apagadas, esos nombres no se ejecutan.
        ejecutar: async (nombre, input) => {
          if (!permitidas.has(nombre)) throw new Error(`Herramienta no disponible: ${nombre}`);
          return NOMBRES_COTIZA.has(nombre) ? ejecutarHerramientaCotiza(ctxCotiza, nombre, input) : ejecutarHerramienta(ctx, nombre, input);
        },
      }));
    } catch (e) {
      console.error('whatsapp agente falló', { id: m.id, error: e instanceof Error ? e.name : 'unknown' });
      respuesta = 'Perdón, tuve un problema. Le aviso a alguien del negocio para que te escriba por aquí.';
      fallo = true;
    }
  }

  const envio = await enviar(m.phoneNumberId, m.from, respuesta);
  if (!envio.ok) console.error('whatsapp respuesta no enviada', { id: m.id, error: envio.error });
  // Sin `estado` en el update normal: pasar_a_humano pudo haberlo cambiado durante el turno.
  await guardar([...historial, { role: 'assistant', content: respuesta, at: new Date().toISOString() }], fallo ? { estado: 'humano' } : {});
  return 'respondido';
}

const ETIQUETA_USO: Record<string, string> = {
  G01: 'adquisición de mercancías',
  G03: 'gastos en general',
  I01: 'construcciones',
  I04: 'equipo de cómputo',
  S01: 'sin efectos fiscales',
};

/** Armado en código (no por el modelo): el cliente confirma exactamente lo que se va a timbrar. */
function mensajeConfirmacion(d: { rfc: string; razon_social: string; regimen: string; codigo_postal: string; uso_cfdi: string }): string {
  return [
    'Leí tu constancia. ¿Están bien estos datos para tu factura?',
    `RFC: ${d.rfc}`,
    `Razón social: ${d.razon_social}`,
    `Régimen fiscal: ${d.regimen}`,
    `Código postal: ${d.codigo_postal}`,
    `Uso de CFDI: ${d.uso_cfdi}${ETIQUETA_USO[d.uso_cfdi] ? ` (${ETIQUETA_USO[d.uso_cfdi]})` : ''}`,
    'Si todo está bien, contesta "sí". Si quieres otro uso de CFDI o algo está mal, dime qué cambiar.',
  ].join('\n');
}

/**
 * Llegó una imagen o PDF con facturación prendida. Si este teléfono tiene
 * una cotización esperando datos fiscales, se lee como constancia y se le
 * piden confirmar los datos; si no, se le pregunta de qué cotización es.
 * Los datos fiscales nunca van a los logs.
 */
async function leerConstancia(db: SupabaseClient, deps: Deps, ctx: { tenantId: string; telefono: string }, m: MensajeEntrante): Promise<string> {
  const { data: pendiente } = await db
    .from('quotes')
    .select('id, folio')
    .eq('tenant_id', ctx.tenantId)
    .eq('whatsapp_telefono', ctx.telefono)
    .in('factura_estado', ['esperando_datos', 'por_confirmar'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pendiente) return 'Recibí tu archivo. Si es tu constancia fiscal para facturar, primero dime de qué cotización (el folio) quieres la factura.';
  if (!m.mediaId) return 'No pude abrir tu archivo. ¿Me lo mandas otra vez?';
  if (!(await puedeMandarArchivo(db, ctx.telefono))) {
    return 'Ya recibí varios archivos hoy. Mejor escríbeme tu RFC, razón social, régimen fiscal, código postal y uso de CFDI.';
  }

  const archivo = await (deps.descargar ?? descargarMedia)(m.mediaId);
  if (!archivo.ok) return 'No pude abrir tu archivo. ¿Me lo mandas otra vez en PDF o como foto?';
  const r = await (deps.extraer ?? extraerConstancia)(archivo.bytes, archivo.mime);
  console.info('whatsapp constancia', { id: m.id, ok: r.ok, motivo: r.ok ? null : r.motivo });
  if (!r.ok) {
    if (r.motivo === 'no_es_constancia') return 'Ese archivo no parece tu Constancia de Situación Fiscal. Puedes descargarla del portal del SAT y mandármela, o escribirme tus datos.';
    if (r.motivo === 'formato') return 'Ese tipo de archivo no lo puedo leer. Mándame la constancia en PDF o como foto.';
    return 'No alcancé a leer bien la constancia. ¿Me mandas una foto más clara o el PDF?';
  }
  if (r.faltantes.length) {
    return `Leí tu constancia, pero hay algo que no me cuadra: ${r.faltantes.join(' ')} ¿Me escribes ese dato o me mandas una foto más clara?`;
  }

  const { error } = await db
    .from('quotes')
    .update({
      receptor_rfc: r.datos.rfc,
      receptor_razon_social: r.datos.razon_social,
      receptor_regimen: r.datos.regimen,
      receptor_codigo_postal: r.datos.codigo_postal,
      receptor_uso_cfdi: r.datos.uso_cfdi,
      factura_estado: 'por_confirmar',
      factura_datos_at: new Date().toISOString(),
    })
    .eq('id', pendiente.id)
    .eq('tenant_id', ctx.tenantId)
    .eq('whatsapp_telefono', ctx.telefono);
  if (error) return 'Tuve un problema guardando tus datos. Le aviso a alguien del negocio.';
  return `Cotización ${pendiente.folio}. ${mensajeConfirmacion(r.datos)}`;
}
