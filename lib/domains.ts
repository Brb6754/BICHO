// Which subdomains of the root domain are OURS, and what each one means.
//
// Everything else is a business: {slug}.bichomx.com → /t/{slug}/*. That
// is why this list has to be shared rather than written twice — proxy.ts
// reads it to route, and tenant creation reads it to refuse. If they
// ever disagreed, someone could register a business whose slug shadows a
// real section of the site, and the failure would be silent: the
// business's page would simply never be reachable.

/**
 * Subdomains whose WHOLE path maps under an app prefix.
 * admin.bichomx.com/tenants → /admin/tenants
 */
export const PREFIXED_SUBDOMAINS: Record<string, string> = {
  admin: '/admin',
  vendedores: '/vendedor',
};

/**
 * Subdomains that are a second front door to the SAME site, with a
 * different home page. Only "/" is rewritten; every other path passes
 * through untouched.
 *
 * reservas.bichomx.com → serves app/reservas
 *
 * Two decisions are baked in here, and both were arrived at the hard
 * way.
 *
 * 1. ONLY THE ROOT MOVES. That landing links to /demo, /plataforma,
 *    /privacidad and /terminos, which live at the apex. Prefixing the
 *    whole path the way admin.* works would have 404'd all four, and
 *    would have turned reservas.bichomx.com/reservas#precios — the href
 *    MarketingNav already ships — into /reservas/reservas, which is the
 *    double-prefix trap this project has hit twice.
 *
 * 2. A REWRITE, NOT A REDIRECT. A 308 to the apex is the textbook
 *    answer for the duplicate content this creates, and it was built
 *    and then abandoned: Next rewrites an absolute Location header back
 *    down to a relative path, so the browser never leaves this host and
 *    loops forever. Confirmed by following the chain with a raw Host
 *    header — six hops and still going — and then proving the proxy
 *    itself computed the right absolute URL while the emitted Location
 *    was still "/reservas".
 *
 *    The duplicate is handled where it belongs instead: app/reservas
 *    declares a canonical URL pointing at the apex, which is the
 *    mechanism designed for exactly this. A hard 308 is still available
 *    without any app code — Vercel's own Domains settings can redirect
 *    this host at the edge, before the app runs.
 */
export const ROOT_ALIAS_SUBDOMAINS: Record<string, string> = {
  reservas: '/reservas',
};

/**
 * Subdomains of this domain that a DIFFERENT Vercel project serves.
 *
 * choose.bichomx.com → the Choose project (choose-web)
 *
 * This app never routes these: Vercel matches an explicitly assigned
 * hostname before the `*.bichomx.com` wildcard, so the request reaches
 * the other project and never gets here. They are listed anyway for one
 * reason — a business must never be able to take the slug, because the
 * resulting page would be shadowed by the other project and simply
 * never load, with no error anywhere to explain it.
 */
export const EXTERNAL_SUBDOMAINS = new Set<string>(['choose']);

/**
 * Names a business can never take as its slug. Two sources:
 * the subdomains above, plus the apex routes and infrastructure names a
 * subdomain would collide with or that would read as ours to a visitor.
 */
export const RESERVED_SLUGS = new Set<string>([
  ...Object.keys(PREFIXED_SUBDOMAINS),
  ...Object.keys(ROOT_ALIAS_SUBDOMAINS),
  ...EXTERNAL_SUBDOMAINS,
  // Real top-level routes in this app.
  'demo',
  'ia',
  'plataforma',
  'privacidad',
  'terminos',
  'api',
  'auth',
  // Infrastructure and brand names that must stay ours.
  'www',
  'mail',
  'envios',
  'noti',
  'app',
  'blog',
  'cdn',
  'static',
  'status',
  'soporte',
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}
