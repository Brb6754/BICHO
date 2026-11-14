import type { SupabaseClient } from '@supabase/supabase-js';
import { appointmentWhen, dayKey } from '@/lib/dates/tenantTime';
import { esServicio } from '@/lib/meetings/kinds';
import { inicioDeMes } from '@/lib/posts/contexto';
import { tenantBoostOfferUrl } from '@/lib/urls';
import { toE164Mx } from '@/lib/whatsapp/phone';
import { sendBoostWhatsApp, type BoostEnvio } from '@/lib/whatsapp/send';
import {
  BOOST_FLOJAS_POR_CORRIDA,
  BOOST_HISTORIAL_DIAS,
  BOOST_MIN_ANTICIPACION_MIN,
  BOOST_VENTANA_MIN,
  BOOST_VIP_POR_HUECO,
  boostActivo,
  coincideVip,
  franjaDe,
  localDe,
  precioConDescuento,
  puedeRecibirAviso,
  puedeRecibirPromo,
  restantesMes,
  type BoostTipo,
  type ContactoBoost,
  type TenantBoost,
} from './reglas';

// El motor de Boost: decide a quién avisar, crea la oferta, manda la
// plantilla y lo registra. Todo filtra por tenant_id. Nunca lanza hacia
// quien lo llama (una cancelación o un cron no deben caerse por Boost).
// Teléfonos: jamás en logs; en boost_mensajes solo ids y motivo.

export type Enviar = (tipo: BoostTipo, phoneNumberId: string | null | undefined, telefono: string, variables: string[]) => Promise<BoostEnvio>;
export type DepsBoost = { ahora?: Date; enviar?: Enviar };

export type Hueco = { resource_id: string; service_type_id: string; starts_at: string; ends_at: string };

type Servicio = { id: string; name: string; price_cents: number };

const faltaTabla = (e: { code?: string } | null | undefined) => ['42P01', 'PGRST205', '42703', 'PGRST204'].includes(e?.code ?? '');

export async function mensajesDelMes(db: SupabaseClient, tenantId: string, timezone: string | null, ahora: Date): Promise<number> {
  const { count, error } = await db
    .from('boost_mensajes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .gte('created_at', inicioDeMes(ahora, timezone));
  if (error && !faltaTabla(error)) console.error('boost: conteo falló', { code: error.code });
  return count ?? 0;
}

/**
 * Reclama a la clienta (compare-and-set sobre ultimo_aviso_at /
 * ultima_promo_at) ANTES de mandar: dos corridas encimadas no le mandan
 * dos mensajes. Devuelve false si otra corrida ya la tomó.
 */
async function reclamar(db: SupabaseClient, c: ContactoBoost, col: 'ultimo_aviso_at' | 'ultima_promo_at', ahora: Date): Promise<boolean> {
  let q = db.from('boost_contactos').update({ [col]: ahora.toISOString() }).eq('id', c.id).eq('tenant_id', c.tenant_id);
  q = c[col] ? q.eq(col, c[col]) : q.is(col, null);
  const { data } = await q.select('id');
  return Boolean(data?.length);
}

/** Crea la oferta, manda la plantilla y registra. 'sent' cuenta contra el tope. */
async function ofrecer(
  db: SupabaseClient,
  t: TenantBoost,
  c: ContactoBoost,
  tipo: BoostTipo,
  hueco: Hueco,
  servicio: Servicio,
  precioOferta: number,
  expira: Date,
  deps: Required<DepsBoost>
): Promise<BoostEnvio['status'] | 'ocupada'> {
  const col = tipo === 'vip' ? 'ultimo_aviso_at' : 'ultima_promo_at';
  const previo = c[col];
  if (!(await reclamar(db, c, col, deps.ahora))) return 'ocupada';

  const { data: oferta, error } = await db
    .from('boost_ofertas')
    .insert({
      tenant_id: t.id,
      contacto_id: c.id,
      tipo,
      ...hueco,
      precio_normal_cents: servicio.price_cents,
      precio_oferta_cents: precioOferta,
      expira_at: expira.toISOString(),
    })
    .select('id')
    .single();
  if (error || !oferta) {
    console.error('boost: no se pudo crear la oferta', { code: error?.code });
    await db.from('boost_contactos').update({ [col]: previo }).eq('id', c.id).eq('tenant_id', t.id);
    return 'failed';
  }

  const link = tenantBoostOfferUrl(t.slug, oferta.id as string);
  const nombre = c.nombre.split(' ')[0] || c.nombre;
  const cuando = appointmentWhen(hueco.starts_at, t.timezone);
  const variables =
    tipo === 'vip'
      ? [nombre, t.name, servicio.name, cuando, link]
      : [nombre, t.name, servicio.name, cuando, `${Math.round(100 - (precioOferta * 100) / servicio.price_cents)}%`, String(BOOST_VENTANA_MIN), link];

  const r = await deps.enviar(tipo, t.whatsapp_phone_number_id, c.telefono, variables);
  await db.from('boost_mensajes').insert({
    tenant_id: t.id,
    contacto_id: c.id,
    oferta_id: oferta.id,
    tipo,
    status: r.status,
    motivo: r.reason ?? null,
  });
  // No salió: se le devuelve el turno para que un WhatsApp mal configurado no le queme el aviso.
  if (r.status !== 'sent') await db.from('boost_contactos').update({ [col]: previo }).eq('id', c.id).eq('tenant_id', t.id);
  return r.status;
}

function deps(d: DepsBoost): Required<DepsBoost> {
  return { ahora: d.ahora ?? new Date(), enviar: d.enviar ?? sendBoostWhatsApp };
}

async function servicioDe(db: SupabaseClient, tenantId: string, id: string): Promise<Servicio | null> {
  const { data } = await db.from('service_types').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle();
  return data && esServicio(data) ? (data as Servicio) : null;
}

// ── 1. Lista VIP: se liberó un hueco ────────────────────────────────

export type ResumenVip = { avisadas: number; motivo?: string };

export async function avisarHuecoLiberado(db: SupabaseClient, tenantId: string, hueco: Hueco, d: DepsBoost = {}): Promise<ResumenVip> {
  const ctx = deps(d);
  try {
    const { data: t } = await db.from('tenants').select('*').eq('id', tenantId).maybeSingle();
    const tenant = t as TenantBoost | null;
    if (!boostActivo(tenant, 'vip')) return { avisadas: 0, motivo: 'apagado' };
    if (new Date(hueco.starts_at).getTime() < ctx.ahora.getTime() + BOOST_MIN_ANTICIPACION_MIN * 60_000) return { avisadas: 0, motivo: 'muy-pronto' };

    const servicio = await servicioDe(db, tenantId, hueco.service_type_id);
    if (!servicio) return { avisadas: 0, motivo: 'servicio' };

    const { data: filas, error } = await db.from('boost_contactos').select('*').eq('tenant_id', tenantId).is('baja_at', null).order('created_at');
    if (error) return { avisadas: 0, motivo: faltaTabla(error) ? 'sin-migracion' : 'error' };

    const candidatas = ((filas ?? []) as ContactoBoost[])
      .filter((c) => c.tenant_id === tenantId && coincideVip(c, hueco, tenant!.timezone) && puedeRecibirAviso(c, ctx.ahora))
      .slice(0, BOOST_VIP_POR_HUECO);
    if (!candidatas.length) return { avisadas: 0, motivo: 'sin-candidatas' };

    let restantes = restantesMes(await mensajesDelMes(db, tenantId, tenant!.timezone, ctx.ahora));
    let avisadas = 0;
    for (const c of candidatas) {
      if (restantes <= 0) return { avisadas, motivo: 'tope' };
      // Aviso de servicio: sin descuento, vale hasta que empiece la cita.
      const r = await ofrecer(db, tenant!, c, 'vip', hueco, servicio, servicio.price_cents, new Date(hueco.starts_at), ctx);
      if (r === 'sent') {
        avisadas++;
        restantes--;
      }
    }
    return { avisadas };
  } catch (e) {
    console.error('boost vip falló', { error: e instanceof Error ? e.message : 'unknown' });
    return { avisadas: 0, motivo: 'error' };
  }
}

/** Para las puertas de cancelación: lee la cita (ya cancelada) y avisa. */
export async function avisarCitaLiberada(db: SupabaseClient, tenantId: string, bookingId: string, d: DepsBoost = {}): Promise<ResumenVip> {
  try {
    const { data: b } = await db
      .from('bookings')
      .select('resource_id, service_type_id, starts_at, ends_at, status')
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!b || b.status !== 'cancelled') return { avisadas: 0, motivo: 'no-liberada' };
    return await avisarHuecoLiberado(db, tenantId, b as Hueco, d);
  } catch {
    return { avisadas: 0, motivo: 'error' };
  }
}

// ── 2. Horas flojas: el cron ─────────────────────────────────────────

type Historia = { starts_at: string; service_type_id: string; customers: { phone: string | null } | null };

export async function correrHorasFlojas(db: SupabaseClient, d: DepsBoost = {}): Promise<{ negocios: number; enviadas: number; motivo?: string }> {
  const ctx = deps(d);
  const { data, error } = await db.from('tenants').select('*').eq('boost_flojas_enabled', true);
  if (error) return { negocios: 0, enviadas: 0, motivo: faltaTabla(error) ? 'Falta correr db/058_boost.sql' : 'consulta falló' };

  let enviadas = 0;
  let negocios = 0;
  for (const t of (data ?? []) as TenantBoost[]) {
    if (!boostActivo(t, 'flojas')) continue;
    negocios++;
    try {
      enviadas += await flojasDeUnNegocio(db, t, ctx);
    } catch (e) {
      console.error('boost flojas falló', { tenant: t.id, error: e instanceof Error ? e.message : 'unknown' });
    }
  }
  return { negocios, enviadas };
}

async function flojasDeUnNegocio(db: SupabaseClient, t: TenantBoost, ctx: Required<DepsBoost>): Promise<number> {
  const { ahora } = ctx;
  const dias = t.boost_dias ?? [1, 2, 3, 4, 5];
  const desde = t.boost_hora_desde ?? 11;
  const hasta = t.boost_hora_hasta ?? 17;
  if (!dias.includes(localDe(ahora, t.timezone).dia)) return 0;

  // Clientas que pueden recibir promo (permiso, sin baja, anti-spam).
  const { data: filas } = await db.from('boost_contactos').select('*').eq('tenant_id', t.id).is('baja_at', null);
  const elegibles = ((filas ?? []) as ContactoBoost[]).filter((c) => c.tenant_id === t.id && puedeRecibirPromo(c, ahora));
  if (!elegibles.length) return 0;

  // Historial: en qué franja y qué servicio suele reservar cada teléfono.
  const { data: hist } = await db
    .from('bookings')
    .select('starts_at, service_type_id, status, customers(phone)')
    .eq('tenant_id', t.id)
    .in('status', ['confirmed', 'completed'])
    .gte('starts_at', new Date(ahora.getTime() - BOOST_HISTORIAL_DIAS * 86_400_000).toISOString())
    .lt('starts_at', ahora.toISOString());
  const porTel = new Map<string, Historia[]>();
  for (const h of (hist ?? []) as unknown as Historia[]) {
    const tel = toE164Mx(h.customers?.phone ?? '');
    if (tel) porTel.set(tel, [...(porTel.get(tel) ?? []), h]);
  }

  // Más historial primero: es quien más probablemente diga que sí.
  const candidatas = elegibles
    .map((c) => ({ c, h: porTel.get(toE164Mx(c.telefono) ?? '') ?? [] }))
    .filter((x) => x.h.length > 0)
    .sort((a, b) => b.h.length - a.h.length);
  if (!candidatas.length) return 0;

  const { data: recursos } = await db.from('resources').select('id').eq('tenant_id', t.id).eq('active', true);
  const hoy = dayKey(ahora, t.timezone);
  const inicio = ahora.getTime() + BOOST_MIN_ANTICIPACION_MIN * 60_000;
  const fin = ahora.getTime() + (t.boost_aviso_horas ?? 4) * 3_600_000;
  const cacheHuecos = new Map<string, Hueco[]>();
  const usados = new Set<string>();

  async function huecosDe(serviceId: string): Promise<Hueco[]> {
    if (!cacheHuecos.has(serviceId)) {
      const todos = await Promise.all(
        ((recursos ?? []) as { id: string }[]).map(async (r) => {
          const { data: s } = await db.rpc('get_available_slots', { p_resource_id: r.id, p_service_type_id: serviceId, p_from: hoy, p_to: hoy });
          return ((s ?? []) as { slot_start: string; slot_end: string }[]).map((x) => ({
            resource_id: r.id,
            service_type_id: serviceId,
            starts_at: x.slot_start,
            ends_at: x.slot_end,
          }));
        })
      );
      cacheHuecos.set(
        serviceId,
        todos
          .flat()
          .filter((h) => {
            const ms = new Date(h.starts_at).getTime();
            const { hora } = localDe(h.starts_at, t.timezone);
            return ms >= inicio && ms <= fin && hora >= desde && hora < hasta;
          })
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      );
    }
    return cacheHuecos.get(serviceId)!;
  }

  let restantes = restantesMes(await mensajesDelMes(db, t.id, t.timezone, ahora));
  let enviadas = 0;
  for (const { c, h } of candidatas) {
    if (enviadas >= BOOST_FLOJAS_POR_CORRIDA || restantes <= 0) break;
    // Su servicio de siempre (el más reservado) y sus franjas de siempre.
    const conteo = new Map<string, number>();
    for (const x of h) conteo.set(x.service_type_id, (conteo.get(x.service_type_id) ?? 0) + 1);
    const favorito = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const franjas = new Set(h.map((x) => franjaDe(localDe(x.starts_at, t.timezone).hora)));

    const servicio = await servicioDe(db, t.id, favorito);
    if (!servicio || servicio.price_cents <= 0) continue;
    const hueco = (await huecosDe(favorito)).find(
      (x) => !usados.has(`${x.resource_id}|${x.starts_at}`) && franjas.has(franjaDe(localDe(x.starts_at, t.timezone).hora))
    );
    if (!hueco) continue;

    const precio = precioConDescuento(servicio.price_cents, t.boost_descuento_max ?? 15);
    if (precio >= servicio.price_cents) continue;
    const expira = new Date(Math.min(ahora.getTime() + BOOST_VENTANA_MIN * 60_000, new Date(hueco.starts_at).getTime()));
    usados.add(`${hueco.resource_id}|${hueco.starts_at}`);
    const r = await ofrecer(db, t, c, 'flojas', hueco, servicio, precio, expira, ctx);
    if (r === 'sent') {
      enviadas++;
      restantes--;
    }
  }
  return enviadas;
}
