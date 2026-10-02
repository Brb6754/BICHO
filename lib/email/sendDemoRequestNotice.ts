import { Resend } from 'resend';
import { FROM_BICHO } from './from';

// Notifies Bruno that a demo request came in from /demo.
//
// Unlike sendBookingConfirmation, this one REPORTS whether it delivered.
// The caller needs to know: if the `demo_requests` table doesn't exist
// yet (migration 019 not run), the email is the only thing standing
// between a real lead and silence, and the form must not claim success
// when nothing anywhere received it.
//
// Note on deliverability: this goes to the account owner's own inbox,
// which is the one case Resend's shared sandbox domain handles reliably
// (see the note in sendBookingConfirmation about buying a domain).


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return '';
  return `<tr><td style="padding: 6px 12px 6px 0; color: #888; vertical-align: top;">${label}</td><td style="padding: 6px 0;"><strong>${escapeHtml(value)}</strong></td></tr>`;
}

export type DemoRequestNotice = {
  name: string;
  business: string;
  email: string;
  phone: string;
  vertical?: string | null;
  city?: string | null;
  plan?: string | null;
  message?: string | null;
};

// Never throws. Returns true only when Resend actually accepted the
// message — "no API key configured" is false, not a silent success.
export async function sendDemoRequestNotice(lead: DemoRequestNotice): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const to = process.env.DEMO_NOTIFY_EMAIL ?? 'nonameynk@gmail.com';

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_BICHO,
      to,
      // Reply goes straight to the lead, so answering is one tap from
      // the notification instead of a copy-paste of their address.
      replyTo: lead.email,
      subject: `Demo: ${lead.business} (${lead.name})`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="margin-bottom: 4px;">Nueva solicitud de demo</h2>
          <p style="color: #555; margin-top: 0;">Llegó desde la página de bicho.</p>
          <table style="width: 100%; margin-top: 16px; border-collapse: collapse; font-size: 14px;">
            ${row('Negocio', lead.business)}
            ${row('Contacto', lead.name)}
            ${row('Teléfono', lead.phone)}
            ${row('Correo', lead.email)}
            ${row('Giro', lead.vertical)}
            ${row('Ciudad', lead.city)}
            ${row('Plan que vio', lead.plan)}
          </table>
          ${
            lead.message
              ? `<p style="margin-top: 18px; padding: 12px 14px; background: #F5F3FC; border-radius: 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(lead.message)}</p>`
              : ''
          }
          <p style="margin-top: 22px; color: #888; font-size: 13px;">
            Responde este correo para contestarle directo.
          </p>
        </div>
      `,
    });
    if (error) {
      console.error('sendDemoRequestNotice rejected', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('sendDemoRequestNotice failed', error);
    return false;
  }
}
