import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { tenantBookingPageUrl } from '@/lib/urls';
import { enviarTexto } from '@/lib/whatsapp/texto';
import { correrAgente, type Turno } from './agente';
import { agenteDisponible, resolverTenant } from './ruteo';

// Un mensaje entrante, de punta a punta: dedup → negocio → conversación
// → (si está en modo IA) agente → respuesta. Corre DESPUÉS de que el
// webhook ya contestó 200 a Meta (next/server `after`).

export type MensajeEntrante = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  texto: string | null;
  phoneNumberId: string;
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
        out.push({
          id: m.id,
          from: m.from.replace(/\D/g, ''),
          timestamp: String(m.timestamp ?? ''),
          type: String(m.type ?? ''),
          texto: m.type === 'text' ? String((m.text as { body?: string } | undefined)?.body ?? '').slice(0, 2000) : null,
          phoneNumberId,
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
};

export type Resultado = 'duplicado' | 'ignorado' | 'sin_resolver' | 'agente_apagado' | 'humano' | 'respondido' | 'error';

export async function procesarMensaje(m: MensajeEntrante, deps: Deps = {}): Promise<Resultado> {
  const db = deps.db ?? createAdminClient();
  const enviar = deps.enviar ?? enviarTexto;
  // Solo metadatos. Nunca el contenido ni el teléfono.
  console.info('whatsapp entrante', { id: m.id, type: m.type, timestamp: m.timestamp });

  // Dedup ANTES de cualquier efecto: Meta reintenta y un reintento no
  // debe agendar dos veces. 23505 = ya lo procesamos.
  const { error: dupError } = await db.from('whatsapp_mensajes_procesados').insert({ wamid: m.id });
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
  if (!agenteDisponible(tenant)) {
    // Por el número propio del negocio, el dueño contesta a mano: silencio.
    if (porPlataforma) {
      await enviar(m.phoneNumberId, m.from, `${tenant.name} todavía no atiende por WhatsApp. Puedes reservar aquí: ${tenantBookingPageUrl(tenant.slug)}`);
    }
    return 'agente_apagado';
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
  const historial: Turno[] = [
    ...(Array.isArray(c.historial) ? c.historial : []),
    { role: 'user', content: m.texto ?? `[${m.type || 'mensaje'} sin texto]`, at: ahora },
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
  if (m.texto === null) {
    respuesta = 'Por ahora solo puedo leer mensajes de texto. ¿Me lo escribes?';
  } else {
    try {
      ({ respuesta, fallo } = await correrAgente({
        tenant,
        historial,
        client: deps.client,
        ctx: { db, tenantId: tenant.id, slug: tenant.slug, timezone: tenant.timezone, telefono: m.from, conversacionId: c.id },
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
