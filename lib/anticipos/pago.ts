import type { SupabaseClient } from '@supabase/supabase-js';
import { mpConnectHabilitado } from './config';
import { proveedorMpConnect } from '@/lib/payments/mpConnectPago';

export type InputLinkAnticipo = { tenantId: string; bookingId: string; montoMxn: number; descripcion: string; vence: Date };

/** Lo implementa la fase 2: lib/payments/mpConnectPago.ts (default de obtenerLinkAnticipo). */
export type ProveedorPago = {
  crearLinkAnticipo(input: InputLinkAnticipo): Promise<{ url: string; referencia: string } | null>;
};

/**
 * Link de pago del anticipo, o null. Con null el bot dice que el negocio
 * le compartirá cómo pagar (fase 1: sin cobro real).
 * null si MP_CONNECT_ENABLED != '1', si el negocio no conectó su cuenta,
 * si no hay proveedor, o si el proveedor falla (nunca lanza).
 */
export async function obtenerLinkAnticipo(
  supabase: SupabaseClient,
  input: InputLinkAnticipo,
  // Por defecto, Checkout Pro con la cuenta de Mercado Pago del negocio, sobre la misma db.
  proveedor: ProveedorPago | null = proveedorMpConnect(supabase)
): Promise<{ url: string; referencia: string } | null> {
  if (!mpConnectHabilitado() || !proveedor) return null;
  const { data, error } = await supabase
    .from('tenant_mp_connections')
    .select('tenant_id')
    .eq('tenant_id', input.tenantId)
    .maybeSingle();
  if (error || !data) return null;
  try {
    return await proveedor.crearLinkAnticipo(input);
  } catch (e) {
    console.error('obtenerLinkAnticipo', e);
    return null;
  }
}
