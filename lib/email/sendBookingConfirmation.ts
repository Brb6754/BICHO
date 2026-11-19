import { Resend } from 'resend';
import { appointmentWhen, formatTime } from '@/lib/dates/tenantTime';
import { readableFgRgb } from '@/lib/branding/colors';
import { FROM_BOOKINGS, REPLY_TO } from './from';

// El remitente vive en ./from: una sola variable de entorno decide si
// sale de `reservas@bichomx.com` o del dominio compartido de Resend.


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
  timezone,
  anticipo = null,
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
  // 'reminder' = el recordatorio de 24 h del módulo "Clientes que
  // regresan" (app/api/cron/recordatorios).
  kind?: 'confirmed' | 'rescheduled' | 'reminder';
  // tenants.timezone. REQUIRED for a correct time: this runs in a
  // serverless function whose process timezone is UTC, so formatting
  // without it told a customer in Mexico City that their 17:30
  // appointment was at 23:30. Falls back to America/Mexico_City.
  timezone?: string | null;
  // Cita apartada que espera anticipo (lib/anticipos): el correo dice
  // "apartada", no "confirmada", con el monto, a qué hora se libera y el
  // link de pago si lo hay.
  anticipo?: { montoMxn: number; venceEn: string; pagoUrl: string | null } | null;
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
    const when = appointmentWhen(startsAt, timezone);
    const buttonColor = accentColor ?? '#4F46E5';
    // Texto blanco fijo sobre un acento claro (lima, dorado) no se leía.
    const buttonText = `rgb(${readableFgRgb(buttonColor).split(' ').join(', ')})`;
    const button = (href: string, label: string) =>
      `<a href="${escapeHtml(href)}" style="display: inline-block; background: ${buttonColor}; color: ${buttonText}; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 999px;">${label}</a>`;
    const pendiente = kind === 'confirmed' ? anticipo : null;
    const monto = pendiente ? `$${pendiente.montoMxn.toLocaleString('es-MX')}` : '';
    const hola = `Hola ${escapeHtml(customerName)}, tu cita en <strong>${escapeHtml(businessName)}</strong>`;
    const heading = pendiente
      ? 'Tu cita está apartada'
      : kind === 'rescheduled'
        ? 'Tu cita se reprogramó'
        : kind === 'reminder'
          ? 'Te esperamos pronto'
          : '¡Cita confirmada!';
    const intro = pendiente
      ? `Hola ${escapeHtml(customerName)}, apartamos tu horario en <strong>${escapeHtml(businessName)}</strong>. Para confirmarlo falta tu anticipo de <strong>${monto}</strong>; si no llega antes de las <strong>${formatTime(pendiente.venceEn, timezone)}</strong> (hora del negocio), el horario se libera.`
      : kind === 'rescheduled'
        ? `${hola} se movió a un nuevo horario.`
        : kind === 'reminder'
          ? `Hola ${escapeHtml(customerName)}, te recordamos tu cita en <strong>${escapeHtml(businessName)}</strong>.`
          : `${hola} quedó agendada.`;
    const subject = pendiente
      ? 'Falta tu anticipo para confirmar tu cita'
      : kind === 'rescheduled'
        ? 'Cita reprogramada'
        : kind === 'reminder'
          ? 'Recordatorio de tu cita'
          : 'Cita confirmada';
    const bloqueAnticipo = !pendiente
      ? ''
      : pendiente.pagoUrl
        ? `<div style="text-align: center; margin-top: 28px;">${button(pendiente.pagoUrl, `Pagar anticipo de ${monto}`)}</div>`
        : `<p style="margin-top: 20px; color: #555;">${escapeHtml(businessName)} te dirá cómo pagar el anticipo.</p>`;
    await resend.emails.send({
      from: FROM_BOOKINGS,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      to: customerEmail,
      subject: `${subject} — ${businessName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="margin-bottom: 4px;">${heading}</h2>
          <p style="color: #555;">${intro}</p>
          <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #888;">Servicio</td><td style="padding: 6px 0; text-align: right;"><strong>${escapeHtml(serviceName)}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Fecha y hora</td><td style="padding: 6px 0; text-align: right;"><strong>${when}</strong></td></tr>
            ${pendiente ? `<tr><td style="padding: 6px 0; color: #888;">Anticipo</td><td style="padding: 6px 0; text-align: right;"><strong>${monto}</strong> · pendiente</td></tr>` : ''}
          </table>
          ${bloqueAnticipo}
          <div style="text-align: center; margin-top: ${pendiente ? '16px' : '28px'};">
            ${pendiente?.pagoUrl ? `<a href="${escapeHtml(manageUrl)}" style="color: ${buttonColor}; font-weight: 600;">Ver mi cita</a>` : button(manageUrl, 'Ver mi cita')}
          </div>
          <p style="margin-top: 20px; color: #888; font-size: 13px; text-align: center;">Desde ahí puedes cambiar o cancelar tu cita cuando quieras.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('sendBookingConfirmation failed', error);
  }
}
