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
