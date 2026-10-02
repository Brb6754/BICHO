// De qué dirección salen los correos de la plataforma.
//
// Una sola variable de entorno manda sobre las tres: `EMAIL_DOMAIN`.
// Con ella puesta (`bichomx.com`), los remitentes pasan a ser direcciones
// reales del dominio; sin ella, siguen saliendo de `onboarding@resend.dev`,
// el dominio compartido de Resend.
//
// Por qué una variable y no escribir las direcciones a mano: Resend
// RECHAZA cualquier envío desde un dominio que no esté verificado en la
// cuenta. Si estas direcciones estuvieran quemadas en el código, el día
// que se despliegue antes de terminar la verificación DNS, cada
// confirmación de cita fallaría en silencio — y el correo de
// confirmación es lo único que el cliente recibe. Así el cambio es
// prender una variable en Vercel cuando el dominio ya está verificado,
// sin desplegar y sin ventana de correos perdidos.
const DOMAIN = process.env.EMAIL_DOMAIN?.trim();

function address(local: string, label: string): string {
  return DOMAIN ? `${label} <${local}@${DOMAIN}>` : `${label} <onboarding@resend.dev>`;
}

/** Confirmaciones y avisos de cita que recibe el CLIENTE de un negocio. */
export const FROM_BOOKINGS = address('reservas', 'Reservas');

/** Avisos internos y correos que manda bicho como estudio. */
export const FROM_BICHO = address('ventas', 'bicho');

/**
 * A dónde contesta quien responda. Solo existe con dominio propio: sin
 * él, responder a `onboarding@resend.dev` no llega a ningún lado.
 *
 * Depende de que `ventas@` esté dado de alta en el reenvío de Cloudflare
 * — si no, las respuestas rebotan.
 */
export const REPLY_TO = DOMAIN ? `ventas@${DOMAIN}` : undefined;
