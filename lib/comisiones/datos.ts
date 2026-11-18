import { createAdminClient } from '@/lib/supabase/admin';
import { addDaysKey, dayKey, formatTime, instantFromLocal } from '@/lib/dates/tenantTime';
import { calcularComisiones, type CitaComisionable, type FilaComision, type Persona, type Rango } from '@/lib/comisiones/calculo';

// Lo que la pantalla de Comisiones necesita de la base para un periodo.
//
// Lee con service_role filtrando por tenant_id, igual que lib/caja/datos.ts:
// las citas viven en `bookings`, sin policies para miembros. Quien llama
// ya pasó por `requireTenantStaff`. Las acciones (marcar como pagado)
// vuelven a llamar esto para no confiar en montos que mande el cliente.

export type PagoComision = {
  id: string;
  resourceId: string;
  nombre: string;
  desde: string;
  hasta: string;
  citas: number;
  vendidoCents: number;
  pctBp: number;
  comisionCents: number;
  enCaja: boolean;
  creado: string;
};

/** Una cita que entra en la comisión, para enseñar de dónde sale cada importe. */
export type CitaDetalle = {
  id: string;
  resourceId: string;
  dia: string;
  hora: string | null;
  servicio: string;
  cliente: string | null;
  precioCents: number;
};

export type DatosComisiones =
  | { hoy: string; filas: FilaComision[]; pagos: PagoComision[]; detalle: CitaDetalle[] }
  | { faltaMigracion: true };

export async function cargarComisiones(
  tenantId: string,
  timezone: string | null,
  rango: Rango,
  now = new Date()
): Promise<DatosComisiones> {
  const db = createAdminClient();
  const [tasasRes, recursosRes, citasRes, pagosRes] = await Promise.all([
    db.from('comision_tasas').select('resource_id, pct_bp').eq('tenant_id', tenantId),
    db.from('resources').select('id, name, active').eq('tenant_id', tenantId).order('name'),
    db
      .from('bookings')
      .select('*, service_types(name, price_cents), customers(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('starts_at', instantFromLocal(rango.desde, '00:00', timezone))
      .lt('starts_at', instantFromLocal(addDaysKey(rango.hasta, 1), '00:00', timezone)),
    db
      .from('comision_pagos')
      .select('id, resource_id, desde, hasta, citas, vendido_cents, pct_bp, comision_cents, caja_movimiento_id, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  // Sin db/050 las tablas no existen: la pantalla lo dice en vez de caerse.
  if (tasasRes.error || pagosRes.error) return { faltaMigracion: true };
  if (recursosRes.error) throw new Error(`No se pudo leer quién atiende: ${recursosRes.error.message}`);
  if (citasRes.error) throw new Error(`No se pudieron leer las citas: ${citasRes.error.message}`);

  const tasas = new Map((tasasRes.data ?? []).map((t) => [t.resource_id as string, t.pct_bp as number]));
  const personas: Persona[] = (recursosRes.data ?? []).map((r) => ({
    id: r.id,
    nombre: r.name,
    activo: r.active !== false,
    pctBp: tasas.get(r.id) ?? 0,
  }));
  const nombres = new Map(personas.map((p) => [p.id, p.nombre]));

  type Fila = {
    id: string;
    resource_id: string;
    starts_at: string;
    kind?: string | null;
    service_types: { name: string; price_cents: number } | null;
    customers: { name: string } | null;
  };
  // Una reunión de ventas (db/039) no es un servicio vendido, igual que en Caja.
  const vendidas = ((citasRes.data ?? []) as unknown as Fila[]).filter((b) => b.kind !== 'reunion');
  const citas: CitaComisionable[] = vendidas.map((b) => ({
    resourceId: b.resource_id,
    dia: dayKey(b.starts_at, timezone),
    precioCents: b.service_types?.price_cents ?? 0,
  }));
  const detalle: CitaDetalle[] = vendidas.map((b) => ({
    id: b.id,
    resourceId: b.resource_id,
    dia: dayKey(b.starts_at, timezone),
    hora: formatTime(b.starts_at, timezone),
    servicio: b.service_types?.name ?? 'Cita',
    cliente: b.customers?.name ?? null,
    precioCents: b.service_types?.price_cents ?? 0,
  }));

  const pagos: PagoComision[] = (pagosRes.data ?? []).map((p) => ({
    id: p.id,
    resourceId: p.resource_id,
    nombre: nombres.get(p.resource_id) ?? 'Persona eliminada',
    desde: p.desde,
    hasta: p.hasta,
    citas: p.citas,
    vendidoCents: p.vendido_cents,
    pctBp: p.pct_bp,
    comisionCents: p.comision_cents,
    enCaja: !!p.caja_movimiento_id,
    creado: p.created_at,
  }));

  return { hoy: dayKey(now, timezone), filas: calcularComisiones(personas, citas, rango), pagos, detalle };
}
