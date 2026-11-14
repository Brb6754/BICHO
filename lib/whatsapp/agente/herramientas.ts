import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearReserva } from '@/lib/bookings/crear';
import { esServicio } from '@/lib/meetings/kinds';
import { addDaysKey, appointmentWhen, dayKey, formatTime } from '@/lib/dates/tenantTime';
import { tenantManageBookingUrl } from '@/lib/urls';
import { toE164Mx } from '@/lib/whatsapp/phone';
import { avisarCitaLiberada } from '@/lib/boost/motor';

// Las herramientas de la recepcionista. Cada una recibe el contexto
// (negocio + teléfono del remitente) por cierre, NUNCA del modelo: el
// modelo solo elige servicio, fecha, hora y nombre. Así una inyección de
// prompt ("cancela la cita de 618…") no tiene con qué apuntar a otro
// teléfono ni a otro negocio — toda consulta filtra por tenant_id y las
// de citas, además, por el teléfono del remitente.

export type Contexto = {
  db: SupabaseClient;
  tenantId: string;
  slug: string;
  timezone: string | null;
  /** Dígitos tal como los manda Meta en `from` (p. ej. 5216181234567). */
  telefono: string;
  conversacionId: string;
};

export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'ver_servicios',
    description: 'Lista los servicios que se pueden agendar, con duración y precio publicado. Úsala antes de hablar de precios o servicios.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'ver_disponibilidad',
    description: 'Horarios libres de un servicio en un día. Úsala antes de proponer cualquier hora.',
    input_schema: {
      type: 'object',
      properties: {
        servicio: { type: 'string', description: 'Id o nombre exacto del servicio (de ver_servicios).' },
        fecha: { type: 'string', description: 'Día en formato AAAA-MM-DD, hora local del negocio.' },
      },
      required: ['servicio', 'fecha'],
      additionalProperties: false,
    },
  },
  {
    name: 'crear_cita',
    description: 'Agenda la cita. Solo después de que el cliente confirmó servicio, día, hora y su nombre.',
    input_schema: {
      type: 'object',
      properties: {
        servicio: { type: 'string', description: 'Id o nombre exacto del servicio.' },
        inicio: { type: 'string', description: 'El valor "inicio" exacto que devolvió ver_disponibilidad.' },
        nombre: { type: 'string', description: 'Nombre del cliente.' },
      },
      required: ['servicio', 'inicio', 'nombre'],
      additionalProperties: false,
    },
  },
  {
    name: 'ver_mi_cita',
    description: 'Las próximas citas confirmadas de quien está escribiendo.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'cancelar_cita',
    description: 'Cancela una cita de quien está escribiendo. Confirma con el cliente antes de usarla.',
    input_schema: {
      type: 'object',
      properties: { cita_id: { type: 'string', description: 'El cita_id que devolvió ver_mi_cita.' } },
      required: ['cita_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'pasar_a_humano',
    description: 'Pasa la conversación a una persona del negocio. Úsala si lo piden, si hay una queja, o si no puedes resolver con tus herramientas.',
    input_schema: {
      type: 'object',
      properties: { motivo: { type: 'string', description: 'Una línea para el negocio.' } },
      required: ['motivo'],
      additionalProperties: false,
    },
  },
];

type Servicio = { id: string; name: string; duration_minutes: number; price_cents: number | null; show_price?: boolean | null; kind?: string | null };

function precio(s: Servicio): string {
  if (s.show_price === false) return 'no publicado (que lo confirme el negocio)';
  if (!s.price_cents) return 'sin costo';
  return `$${(s.price_cents / 100).toLocaleString('es-MX')}`;
}

async function servicios(ctx: Contexto): Promise<Servicio[]> {
  const { data, error } = await ctx.db.from('service_types').select('*').eq('tenant_id', ctx.tenantId).eq('active', true);
  if (error) throw new Error('No pude leer los servicios.');
  return ((data ?? []) as Servicio[]).filter(esServicio);
}

async function buscarServicio(ctx: Contexto, ref: unknown): Promise<Servicio> {
  const r = String(ref ?? '').trim().toLowerCase();
  const lista = await servicios(ctx);
  const s =
    lista.find((x) => x.id === r) ??
    lista.find((x) => x.name.toLowerCase() === r) ??
    (lista.filter((x) => x.name.toLowerCase().includes(r)).length === 1 ? lista.find((x) => x.name.toLowerCase().includes(r)) : undefined);
  if (!r || !s) throw new Error(`No encontré ese servicio. Opciones: ${lista.map((x) => x.name).join(', ') || 'ninguna'}.`);
  return s;
}

type Hueco = { resource_id: string; slot_start: string; slot_end: string };

async function huecos(ctx: Contexto, servicioId: string, fecha: string): Promise<Hueco[]> {
  // Recursos que hacen este servicio (db/032); sin filas, todos los activos.
  const { data: rs } = await ctx.db
    .from('resource_services')
    .select('resource_id')
    .eq('tenant_id', ctx.tenantId)
    .eq('service_type_id', servicioId);
  let q = ctx.db.from('resources').select('id').eq('tenant_id', ctx.tenantId).eq('active', true);
  if (rs?.length) q = q.in('id', rs.map((x: { resource_id: string }) => x.resource_id));
  const { data: recursos } = await q;

  const ahora = Date.now();
  const res = await Promise.all(
    ((recursos ?? []) as { id: string }[]).map(async (r) => {
      const { data } = await ctx.db.rpc('get_available_slots', {
        p_resource_id: r.id,
        p_service_type_id: servicioId,
        p_from: fecha,
        p_to: fecha,
      });
      return ((data ?? []) as { slot_start: string; slot_end: string }[]).map((s) => ({ resource_id: r.id, ...s }));
    })
  );
  return res
    .flat()
    .filter((h) => new Date(h.slot_start).getTime() > ahora)
    .sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());
}

/** 12 dígitos MX (52 + 10) → los 10 locales, que es como los teclea la gente en la web. */
function telefonoLocal(t: string): string {
  return t.length === 12 && t.startsWith('52') ? t.slice(2) : t.length === 13 && t.startsWith('521') ? t.slice(3) : t;
}

type CitaPropia = { id: string; starts_at: string; service_types?: { name?: string } | null; customers?: { phone?: string | null } | null };

/** Próximas citas confirmadas de ESTE teléfono en ESTE negocio. */
export async function citasDelTelefono(ctx: Contexto): Promise<CitaPropia[]> {
  const { data, error } = await ctx.db
    .from('bookings')
    .select('id, starts_at, service_types(name), customers!inner(phone)')
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'confirmed')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(200);
  if (error) throw new Error('No pude leer las citas.');
  const mio = toE164Mx(ctx.telefono);
  // La comparación por teléfono va en código: `customers.phone` guarda lo
  // que la persona tecleó ("618 123 4567"), así que se normalizan ambos.
  return ((data ?? []) as CitaPropia[]).filter((c) => mio !== null && toE164Mx(c.customers?.phone ?? '') === mio);
}

export async function ejecutarHerramienta(ctx: Contexto, nombre: string, input: Record<string, unknown>): Promise<unknown> {
  switch (nombre) {
    case 'ver_servicios': {
      const lista = await servicios(ctx);
      return lista.map((s) => ({ id: s.id, servicio: s.name, duracion_min: s.duration_minutes, precio: precio(s) }));
    }

    case 'ver_disponibilidad': {
      const fecha = String(input.fecha ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('La fecha va como AAAA-MM-DD.');
      const hoy = dayKey(new Date(), ctx.timezone);
      if (fecha < hoy || fecha > addDaysKey(hoy, 60)) throw new Error('Solo puedo ver de hoy a 60 días.');
      const s = await buscarServicio(ctx, input.servicio);
      const vistos = new Set<string>();
      const libres = (await huecos(ctx, s.id, fecha)).filter((h) => !vistos.has(h.slot_start) && vistos.add(h.slot_start));
      return {
        servicio: s.name,
        fecha,
        horarios: libres.slice(0, 16).map((h) => ({ inicio: h.slot_start, hora: formatTime(h.slot_start, ctx.timezone) })),
      };
    }

    case 'crear_cita': {
      const s = await buscarServicio(ctx, input.servicio);
      const inicio = new Date(String(input.inicio ?? ''));
      if (Number.isNaN(inicio.getTime())) throw new Error('Usa el "inicio" exacto de ver_disponibilidad.');
      // Se vuelve a pedir la disponibilidad: la hora la propone el
      // modelo, pero solo se agenda si es un hueco real en este momento.
      const hueco = (await huecos(ctx, s.id, dayKey(inicio, ctx.timezone))).find(
        (h) => new Date(h.slot_start).getTime() === inicio.getTime()
      );
      if (!hueco) throw new Error('Ese horario ya no está libre. Consulta ver_disponibilidad otra vez.');
      const r = await crearReserva(ctx.db, ctx.tenantId, {
        resource_id: hueco.resource_id,
        service_type_id: s.id,
        starts_at: hueco.slot_start,
        ends_at: hueco.slot_end,
        customer_name: String(input.nombre ?? '').trim(),
        customer_phone: telefonoLocal(ctx.telefono),
        notes: 'Agendada por WhatsApp (recepcionista IA)',
      });
      if (!r.ok) throw new Error(r.error);
      return {
        cita_id: r.bookingId,
        servicio: r.serviceName,
        cuando: appointmentWhen(hueco.slot_start, ctx.timezone),
        link_para_cambiar_o_cancelar: tenantManageBookingUrl(ctx.slug, r.bookingId),
      };
    }

    case 'ver_mi_cita': {
      const citas = await citasDelTelefono(ctx);
      return citas.map((c) => ({ cita_id: c.id, servicio: c.service_types?.name ?? 'Servicio', cuando: appointmentWhen(c.starts_at, ctx.timezone) }));
    }

    case 'cancelar_cita': {
      const id = String(input.cita_id ?? '');
      if (!(await citasDelTelefono(ctx)).some((c) => c.id === id)) {
        throw new Error('No encontré una cita próxima con ese id a nombre de este teléfono.');
      }
      const { data, error } = await ctx.db
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('tenant_id', ctx.tenantId)
        .eq('status', 'confirmed')
        .gt('starts_at', new Date().toISOString())
        .select('id');
      if (error || !data?.length) throw new Error('No se pudo cancelar la cita.');
      // Boost (db/058): el hueco se liberó; avisa a la lista VIP. Nunca lanza.
      await avisarCitaLiberada(ctx.db, ctx.tenantId, id);
      return { cancelada: true };
    }

    case 'pasar_a_humano': {
      const { error } = await ctx.db
        .from('whatsapp_conversaciones')
        .update({ estado: 'humano' })
        .eq('id', ctx.conversacionId)
        .eq('tenant_id', ctx.tenantId);
      if (error) throw new Error('No pude pasar la conversación.');
      return { pasada_a_humano: true };
    }

    default:
      throw new Error(`Herramienta desconocida: ${nombre}`);
  }
}
