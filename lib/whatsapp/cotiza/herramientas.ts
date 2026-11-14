import type Anthropic from '@anthropic-ai/sdk';
import { validarDatosFiscales } from '@/lib/billing/validarFiscal';
import { esServicio } from '@/lib/meetings/kinds';
import { crearCotizacion } from '@/lib/quotes/crear';
import { computeTotals, formatFolio, formatMoney } from '@/lib/quotes/totals';
import { quotePdfUrl } from '@/lib/urls';
import { enviarDocumento } from '@/lib/whatsapp/media';
import type { Contexto } from '@/lib/whatsapp/agente/herramientas';
import { COLUMNAS_QUOTE_FACTURA, timbrarYEnviar, type DepsFactura, type QuoteFactura } from './facturar';

// Herramientas del add-on "Cotiza, cobra y factura por WhatsApp".
//
// Mismas reglas que las de citas: negocio y teléfono llegan por el
// contexto, nunca del modelo. Cada consulta de cotizaciones filtra por
// tenant_id Y por whatsapp_telefono = el remitente, así que un teléfono
// solo ve, acepta y factura SUS cotizaciones.
//
// El modelo nunca pone un precio: elige conceptos del catálogo por id y
// cantidades; el precio sale de la base al crear la cotización.

export type ContextoCotiza = Contexto & {
  phoneNumberId: string;
  facturacion: boolean;
  confirmarFacturas: boolean;
  /** Cuándo empezó este turno: confirmar no puede pasar en el mismo turno en que se guardaron los datos. */
  turnoInicio: string;
  deps?: DepsFactura & { enviarDoc?: typeof enviarDocumento };
};

const MAX_PARTIDAS = 30;
const MAX_CANTIDAD = 100_000;

export const TOOLS_COTIZA: Anthropic.Tool[] = [
  {
    name: 'ver_catalogo',
    description: 'El catálogo del negocio con precios (sin IVA). Úsalo antes de hablar de precios o cotizar.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'crear_cotizacion',
    description:
      'Crea la cotización con conceptos del catálogo y le manda el PDF al cliente. Solo después de confirmar con el cliente conceptos, cantidades y su nombre.',
    input_schema: {
      type: 'object',
      properties: {
        partidas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'El id exacto que devolvió ver_catalogo.' },
              cantidad: { type: 'number' },
            },
            required: ['id', 'cantidad'],
            additionalProperties: false,
          },
        },
        nombre: { type: 'string', description: 'Nombre del cliente o de su empresa.' },
        notas: { type: 'string', description: 'Opcional: detalles que dio el cliente (medidas, dirección de obra…).' },
      },
      required: ['partidas', 'nombre'],
      additionalProperties: false,
    },
  },
  {
    name: 'ver_mis_cotizaciones',
    description: 'Las cotizaciones de quien está escribiendo, con folio, total y estado.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'aceptar_cotizacion',
    description: 'Marca como aceptada una cotización de quien escribe. Solo cuando el cliente lo dice claramente.',
    input_schema: {
      type: 'object',
      properties: { folio: { type: 'number' } },
      required: ['folio'],
      additionalProperties: false,
    },
  },
];

export const TOOLS_FACTURA: Anthropic.Tool[] = [
  {
    name: 'solicitar_factura',
    description: 'El cliente quiere factura de una cotización aceptada. Después pídele su Constancia de Situación Fiscal (PDF o foto) o sus datos.',
    input_schema: {
      type: 'object',
      properties: { folio: { type: 'number' } },
      required: ['folio'],
      additionalProperties: false,
    },
  },
  {
    name: 'guardar_datos_fiscales',
    description: 'Guarda los datos fiscales que el cliente ESCRIBIÓ. Después muéstraselos y pregúntale si están bien.',
    input_schema: {
      type: 'object',
      properties: {
        folio: { type: 'number' },
        rfc: { type: 'string' },
        razon_social: { type: 'string', description: 'Tal como aparece en su constancia, sin "SA de CV".' },
        regimen: { type: 'string', description: 'Clave de 3 dígitos (ej. 612, 626, 601).' },
        codigo_postal: { type: 'string' },
        uso_cfdi: { type: 'string', description: 'Clave (ej. G03 gastos en general, G01 adquisición de mercancías).' },
      },
      required: ['folio', 'rfc', 'razon_social', 'regimen', 'codigo_postal', 'uso_cfdi'],
      additionalProperties: false,
    },
  },
  {
    name: 'confirmar_datos_factura',
    description: 'El cliente revisó sus datos fiscales y dijo que están bien. Nunca en el mismo mensaje en que los guardaste o leíste.',
    input_schema: {
      type: 'object',
      properties: { folio: { type: 'number' } },
      required: ['folio'],
      additionalProperties: false,
    },
  },
];

type Concepto = { id: string; concepto: string; precio_cents: number; unidad: string | null };

/** Catálogo con precio: servicios activos con precio publicado + productos de inventario con precio. */
export async function catalogo(ctx: Contexto): Promise<Concepto[]> {
  const [{ data: servicios, error }, { data: productos }] = await Promise.all([
    ctx.db.from('service_types').select('*').eq('tenant_id', ctx.tenantId).eq('active', true),
    // Sin db/049 esta consulta falla y simplemente no hay productos.
    ctx.db.from('inventario_productos').select('id, nombre, unidad, precio_cents').eq('tenant_id', ctx.tenantId),
  ]);
  if (error) throw new Error('No pude leer el catálogo.');
  type S = { id: string; name: string; price_cents: number | null; show_price?: boolean | null; kind?: string | null };
  type P = { id: string; nombre: string; unidad: string | null; precio_cents: number | null };
  return [
    ...((servicios ?? []) as S[])
      .filter((s) => esServicio(s) && s.show_price !== false && s.price_cents != null)
      .map((s) => ({ id: `s:${s.id}`, concepto: s.name, precio_cents: s.price_cents as number, unidad: null })),
    ...((productos ?? []) as P[])
      .filter((p) => p.precio_cents != null)
      .map((p) => ({ id: `p:${p.id}`, concepto: p.nombre, precio_cents: p.precio_cents as number, unidad: p.unidad })),
  ];
}

type QuoteTel = QuoteFactura & { status: string; factura_estado: string | null; factura_datos_at: string | null };

/** Una cotización de ESTE teléfono en ESTE negocio, o error. */
async function miCotizacion(ctx: Contexto, folio: unknown): Promise<QuoteTel> {
  const f = Number(folio);
  if (!Number.isInteger(f) || f <= 0) throw new Error('Necesito el folio (número) de la cotización.');
  const { data } = await ctx.db
    .from('quotes')
    .select(`status, ${COLUMNAS_QUOTE_FACTURA}`)
    .eq('tenant_id', ctx.tenantId)
    .eq('whatsapp_telefono', ctx.telefono)
    .eq('folio', f)
    .maybeSingle();
  if (!data) throw new Error('No encontré una cotización con ese folio a nombre de este teléfono.');
  return data as QuoteTel;
}

function datosVisibles(q: Pick<QuoteFactura, 'receptor_rfc' | 'receptor_razon_social' | 'receptor_regimen' | 'receptor_codigo_postal' | 'receptor_uso_cfdi'>) {
  return {
    rfc: q.receptor_rfc,
    razon_social: q.receptor_razon_social,
    regimen: q.receptor_regimen,
    codigo_postal: q.receptor_codigo_postal,
    uso_cfdi: q.receptor_uso_cfdi,
  };
}

/** 52 + 10 dígitos → los 10 locales (como lo teclea la gente en el PDF). */
function telefonoLocal(t: string): string {
  return t.length === 12 && t.startsWith('52') ? t.slice(2) : t.length === 13 && t.startsWith('521') ? t.slice(3) : t;
}

export async function ejecutarHerramientaCotiza(ctx: ContextoCotiza, nombre: string, input: Record<string, unknown>): Promise<unknown> {
  const marcar = (id: string, cambios: Record<string, unknown>) =>
    ctx.db.from('quotes').update(cambios).eq('id', id).eq('tenant_id', ctx.tenantId).eq('whatsapp_telefono', ctx.telefono);

  switch (nombre) {
    case 'ver_catalogo': {
      const lista = await catalogo(ctx);
      return lista.length
        ? lista.map((c) => ({ id: c.id, concepto: c.concepto, precio_sin_iva: formatMoney(c.precio_cents), unidad: c.unidad }))
        : { aviso: 'El negocio no tiene conceptos con precio en su catálogo. Pasa la plática a una persona.' };
    }

    case 'crear_cotizacion': {
      const nombreCliente = String(input.nombre ?? '').trim().slice(0, 120);
      if (!nombreCliente) throw new Error('Falta el nombre del cliente.');
      const pedidas = Array.isArray(input.partidas) ? (input.partidas as { id?: unknown; cantidad?: unknown }[]) : [];
      if (!pedidas.length || pedidas.length > MAX_PARTIDAS) throw new Error(`Una cotización lleva de 1 a ${MAX_PARTIDAS} conceptos.`);
      const lista = await catalogo(ctx);
      const partidas = pedidas.map((p) => {
        const c = lista.find((x) => x.id === String(p.id ?? ''));
        if (!c) throw new Error(`"${String(p.id)}" no está en el catálogo. No inventes conceptos ni precios: pregunta o pasa a humano.`);
        const cantidad = Number(p.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > MAX_CANTIDAD) throw new Error(`La cantidad de "${c.concepto}" no es válida.`);
        return { description: c.concepto, quantity: Math.round(cantidad * 100) / 100, unitPriceCents: c.precio_cents, unit: c.unidad };
      });

      const r = await crearCotizacion(ctx.db, ctx.tenantId, {
        nombre: nombreCliente,
        telefono: telefonoLocal(ctx.telefono),
        notas: input.notas ? `${String(input.notas).slice(0, 1500)}\n(Pedida por WhatsApp)` : 'Pedida por WhatsApp',
        status: 'sent',
        partidas,
        extra: { origen: 'whatsapp', whatsapp_telefono: ctx.telefono, sent_at: new Date().toISOString() },
      });
      if (!r.ok) throw new Error(r.error);

      const { data: q } = await ctx.db.from('quotes').select('tax_rate').eq('id', r.quoteId).eq('tenant_id', ctx.tenantId).maybeSingle();
      const total = computeTotals(partidas, { taxRate: Number(q?.tax_rate ?? 16) }).totalCents;
      const envio = await (ctx.deps?.enviarDoc ?? enviarDocumento)(ctx.phoneNumberId, ctx.telefono, {
        link: quotePdfUrl(r.quoteId),
        filename: `cotizacion-${formatFolio(r.folio)}.pdf`,
        caption: `Cotización ${formatFolio(r.folio)} · ${formatMoney(total)} con IVA`,
      });
      return { folio: r.folio, total_con_iva: formatMoney(total), pdf_enviado: envio.ok };
    }

    case 'ver_mis_cotizaciones': {
      const { data } = await ctx.db
        .from('quotes')
        .select('id, folio, status, factura_estado, tax_rate, discount_cents, created_at')
        .eq('tenant_id', ctx.tenantId)
        .eq('whatsapp_telefono', ctx.telefono)
        .order('created_at', { ascending: false })
        .limit(5);
      type Q = { id: string; folio: number; status: string; factura_estado: string | null; tax_rate: number; discount_cents: number };
      const qs = (data ?? []) as Q[];
      const { data: items } = qs.length
        ? await ctx.db.from('quote_items').select('quote_id, quantity, unit_price_cents').in('quote_id', qs.map((q) => q.id))
        : { data: [] };
      type I = { quote_id: string; quantity: number; unit_price_cents: number };
      return qs.map((q) => ({
        folio: q.folio,
        estado: q.status === 'accepted' ? 'aceptada' : q.status === 'sent' || q.status === 'viewed' ? 'enviada' : q.status,
        factura: q.factura_estado,
        total_con_iva: formatMoney(
          computeTotals(
            ((items ?? []) as I[]).filter((i) => i.quote_id === q.id).map((i) => ({ description: '', quantity: Number(i.quantity), unitPriceCents: i.unit_price_cents })),
            { discountCents: q.discount_cents, taxRate: Number(q.tax_rate) }
          ).totalCents
        ),
      }));
    }

    case 'aceptar_cotizacion': {
      const q = await miCotizacion(ctx, input.folio);
      if (q.status === 'accepted') return { aceptada: true, ya_estaba: true };
      if (q.status !== 'sent' && q.status !== 'viewed') throw new Error('Esa cotización ya no se puede aceptar (vencida o rechazada). Pasa a humano si insiste.');
      const { error } = await marcar(q.id, { status: 'accepted', accepted_at: new Date().toISOString() }).in('status', ['sent', 'viewed']);
      if (error) throw new Error('No pude marcarla como aceptada.');
      return { aceptada: true, folio: q.folio };
    }

    case 'solicitar_factura': {
      if (!ctx.facturacion) throw new Error('Este negocio no factura por aquí. Pasa a humano.');
      const q = await miCotizacion(ctx, input.folio);
      if (q.status !== 'accepted') throw new Error('Solo se factura una cotización aceptada. Pregunta primero si la acepta.');
      if (q.factura_estado === 'timbrada') return { ya_facturada: true };
      if (q.factura_estado === 'por_aprobar') return { en_revision: true, mensaje: 'El negocio ya la está revisando.' };
      const { error } = await marcar(q.id, { factura_estado: 'esperando_datos' });
      if (error) throw new Error('No pude registrar la solicitud.');
      return { siguiente: 'Pide su Constancia de Situación Fiscal en PDF o foto, o que escriba RFC, razón social, régimen, código postal y uso de CFDI.' };
    }

    case 'guardar_datos_fiscales': {
      if (!ctx.facturacion) throw new Error('Este negocio no factura por aquí.');
      const q = await miCotizacion(ctx, input.folio);
      if (q.status !== 'accepted') throw new Error('Solo se factura una cotización aceptada.');
      if (q.factura_estado === 'timbrada' || q.factura_estado === 'por_aprobar') throw new Error('Esa factura ya está en proceso; los datos ya no se cambian por aquí.');
      const { datos, errores } = validarDatosFiscales(input as Record<string, string>);
      if (errores.length) throw new Error(`Revisa con el cliente: ${errores.join(' ')}`);
      const { error } = await marcar(q.id, {
        receptor_rfc: datos.rfc,
        receptor_razon_social: datos.razon_social,
        receptor_regimen: datos.regimen,
        receptor_codigo_postal: datos.codigo_postal,
        receptor_uso_cfdi: datos.uso_cfdi,
        factura_estado: 'por_confirmar',
        factura_datos_at: new Date().toISOString(),
      });
      if (error) throw new Error('No pude guardar los datos.');
      return { guardados: datos, siguiente: 'Muéstrale estos datos al cliente y pregúntale si están bien. No confirmes hasta que responda.' };
    }

    case 'confirmar_datos_factura': {
      if (!ctx.facturacion) throw new Error('Este negocio no factura por aquí.');
      const q = await miCotizacion(ctx, input.folio);
      if (q.factura_estado !== 'por_confirmar' || !q.factura_datos_at) throw new Error('No hay datos fiscales pendientes de confirmar para ese folio.');
      // El cliente tiene que haber VISTO los datos: si se guardaron en este mismo turno, todavía no se los enseñaste.
      if (new Date(q.factura_datos_at).getTime() >= new Date(ctx.turnoInicio).getTime()) {
        throw new Error('Primero muéstrale los datos al cliente y espera a que conteste que están bien.');
      }
      if (ctx.confirmarFacturas) {
        const { error } = await marcar(q.id, { factura_estado: 'por_aprobar' }).eq('factura_estado', 'por_confirmar');
        if (error) throw new Error('No pude registrar la confirmación.');
        return { en_revision: true, mensaje: 'El negocio revisa la factura y se la manda por aquí.' };
      }
      // Reclamo: solo un turno pasa de por_confirmar a timbrar (dos "sí" seguidos no timbran dos veces; además está el índice único de invoices).
      const { data: reclamada } = await marcar(q.id, { factura_estado: 'por_aprobar' }).eq('factura_estado', 'por_confirmar').select('id');
      if (!reclamada?.length) return { en_proceso: true };
      const r = await timbrarYEnviar(ctx.db, { tenantId: ctx.tenantId, timezone: ctx.timezone, quote: q, phoneNumberId: ctx.phoneNumberId }, ctx.deps);
      if (!r.ok) throw new Error(`No se pudo timbrar: ${r.error}. Pasa a humano.`);
      return { timbrada: true, uuid: r.uuid, archivos_enviados: r.enviado, datos: datosVisibles(q) };
    }

    default:
      return undefined;
  }
}

export const NOMBRES_COTIZA = new Set([...TOOLS_COTIZA, ...TOOLS_FACTURA].map((t) => t.name));
