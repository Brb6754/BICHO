import { Resend } from 'resend';
import { FROM_BICHO, REPLY_TO } from './from';

// Correos del alta self-serve (/registro). Ninguno lanza: un correo caído
// no puede tumbar un alta que ya escribió el negocio en la base.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function send(tag: string, msg: { to: string; subject: string; html: string; replyTo?: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`${tag}: RESEND_API_KEY no está configurada, no se envió`);
    return false;
  }
  try {
    const { error } = await new Resend(apiKey).emails.send({ from: FROM_BICHO, ...msg });
    if (error) {
      console.error(`${tag} rejected`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`${tag} failed`, error);
    return false;
  }
}

export type SignupNotice = {
  business: string;
  giro: string;
  url: string;
  ownerEmail: string;
  ownerWhatsapp: string;
  createdAt: Date;
};

// Aviso a Bruno por cada alta nueva. Sin ADMIN_NOTIFY_EMAIL cae al mismo
// buzón que los avisos de demo.
export async function sendSignupNotice(n: SignupNotice): Promise<boolean> {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.DEMO_NOTIFY_EMAIL || 'nonameynk@gmail.com';
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#888;vertical-align:top;">${label}</td><td style="padding:6px 0;"><strong>${escapeHtml(value)}</strong></td></tr>`;
  const fecha = n.createdAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' });
  return send('sendSignupNotice', {
    to,
    replyTo: n.ownerEmail,
    subject: `Alta nueva: ${n.business} (${n.giro})`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="margin-bottom:4px;">Nuevo negocio en prueba</h2>
        <p style="color:#555;margin-top:0;">Se registró solo desde /registro. Arranca en <strong>trial</strong> (15 días).</p>
        <table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:14px;">
          ${row('Negocio', n.business)}
          ${row('Giro', n.giro)}
          ${row('Página', n.url)}
          ${row('Correo', n.ownerEmail)}
          ${row('WhatsApp', n.ownerWhatsapp)}
          ${row('Fecha', fecha)}
        </table>
        <p style="margin-top:22px;color:#888;font-size:13px;">Responde este correo para escribirle al dueño.</p>
      </div>`,
  });
}

// Confirmación de correo del dueño. El link lo arma el caller (token de
// Supabase generateLink) y aterriza en /t/{slug}/auth/callback.
export async function sendSignupConfirmation(to: string, business: string, link: string): Promise<boolean> {
  return send('sendSignupConfirmation', {
    to,
    replyTo: REPLY_TO,
    subject: `Confirma tu correo para entrar al panel de ${business}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#140F2E;">
        <h2 style="margin-bottom:4px;">Confirma tu correo</h2>
        <p style="color:#555;line-height:1.5;">Tu página de <strong>${escapeHtml(business)}</strong> ya está creada. Para entrar a tu panel (citas, servicios, horario) confirma que este correo es tuyo:</p>
        <p style="margin:28px 0;"><a href="${escapeHtml(link)}" style="background:#5B34E8;color:#fff;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:600;">Confirmar mi correo</a></p>
        <p style="color:#888;font-size:13px;line-height:1.5;">Si no creaste una cuenta en bicho, ignora este correo.</p>
      </div>`,
  });
}
