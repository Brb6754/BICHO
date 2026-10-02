import { Resend } from 'resend';
import { FROM_BICHO, REPLY_TO } from './from';

// Dunning: the email a rep gets when their monthly charge fails.
//
// Without this, a failed card is invisible until the rep happens to open
// their panel, and Stripe quietly retries for a couple of weeks before
// giving up and cancelling the subscription. The businesses they brought
// in keep running the whole time, so the first signal anyone gets is a
// cancelled subscription and an awkward conversation.
//
// Same rules as sendBookingConfirmation: never throws, silently no-ops
// without RESEND_API_KEY. A failed email must not take down a webhook —
// the charge failure is already recorded in Postgres by the time this
// runs, and returning non-200 to Stripe would make it retry the whole
// event just because an email bounced.



function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type DunningStage =
  // First failure: Stripe will retry, nothing is suspended yet.
  | 'first_failure'
  // Stripe exhausted its retries and cancelled. The rep has to set the
  // card up again from scratch.
  | 'final_notice';

export async function sendResellerDunning({
  email,
  name,
  amountMxn,
  stage,
  panelUrl,
  hostedInvoiceUrl,
}: {
  email: string;
  name: string;
  /** Whole pesos, already converted for display. Never centavos. */
  amountMxn: number;
  stage: DunningStage;
  /** Where the rep goes to fix it — the "cambiar tarjeta" screen. */
  panelUrl: string;
  /** Stripe's own hosted invoice, if the event carried one. */
  hostedInvoiceUrl?: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email) return;

  const amount = `$${Math.round(amountMxn).toLocaleString('es-MX')} MXN`;
  const isFinal = stage === 'final_notice';

  const subject = isFinal
    ? 'Tu suscripción de vendedor quedó cancelada'
    : 'No pudimos cobrar tu mensualidad';

  const headline = isFinal ? 'Tu suscripción quedó cancelada' : 'No pudimos cobrar tu tarjeta';

  const body = isFinal
    ? `Intentamos cobrar ${amount} varias veces y no se pudo, así que Stripe canceló tu suscripción. Registra una tarjeta nueva desde tu panel para reactivarla.`
    : `Intentamos cobrar ${amount} y tu banco rechazó el cargo. Lo volveremos a intentar en los próximos días. Si sabes que esa tarjeta ya no sirve, cámbiala ahora y lo reintentamos de inmediato.`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_BICHO,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      to: email,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <h1 style="font-size: 20px; margin: 0 0 16px;">${escapeHtml(headline)}</h1>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
            Hola ${escapeHtml(name)}, ${escapeHtml(body)}
          </p>
          <p style="margin: 0 0 24px;">
            <a href="${panelUrl}" style="display: inline-block; background: #4F46E5; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-size: 15px; font-weight: 600;">
              Cambiar mi tarjeta
            </a>
          </p>
          ${
            hostedInvoiceUrl
              ? `<p style="font-size: 13px; color: #666; margin: 0 0 8px;">
                   <a href="${hostedInvoiceUrl}" style="color: #4F46E5;">Ver el recibo en Stripe</a>
                 </p>`
              : ''
          }
          <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 24px 0 0;">
            Tus negocios siguen funcionando normal. Esto es solo entre bicho y tú.
          </p>
        </div>
      `,
    });
  } catch (error) {
    // Logged, not thrown: see the note at the top of this file.
    console.error('[payments] dunning email failed', error instanceof Error ? error.message : 'unknown');
  }
}
