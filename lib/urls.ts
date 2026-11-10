// The public "Ver mi cita" link sent by email (booking confirmation +
// reschedule) — used by both app/api/reservar/route.ts (creating a
// booking) and app/t/[slug]/reservar/cita/[bookingId]/actions.ts
// (rescheduling one).
//
// Deliberately NOT `{slug}.{rootDomain}/reservar/cita/{id}` (a tenant
// subdomain) even though that's how a visitor reaches the booking page
// normally — an email link needs to work from a fresh navigation with
// no existing session/context, and subdomain routing has two real
// failure modes that make it unreliable there:
//   1. On the shared *.vercel.app domain (no custom domain purchased
//      yet — see CLAUDE.md), Vercel has no TLS certificate for an
//      arbitrary tenant subdomain, so the connection fails outright.
//   2. In local dev, NEXT_PUBLIC_ROOT_DOMAIN is `localhost:3000` — a
//      `{slug}.localhost:3000` link only resolves on the exact machine
//      currently running `npm run dev`, so it reliably breaks the
//      moment it's opened from an email client on a different device
//      (or the same device, dev server not running).
// This path-based form — the same one proxy.ts's own rewrite target
// uses internally — hits the real file-based route directly (verified
// live: returns 200 on the current production deployment, no custom
// domain needed) and needs nothing more than the app already being
// deployed/running, in either environment.
export function tenantManageBookingUrl(slug: string, bookingId: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${rootDomain}/t/${slug}/reservar/cita/${bookingId}`;
}

// The tenant's public booking page — same path-based form as above, for
// the same two reasons (no wildcard TLS on *.vercel.app, and
// {slug}.localhost only resolves on the dev machine). Used where the
// owner needs to open or share their own page from the dashboard.
export function tenantBookingPageUrl(slug: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${rootDomain}/t/${slug}/reservar`;
}

// La página pública de reuniones. Misma forma por path y por los
// mismos dos motivos que la de reservas: no hay TLS wildcard en
// *.vercel.app, y {sub}.localhost solo resuelve en la máquina de
// desarrollo.
export function tenantMeetingsPageUrl(slug: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${rootDomain}/t/${slug}/reuniones`;
}

// The rep's own subscription screen. Same path-based form and the same
// two reasons as the functions above: no wildcard TLS on *.vercel.app,
// and {sub}.localhost only resolves on the dev machine. Used by the
// dunning email, which by definition is opened somewhere else.
export function resellerSubscriptionUrl(): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${rootDomain}/vendedor/suscripcion`;
}

// La dirección que el dueño comparte por WhatsApp. Con un dominio real
// es su subdominio ({slug}.bichomx.com); en localhost o *.vercel.app
// (sin TLS wildcard) cae a la forma por path, por los mismos dos motivos
// de arriba.
export function tenantShareUrl(slug: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  if (rootDomain.startsWith('localhost') || rootDomain.endsWith('.vercel.app')) {
    const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
    return `${protocol}://${rootDomain}/t/${slug}`;
  }
  return `https://${slug}.${rootDomain}`;
}

// El link de "confirma tu correo" del registro. Por path y en el dominio
// raíz, por los mismos motivos de arriba; el callback canjea el token y
// deja la sesión en ese mismo host antes de mandar al panel.
export function tenantConfirmEmailUrl(slug: string, tokenHash: string, type: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
  const q = new URLSearchParams({ token_hash: tokenHash, type, next: `/t/${slug}/dashboard` });
  return `${protocol}://${rootDomain}/t/${slug}/auth/callback?${q}`;
}

// La tarjeta de lealtad de una clienta (db/047). Por path, por los mismos
// motivos de arriba: el link viaja por WhatsApp y se abre en otro teléfono.
export function tenantLoyaltyCardUrl(slug: string, token: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${rootDomain}/t/${slug}/tarjeta/${token}`;
}
