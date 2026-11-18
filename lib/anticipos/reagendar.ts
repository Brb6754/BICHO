import type { SupabaseClient } from '@supabase/supabase-js';
import { rescheduleBooking } from '@/lib/bookings/reschedule';
import { appointmentWhen } from '@/lib/dates/tenantTime';
import { leerConfigAnticipo, type ConfigAnticipo } from './config';

export type Plazo = {
  puede: boolean;
  /** Último instante para reagendar conservando el anticipo. */
  limite: Date;
  /** `limite` en hora del negocio, p. ej. "Martes 14 de octubre, 10:00". */
  limiteTexto: string;
  politica: string | null;
};

/** ¿Faltan al menos `plazoReagendarHoras` para la cita? */
export function puedeReagendar(cita: { starts_at: string }, config: ConfigAnticipo, now: Date = new Date()): Plazo {
  const limite = new Date(new Date(cita.starts_at).getTime() - config.plazoReagendarHoras * 3_600_000);
  return {
    puede: now.getTime() <= limite.getTime(),
    limite,
    limiteTexto: appointmentWhen(limite.toISOString(), config.timezone),
    politica: config.politica,
  };
}

export type ResultadoReagendar =
  | { ok: true }
  | { ok: false; motivo: 'no_encontrada' | 'fuera_de_plazo' | 'error'; error: string; plazo?: Plazo };

/**
 * Mueve LA MISMA fila (no cancela y recrea): el anticipo, su pago y su
 * estado quedan ligados a la cita, y el horario viejo se libera solo en
 * el mismo update que toma el nuevo — si el nuevo choca (23P01) no se
 * pierde nada. Reutiliza rescheduleBooking (reglas + correo de aviso).
 *
 * El plazo solo aplica a citas con anticipo (pending/paid); las demás se
 * mueven como siempre. Fuera de plazo → que decida el negocio (humano).
 */
export async function reagendarConservandoAnticipo(
  supabase: SupabaseClient,
  input: { tenantId: string; slug: string; bookingId: string; newStartsAt: string; newEndsAt: string },
  now: Date = new Date(),
  mover: typeof rescheduleBooking = rescheduleBooking
): Promise<ResultadoReagendar> {
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', input.bookingId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle();
  const cita = data as { starts_at: string; deposit_status?: string | null } | null;
  if (!cita) return { ok: false, motivo: 'no_encontrada', error: 'No encontré esa cita.' };

  if (cita.deposit_status === 'pending' || cita.deposit_status === 'paid') {
    const plazo = puedeReagendar(cita, await leerConfigAnticipo(supabase, input.tenantId), now);
    if (!plazo.puede) {
      return { ok: false, motivo: 'fuera_de_plazo', error: `Solo se puede cambiar hasta el ${plazo.limiteTexto}.`, plazo };
    }
  }

  const r = await mover({ bookingId: input.bookingId, slug: input.slug, newStartsAt: input.newStartsAt, newEndsAt: input.newEndsAt });
  return r.error ? { ok: false, motivo: 'error', error: r.error } : { ok: true };
}
