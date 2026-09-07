import { Resend } from 'resend';

// The "from" address Resend lets any account send from without first
// verifying a custom domain — fine for now (no domain purchased yet,
// see CLAUDE.md), but Resend's shared sandbox domain has real limits
// (mainly: reliably reaches the account owner's own inbox, less so
// arbitrary customer inboxes) — once there's a real domain, verify it
// in the Resend dashboard and switch this to something like
// `reservas@tudominio.com`.
const FROM_ADDRESS = 'Reservas <onboarding@resend.dev>';

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('es-MX', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

// customerName is raw text from the public booking form — never trust
// it directly in HTML, even in an email (client rendering varies, and
// this costs nothing). businessName/serviceName come from the tenant's
// own data, but there's no reason to treat them differently here.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Never throws — a failed confirmation email is a real problem worth
// logging, but it must never take down the booking itself (the booking
// already succeeded in Postgres by the time this runs; the customer
// still has a real appointment even if this email never arrives).
export async function sendBookingConfirmation({
  customerEmail,
  customerName,
  businessName,
  serviceName,
  startsAt,
  manageUrl,
  accentColor,
  kind = 'confirmed',
}: {
  customerEmail: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  startsAt: string;
  // Link to the public "Ver mi cita" page (app/t/[slug]/reservar/cita/
  // [bookingId]) — the booking's own UUID stands in for auth there, so
  // this link alone is enough to view/reschedule/cancel. Built by
  // tenantManageBookingUrl() (lib/urls.ts) — a path-based URL on the
  // root domain, not a tenant subdomain, specifically so this actually
  // resolves both in local dev and on the shared *.vercel.app domain
  // (no custom domain purchased yet — see CLAUDE.md). Don't hand-build
  // a manageUrl any other way here.
  manageUrl: string;
  // Falls back to a neutral color so this still renders fine for a
  // tenant that hasn't set a custom accent yet.
  accentColor?: string;
  // 'rescheduled' swaps the subject/heading copy for the reschedule
  // flow (app/t/[slug]/reservar/cita/[bookingId]/actions.ts) — reusing
  // "¡Cita confirmada!" there would read like a brand new booking
  // instead of an updated time for an existing one. Everything else
  // (styling, the "Ver mi cita" button, escaping) stays identical.
  kind?: 'confirmed' | 'rescheduled';
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Expected in any environment before Bruno adds the key (local dev,
    // a fresh Vercel env) — skip quietly rather than error on every
    // booking just because email isn't configured yet.
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const when = formatDateTime(startsAt);
    const buttonColor = accentColor ?? '#4F46E5';
    const heading = kind === 'rescheduled' ? 'Tu cita se reprogramó' : '¡Cita confirmada!';
    const intro =
      kind === 'rescheduled'
        ? `Hola ${escapeHtml(customerName)}, tu cita en <strong>${escapeHtml(businessName)}</strong> se movió a un nuevo horario.`
        : `Hola ${escapeHtml(customerName)}, tu cita en <strong>${escapeHtml(businessName)}</strong> quedó agendada.`;
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: customerEmail,
      subject: `${kind === 'rescheduled' ? 'Cita reprogramada' : 'Cita confirmada'} — ${businessName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="margin-bottom: 4px;">${heading}</h2>
          <p style="color: #555;">${intro}</p>
          <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #888;">Servicio</td><td style="padding: 6px 0; text-align: right;"><strong>${escapeHtml(serviceName)}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Fecha y hora</td><td style="padding: 6px 0; text-align: right;"><strong>${when}</strong></td></tr>
          </table>
          <div style="text-align: center; margin-top: 28px;">
            <a href="${manageUrl}" style="display: inline-block; background: ${buttonColor}; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 999px;">
              Ver mi cita
            </a>
          </div>
          <p style="margin-top: 20px; color: #888; font-size: 13px; text-align: center;">Desde ahí podés cambiar o cancelar tu cita cuando quieras.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('sendBookingConfirmation failed', error);
  }
}
