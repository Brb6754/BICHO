import { createAdminClient } from '@/lib/supabase/admin';
import { appointmentWhen } from '@/lib/dates/tenantTime';

// WhatsApp confirmations, as a paid add-on.
//
// Three guards stand between a booking and a charge, in this order:
//   1. the tenant's `whatsapp_enabled` flag — a business that doesn't pay
//      for the add-on never generates a message;
//   2. the platform credentials — missing env means "not set up yet",
//      not "error on every booking";
//   3. a phone number that can actually be dialled.
// Each one that stops a send is recorded as `skipped`, so the reason is
// visible later instead of being a message that just never arrived.
//
// Never throws. The booking already exists in Postgres by the time this
// runs; a messaging failure must not take it down.

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? 'v21.0';

export type WhatsAppKind = 'confirmation' | 'reminder' | 'rescheduled' | 'cancelled';

// Mexican numbers get typed every which way: "618 123 4567",
// "6181234567", "+52 618 123 4567", and the old "521…" mobile form.
// WhatsApp wants digits only, country code included. Returns null when
// what's left can't be a number, rather than sending into the void.
export function toE164Mx(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `52${digits}`;
  // 521XXXXXXXXXX — the pre-2019 mobile prefix. Meta accepts it, but
  // normalising means the same person is one number in the log, not two.
  if (digits.length === 13 && digits.startsWith('521')) return `52${digits.slice(3)}`;
  if (digits.length === 12 && digits.startsWith('52')) return digits;
  // Anything else is either already international or unusable; only the
  // plausible lengths pass.
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

async function log(entry: {
  tenantId: string;
  bookingId?: string | null;
  kind: WhatsAppKind;
  toPhone: string;
  status: 'sent' | 'failed' | 'skipped';
  providerId?: string | null;
  error?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from('whatsapp_messages').insert({
      tenant_id: entry.tenantId,
      booking_id: entry.bookingId ?? null,
      kind: entry.kind,
      to_phone: entry.toPhone,
      status: entry.status,
      provider_id: entry.providerId ?? null,
      error: entry.error ?? null,
    });
  } catch (error) {
    // Losing the log entry is not a reason to lose the message.
    console.error('whatsapp log failed', error);
  }
}

export async function sendBookingWhatsApp({
  tenantId,
  tenantName,
  whatsappEnabled,
  bookingId,
  customerPhone,
  customerName,
  serviceName,
  startsAt,
  timezone,
  manageUrl,
  kind = 'confirmation',
}: {
  tenantId: string;
  tenantName: string;
  // Read from tenants.whatsapp_enabled by the caller, which already has
  // the row — passing it keeps this function from making a second query
  // on every booking just to find out it shouldn't run.
  whatsappEnabled: boolean;
  bookingId?: string | null;
  customerPhone: string;
  customerName: string;
  serviceName: string;
  startsAt: string;
  timezone?: string | null;
  manageUrl: string;
  kind?: WhatsAppKind;
}): Promise<{ status: 'sent' | 'failed' | 'skipped'; reason?: string }> {
  const to = toE164Mx(customerPhone ?? '');

  if (!whatsappEnabled) {
    // Not logged: a business without the add-on shouldn't accumulate rows
    // for messages it never asked for.
    return { status: 'skipped', reason: 'addon-off' };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    await log({ tenantId, bookingId, kind, toPhone: to ?? customerPhone, status: 'skipped', error: 'WhatsApp no configurado en la plataforma' });
    return { status: 'skipped', reason: 'not-configured' };
  }

  if (!to) {
    await log({ tenantId, bookingId, kind, toPhone: customerPhone, status: 'skipped', error: 'Teléfono no utilizable' });
    return { status: 'skipped', reason: 'bad-phone' };
  }

  // Template names and language have to match what Meta approved in the
  // WhatsApp Manager exactly, so they're configuration, not literals.
  const templateName =
    process.env[`WHATSAPP_TEMPLATE_${kind.toUpperCase()}`] ?? process.env.WHATSAPP_TEMPLATE_CONFIRMATION;
  if (!templateName) {
    await log({ tenantId, bookingId, kind, toPhone: to, status: 'skipped', error: `Falta la plantilla para "${kind}"` });
    return { status: 'skipped', reason: 'no-template' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? 'es_MX' },
          components: [
            {
              type: 'body',
              // Order matters and must match the approved template's
              // {{1}}..{{5}} placeholders. Documented in
              // WHATSAPP_SETUP.md so the template in Meta and this array
              // can't drift apart silently.
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: tenantName },
                { type: 'text', text: serviceName },
                { type: 'text', text: appointmentWhen(startsAt, timezone) },
                { type: 'text', text: manageUrl },
              ],
            },
          ],
        },
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = body?.error?.message ?? `HTTP ${res.status}`;
      await log({ tenantId, bookingId, kind, toPhone: to, status: 'failed', error: String(message).slice(0, 500) });
      console.error('whatsapp send failed', message);
      return { status: 'failed', reason: String(message) };
    }

    await log({
      tenantId,
      bookingId,
      kind,
      toPhone: to,
      status: 'sent',
      providerId: body?.messages?.[0]?.id ?? null,
    });
    return { status: 'sent' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'error desconocido';
    await log({ tenantId, bookingId, kind, toPhone: to, status: 'failed', error: message.slice(0, 500) });
    console.error('whatsapp send threw', error);
    return { status: 'failed', reason: message };
  }
}
