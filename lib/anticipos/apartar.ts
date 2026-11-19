import type { SupabaseClient } from '@supabase/supabase-js';
import { crearReserva } from '@/lib/bookings/crear';
import { faltaMigracion, leerConfigAnticipo, montoAnticipo } from './config';

export type ResultadoApartado =
  | {
      ok: true;
      bookingId: string;
      serviceName: string;
      /** true = quedó apartada esperando pago; NO mandes confirmación de cita todavía. */
      requiereAnticipo: boolean;
      montoMxn: number;
      venceEn: Date | null;
      /** Cómo pagar sin link (db/062), para el mensaje de apartado. */
      instrucciones?: string | null;
    }
  | { ok: false; status: number; error: string };

/**
 * Crea la cita con `crearReserva` (misma validación que la página pública)
 * y, si el servicio pide anticipo, la deja apartada: sigue ocupando el
 * horario (exclude constraint) hasta `venceEn`. Sin anticipo, o sin
 * db/061, queda confirmada directo como siempre.
 *
 * crearReserva no manda avisos; los manda quien llama. Con
 * `requiereAnticipo` el que llama manda el link de pago, no la confirmación.
 */
export async function apartarCita(
  supabase: SupabaseClient,
  tenantId: string,
  input: Record<string, unknown>,
  ahora: Date = new Date(),
  crear: typeof crearReserva = crearReserva
): Promise<ResultadoApartado> {
  const config = await leerConfigAnticipo(supabase, tenantId);
  const r = await crear(supabase, tenantId, input);
  if (!r.ok) return r;
  const directo = { ok: true as const, bookingId: r.bookingId, serviceName: r.serviceName, requiereAnticipo: false, montoMxn: 0, venceEn: null };
  if (!config.activado) return directo;

  const { data: servicio } = await supabase
    .from('service_types')
    .select('*')
    .eq('id', input.service_type_id as string)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  const monto = montoAnticipo(config, servicio as { deposit_mxn?: number | null } | null);
  if (monto <= 0) return directo;

  // shortcut: crear y marcar son dos escrituras; en el hueco de ms la cita
  // ya está confirmed. Si algún día importa, pasar el estado a create_booking.
  const venceEn = new Date(ahora.getTime() + config.minutosApartado * 60_000);
  const { data, error } = await supabase
    .from('bookings')
    .update({ deposit_status: 'pending', deposit_mxn: monto, hold_expires_at: venceEn.toISOString() })
    .eq('id', r.bookingId)
    .eq('tenant_id', tenantId)
    .select('id');
  if (error || !data?.length) {
    // La cita existe y está confirmada: se queda así antes que perderla.
    if (!faltaMigracion(error)) console.error('apartarCita: no se pudo marcar el anticipo', error);
    return directo;
  }
  return { ...directo, requiereAnticipo: true, montoMxn: monto, venceEn, instrucciones: config.instrucciones };
}
