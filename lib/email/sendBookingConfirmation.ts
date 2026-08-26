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
}: {
  customerEmail: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  startsAt: string;
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
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: customerEmail,
      subject: `Cita confirmada — ${businessName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="margin-bottom: 4px;">¡Cita confirmada!</h2>
          <p style="color: #555;">Hola ${customerName}, tu cita en <strong>${businessName}</strong> quedó agendada.</p>
          <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #888;">Servicio</td><td style="padding: 6px 0; text-align: right;"><strong>${serviceName}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Fecha y hora</td><td style="padding: 6px 0; text-align: right;"><strong>${when}</strong></td></tr>
          </table>
          <p style="margin-top: 24px; color: #888; font-size: 13px;">Si necesitás cambiar o cancelar tu cita, contactá directamente al negocio.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('sendBookingConfirmation failed', error);
  }
}
