import type { SupabaseClient } from '@supabase/supabase-js';
import { crearReserva } from '@/lib/bookings/crear';
import { toE164Mx } from '@/lib/whatsapp/phone';
import { boostActivo, formatoPesos, FRANJAS, precioAplicable, type TenantBoost } from './reglas';

// Las dos puertas públicas de Boost (sin login): apuntarse a la lista VIP
// y apartar un hueco ofrecido. Las dos con service_role, así que cada una
// resuelve el negocio por su cuenta y filtra por tenant_id.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EntradaVip = {
  nombre?: unknown;
  telefono?: unknown;
  service_type_id?: unknown;
  dias?: unknown;
  franjas?: unknown;
  consentimiento_avisos?: unknown;
  consentimiento_promos?: unknown;
};

export type Resultado = { ok: true } | { ok: false; error: string };

export async function apuntarseVip(db: SupabaseClient, slug: string, e: EntradaVip, ahora: Date = new Date()): Promise<Resultado> {
  // Consentimiento explícito: Meta y la LFPDPPP. Sin la casilla no se guarda nada.
  if (e.consentimiento_avisos !== true) return { ok: false, error: 'Marca la casilla para que te podamos avisar por WhatsApp.' };

  const nombre = typeof e.nombre === 'string' ? e.nombre.trim() : '';
  if (!nombre || nombre.length > 200) return { ok: false, error: 'Escribe tu nombre.' };
  const telefono = toE164Mx(typeof e.telefono === 'string' ? e.telefono : '');
  if (!telefono || telefono.length > 15) return { ok: false, error: 'Revisa tu teléfono: 10 dígitos.' };

  const dias = Array.isArray(e.dias) ? [...new Set(e.dias.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : [];
  const validas = FRANJAS.map((f) => f.id as string);
  const franjas = Array.isArray(e.franjas) ? [...new Set(e.franjas.filter((f): f is string => typeof f === 'string' && validas.includes(f)))] : [];

  const { data: t } = await db.from('tenants').select('*').eq('slug', slug).maybeSingle();
  const tenant = t as TenantBoost | null;
  if (!tenant || !boostActivo(tenant, 'vip')) return { ok: false, error: 'Este negocio no tiene la lista de avisos abierta.' };

  let serviceId: string | null = null;
  if (typeof e.service_type_id === 'string' && e.service_type_id) {
    const { data: s } = await db.from('service_types').select('id').eq('id', e.service_type_id).eq('tenant_id', tenant.id).maybeSingle();
    if (!s) return { ok: false, error: 'Ese servicio no existe.' };
    serviceId = s.id as string;
  }

  const fila = {
    tenant_id: tenant.id,
    nombre,
    telefono,
    service_type_id: serviceId,
    dias,
    franjas,
    consentimiento_avisos: true,
    consentimiento_promos: e.consentimiento_promos === true,
    consentimiento_at: ahora.toISOString(),
    // Volver a apuntarse con la casilla marcada es un permiso nuevo: anula una baja vieja.
    baja_at: null,
  };
  const { data: existe } = await db.from('boost_contactos').select('id').eq('tenant_id', tenant.id).eq('telefono', telefono).maybeSingle();
  const { error } = existe
    ? await db.from('boost_contactos').update(fila).eq('id', existe.id).eq('tenant_id', tenant.id)
    : await db.from('boost_contactos').insert(fila);
  if (error) {
    console.error('boost: alta VIP falló', { code: error.code });
    return { ok: false, error: 'No se pudo guardar. Intenta de nuevo.' };
  }
  return { ok: true };
}

export type ResultadoApartar =
  | { ok: true; bookingId: string; precioCents: number; conDescuento: boolean }
  | { ok: false; status: number; error: string };

type Oferta = {
  id: string;
  tenant_id: string;
  contacto_id: string;
  resource_id: string;
  service_type_id: string;
  starts_at: string;
  ends_at: string;
  precio_normal_cents: number;
  precio_oferta_cents: number;
  expira_at: string;
  booking_id: string | null;
};

export const YA_LO_GANARON = 'Alguien más apartó este horario hace un momento. Te seguimos avisando cuando se libere otro.';

/**
 * Apartar el hueco de una oferta en un clic. La cita se crea con la misma
 * función que la página pública (lib/bookings/crear.ts); si otra clienta
 * llegó primero, el exclusion constraint de `bookings` lo rechaza (409) y
 * se le dice con amabilidad. El precio lo decide el servidor con la fila
 * de la oferta: dentro de la ventana, el de la oferta; fuera, el normal.
 */
export async function apartarOferta(
  db: SupabaseClient,
  slug: string,
  ofertaId: string,
  ahora: Date = new Date(),
  crear: typeof crearReserva = crearReserva
): Promise<ResultadoApartar> {
  if (!UUID.test(ofertaId)) return { ok: false, status: 404, error: 'Este link no es válido.' };
  const { data: tenant } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
  if (!tenant) return { ok: false, status: 404, error: 'Este link no es válido.' };

  const { data: o } = await db.from('boost_ofertas').select('*').eq('id', ofertaId).eq('tenant_id', tenant.id).maybeSingle();
  const oferta = o as Oferta | null;
  if (!oferta) return { ok: false, status: 404, error: 'Este link no es válido.' };
  if (oferta.booking_id) return { ok: false, status: 409, error: 'Ya apartaste este horario. Te esperamos.' };
  if (new Date(oferta.starts_at).getTime() <= ahora.getTime()) return { ok: false, status: 410, error: 'Este horario ya pasó.' };

  const [{ data: c }, { data: s }] = await Promise.all([
    db.from('boost_contactos').select('nombre, telefono').eq('id', oferta.contacto_id).eq('tenant_id', tenant.id).maybeSingle(),
    db.from('service_types').select('price_cents').eq('id', oferta.service_type_id).eq('tenant_id', tenant.id).maybeSingle(),
  ]);
  if (!c || !s) return { ok: false, status: 404, error: 'Este link no es válido.' };

  const precio = precioAplicable(oferta, Number(s.price_cents ?? 0), ahora);
  const r = await crear(db, tenant.id, {
    resource_id: oferta.resource_id,
    service_type_id: oferta.service_type_id,
    starts_at: oferta.starts_at,
    ends_at: oferta.ends_at,
    customer_name: c.nombre,
    customer_phone: c.telefono,
    notes: precio.conDescuento ? `Boost: precio ${formatoPesos(precio.cents)} con descuento.` : 'Apartada desde un aviso de Boost.',
  });
  if (!r.ok) return r.status === 409 ? { ok: false, status: 409, error: YA_LO_GANARON } : r;

  await db
    .from('boost_ofertas')
    .update({ booking_id: r.bookingId, tomada_at: ahora.toISOString(), precio_cobrado_cents: precio.cents })
    .eq('id', oferta.id)
    .eq('tenant_id', tenant.id);
  const { error } = await db
    .from('bookings')
    .update({ boost_oferta_id: oferta.id, boost_precio_cents: precio.cents })
    .eq('id', r.bookingId)
    .eq('tenant_id', tenant.id);
  if (error) console.error('boost: no se guardó el precio en la cita', { code: error.code });

  return { ok: true, bookingId: r.bookingId, precioCents: precio.cents, conDescuento: precio.conDescuento };
}

/**
 * "BAJA" por WhatsApp. Si llegó al número propio de un negocio, solo de
 * ese negocio; si llegó al número de la plataforma (de donde salen los
 * avisos de los negocios sin número propio), de todos los que la tengan:
 * pidió que ESE número deje de escribirle. Devuelve cuántas filas marcó;
 * null si la tabla no existe (db/058 sin correr).
 */
export async function darDeBaja(db: SupabaseClient, telefonoCrudo: string, tenantId: string | null, ahora: Date = new Date()): Promise<number | null> {
  const telefono = toE164Mx(telefonoCrudo);
  if (!telefono) return 0;
  let q = db.from('boost_contactos').update({ baja_at: ahora.toISOString() }).eq('telefono', telefono);
  if (tenantId) q = q.eq('tenant_id', tenantId);
  const { data, error } = await q.select('id');
  if (error) return null;
  return data?.length ?? 0;
}
