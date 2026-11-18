import type { SupabaseClient } from '@supabase/supabase-js';

export type ResultadoConfirmar =
  | { ok: true; yaEstaba: boolean }
  | { ok: false; motivo: 'no_encontrada' | 'liberada' | 'sin_anticipo' | 'monto_insuficiente' | 'error' };

/**
 * Marca pagado el anticipo de una cita. Idempotente (el webhook de pago se
 * reintenta): ya pagada → `{ ok: true, yaEstaba: true }`.
 *
 * Un pago que llega con el apartado vencido pero AÚN no barrido se acepta:
 * el horario sigue siendo suyo. Si ya se liberó → `motivo: 'liberada'`: el
 * dinero ya está en la cuenta del negocio y el horario pudo tomarlo otro;
 * el negocio debe devolverlo o reagendar a mano (avísale, no lo resuelvas aquí).
 */
export async function confirmarAnticipo(
  supabase: SupabaseClient,
  { tenantId, bookingId, paymentId, montoMxn }: { tenantId: string; bookingId: string; paymentId: string; montoMxn: number },
  ahora: Date = new Date()
): Promise<ResultadoConfirmar> {
  const leer = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id, deposit_status, deposit_mxn')
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return data as { deposit_status?: string | null; deposit_mxn?: number | null } | null;
  };
  const estado = (c: { deposit_status?: string | null } | null): ResultadoConfirmar | null => {
    if (!c) return { ok: false, motivo: 'no_encontrada' };
    if (c.deposit_status === 'paid') return { ok: true, yaEstaba: true };
    if (c.deposit_status === 'released') return { ok: false, motivo: 'liberada' };
    if (c.deposit_status !== 'pending') return { ok: false, motivo: 'sin_anticipo' };
    return null;
  };

  const cita = await leer();
  const antes = estado(cita);
  if (antes) return antes;
  if (montoMxn < (cita!.deposit_mxn ?? 0)) return { ok: false, motivo: 'monto_insuficiente' };

  const { data, error } = await supabase
    .from('bookings')
    .update({ deposit_status: 'paid', deposit_paid_at: ahora.toISOString(), deposit_payment_id: paymentId })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .eq('deposit_status', 'pending')
    .select('id');
  if (error) return { ok: false, motivo: 'error' };
  if (data?.length) return { ok: true, yaEstaba: false };
  // Otro proceso ganó la carrera (otro webhook o el barrido): se reporta lo que quedó.
  return estado(await leer()) ?? { ok: false, motivo: 'error' };
}
