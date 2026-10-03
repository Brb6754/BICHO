import { Resend } from 'resend';
import { FROM_BICHO, REPLY_TO } from './from';
import { formatMoney, formatFolio } from '@/lib/quotes/totals';

// El correo que lleva la cotización.
//
// No adjunta el PDF: lleva el ENLACE. Dos razones, y la segunda es la
// que importa.
//
//  1. Un adjunto de varios cientos de kilobytes multiplica el costo de
//     cada envío y cae en más filtros de spam que un enlace.
//  2. El enlace deja saber CUÁNDO lo abrió el cliente. Ese dato —"la
//     vio hace veinte minutos"— es la razón por la que un vendedor
//     levanta el teléfono en el momento correcto, y es lo que una
//     cotización en Word nunca le va a dar. El PDF se descarga desde
//     esa misma página.
//
// Nunca lanza: devuelve si entregó. Quien llama decide qué hacer con
// eso, y la cotización ya existe pase lo que pase.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendQuoteEmail({
  to,
  customerName,
  businessName,
  folio,
  totalCents,
  validUntil,
  accentColor,
  slug,
  quoteId,
}: {
  to: string;
  customerName: string;
  businessName: string;
  folio: number;
  totalCents: number;
  validUntil: string | null;
  accentColor: string | null;
  slug: string;
  quoteId: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'bichomx.com';
  const esquema = root.startsWith('localhost') ? 'http' : 'https';
  const url = `${esquema}://${slug}.${root}/cotizacion/${quoteId}`;
  const color = accentColor ?? '#4F46E5';

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_BICHO,
      to,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      subject: `Cotización ${formatFolio(folio)} — ${businessName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <p style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #777; margin: 0 0 6px;">
            Cotización ${formatFolio(folio)}
          </p>
          <h1 style="font-size: 22px; margin: 0 0 16px;">${escapeHtml(businessName)}</h1>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
            Hola ${escapeHtml(customerName)}, aquí está tu cotización.
          </p>
          <p style="font-size: 28px; font-weight: 700; margin: 16px 0 4px;">${formatMoney(totalCents)}</p>
          ${
            validUntil
              ? `<p style="font-size: 14px; color: #777; margin: 0 0 24px;">Válida hasta el ${escapeHtml(validUntil)}.</p>`
              : '<div style="height: 16px"></div>'
          }
          <a href="${url}" style="display: inline-block; background: ${color}; color: #fff; text-decoration: none; padding: 14px 26px; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Ver la cotización
          </a>
          <p style="font-size: 13px; line-height: 1.6; color: #777; margin: 24px 0 0;">
            Desde ahí puedes descargarla en PDF. Si tienes dudas, responde este correo.
          </p>
        </div>
      `,
    });
    return !error;
  } catch {
    return false;
  }
}
