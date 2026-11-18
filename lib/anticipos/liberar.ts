import type { SupabaseClient } from '@supabase/supabase-js';
import { faltaMigracion } from './config';

export type ApartadoLiberado = {
  id: string;
  tenantId: string;
  telefono: string | null;
  nombre: string | null;
  servicio: string | null;
  startsAt: string;
};

type Fila = {
  id: string;
  tenant_id: string;
  starts_at: string;
  customers?: { name?: string | null; phone?: string | null } | null;
  service_types?: { name?: string | null } | null;
};

/**
 * Libera los apartados cuyo reloj ya venció: status cancelled +
 * deposit_status released, en UN update que filtra `deposit_status =
 * 'pending'`. Dos barridos simultáneos no duplican: Postgres re-evalúa el
 * filtro tras el lock y el segundo no ve la fila.
 *
 * Barata (índice parcial de db/061): se llama en el cron diario, en cada
 * mensaje de WhatsApp y antes de calcular disponibilidad. NO avisa a
 * nadie: devuelve lo liberado para que quien llama escriba por el chat.
 * Pasa `tenantId` para barrer solo un negocio.
 */
export async function liberarApartadosVencidos(
  supabase: SupabaseClient,
  now: Date = new Date(),
  tenantId?: string
): Promise<ApartadoLiberado[]> {
  let q = supabase
    .from('bookings')
    .update({ status: 'cancelled', deposit_status: 'released' })
    .eq('deposit_status', 'pending')
    .lt('hold_expires_at', now.toISOString());
  if (tenantId) q = q.eq('tenant_id', tenantId);
  const { data, error } = await q.select('id, tenant_id, starts_at, customers(name, phone), service_types(name)');
  if (error) {
    if (!faltaMigracion(error)) console.error('liberarApartadosVencidos', error);
    return [];
  }
  return ((data ?? []) as unknown as Fila[]).map((f) => ({
    id: f.id,
    tenantId: f.tenant_id,
    telefono: f.customers?.phone ?? null,
    nombre: f.customers?.name ?? null,
    servicio: f.service_types?.name ?? null,
    startsAt: f.starts_at,
  }));
}
