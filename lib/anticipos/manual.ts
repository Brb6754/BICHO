import type { SupabaseClient } from '@supabase/supabase-js';
import { confirmarAnticipo, type ResultadoConfirmar } from './confirmar';

// Lo que la dueña hace a mano con un apartado desde el panel, cuando la
// clienta le paga por transferencia o en el local (fase 1, sin cobro en
// línea). Quien llama ya probó membresía; aquí todo filtra por tenant_id,
// así que un id de otro negocio no toca nada.

/** Cuánto suma «Dar más tiempo» (el botón lo dice). */
export const MINUTOS_EXTRA = 60;

/** "Ya pagó": el mismo confirmarAnticipo del webhook, con una referencia manual. Idempotente. */
export async function confirmarAnticipoManual(
  db: SupabaseClient,
  { tenantId, bookingId, userId }: { tenantId: string; bookingId: string; userId: string },
  ahora: Date = new Date()
): Promise<ResultadoConfirmar & { montoMxn?: number }> {
  const { data } = await db.from('bookings').select('id, deposit_mxn').eq('id', bookingId).eq('tenant_id', tenantId).maybeSingle();
  if (!data) return { ok: false, motivo: 'no_encontrada' };
  // Lo que se debía: la dueña ya vio el dinero, no hay monto que validar.
  const montoMxn = (data as { deposit_mxn?: number | null }).deposit_mxn ?? 0;
  const r = await confirmarAnticipo(db, { tenantId, bookingId, paymentId: `manual:${userId}:${ahora.toISOString()}`, montoMxn }, ahora);
  return r.ok ? { ...r, montoMxn } : r;
}

export type ResultadoApartadoManual = { ok: true; venceEn?: Date } | { ok: false; motivo: 'no_pendiente' | 'error' };

/** "Dar más tiempo": +minutos al reloj del apartado, contando desde ahora si ya venció. Solo si sigue pendiente. */
export async function extenderApartado(
  db: SupabaseClient,
  { tenantId, bookingId, minutos }: { tenantId: string; bookingId: string; minutos: number },
  ahora: Date = new Date()
): Promise<ResultadoApartadoManual> {
  const { data } = await db
    .from('bookings')
    .select('hold_expires_at')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .eq('status', 'confirmed')
    .eq('deposit_status', 'pending')
    .maybeSingle();
  if (!data) return { ok: false, motivo: 'no_pendiente' };
  const actual = (data as { hold_expires_at?: string | null }).hold_expires_at ?? null;
  const desde = Math.max(ahora.getTime(), actual ? new Date(actual).getTime() : 0);
  const venceEn = new Date(desde + minutos * 60_000);
  const { data: hechas, error } = await db
    .from('bookings')
    .update({ hold_expires_at: venceEn.toISOString() })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    // Si el barrido o un pago la movió entre la lectura y aquí, no se toca.
    .eq('deposit_status', 'pending')
    .select('id');
  if (error) return { ok: false, motivo: 'error' };
  return hechas?.length ? { ok: true, venceEn } : { ok: false, motivo: 'no_pendiente' };
}

/** "Liberar ahora": igual que el barrido, pero ya. El horario vuelve a quedar libre. */
export async function liberarApartado(
  db: SupabaseClient,
  { tenantId, bookingId }: { tenantId: string; bookingId: string }
): Promise<ResultadoApartadoManual> {
  const { data, error } = await db
    .from('bookings')
    .update({ status: 'cancelled', deposit_status: 'released' })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .eq('deposit_status', 'pending')
    .select('id');
  if (error) return { ok: false, motivo: 'error' };
  return data?.length ? { ok: true } : { ok: false, motivo: 'no_pendiente' };
}
