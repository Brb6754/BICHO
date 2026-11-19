import type { SupabaseClient } from '@supabase/supabase-js';
import { enviarTexto } from '@/lib/whatsapp/texto';
import { toE164Mx } from '@/lib/whatsapp/phone';
import { appointmentWhen } from '@/lib/dates/tenantTime';

// El aviso por WhatsApp a la clienta de una cita con anticipo. Lo usan el
// webhook de Mercado Pago (pago en línea) y el panel ("Ya pagó", pago a
// mano), para que el comprobante salga igual por los dos caminos.

export const pesosMxn = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} MXN`;

/**
 * Manda `texto` al teléfono de la cita, por el número del negocio o el de
 * la plataforma. Texto libre: Meta lo rechaza fuera de las 24 h desde el
 * último mensaje de la clienta (queda en el log). Nunca lanza.
 */
export async function avisarPorWhatsapp(
  db: SupabaseClient,
  ref: { tenantId: string; bookingId: string },
  texto: (c: { servicio: string; cuando: string }) => string,
  log = '[mp-anticipos]'
): Promise<boolean> {
  try {
    const [{ data: cita }, { data: tenant }] = await Promise.all([
      db.from('bookings').select('starts_at, customers(phone), service_types(name)').eq('id', ref.bookingId).eq('tenant_id', ref.tenantId).maybeSingle(),
      db.from('tenants').select('*').eq('id', ref.tenantId).maybeSingle(),
    ]);
    const c = cita as { starts_at: string; customers?: { phone?: string | null } | null; service_types?: { name?: string | null } | null } | null;
    const t = tenant as { timezone?: string | null; whatsapp_phone_number_id?: string | null } | null;
    const to = c?.customers?.phone ? toE164Mx(c.customers.phone) : null;
    const phoneNumberId = t?.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!c || !to || !phoneNumberId) {
      console.warn(`${log} sin teléfono o número emisor para avisar booking=${ref.bookingId}`);
      return false;
    }
    const enviado = await enviarTexto(phoneNumberId, to, texto({ servicio: c.service_types?.name ?? 'tu cita', cuando: appointmentWhen(c.starts_at, t?.timezone) }));
    if (!enviado.ok) console.warn(`${log} aviso por WhatsApp no salió booking=${ref.bookingId}`);
    return enviado.ok;
  } catch (e) {
    console.error(`${log} aviso falló: ${e instanceof Error ? e.message : 'desconocido'}`);
    return false;
  }
}
