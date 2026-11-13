import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { PREFIXED_SUBDOMAINS, ROOT_ALIAS_SUBDOMAINS } from '@/lib/domains';

// In prod this is your real domain (e.g. "tuapp.com"), set via env var.
// Locally it defaults to "localhost:3000" — *.localhost subdomains
// (e.g. admin.localhost:3000, test-salon.localhost:3000) resolve to
// 127.0.0.1 in modern browsers without touching the hosts file.
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

function extractSubdomain(host: string): string | null {
  const hostname = host.split(':')[0];
  const rootHostname = ROOT_DOMAIN.split(':')[0];

  if (hostname === rootHostname || hostname === `www.${rootHostname}`) {
    return null; // apex domain — no tenant, serves the marketing site
  }

  if (!hostname.endsWith(`.${rootHostname}`)) {
    return null; // unrelated host — treat like the apex domain
  }

  return hostname.slice(0, -(`.${rootHostname}`.length));
}

export async function proxy(request: NextRequest) {
  // Server Components can't set cookies, so refreshing the Supabase
  // session token has to happen here, on every request, before anything
  // downstream tries to read the session.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Just touching auth.getUser() is what triggers the token refresh.
  await supabase.auth.getUser();

  // Subdomain routing.
  const host = request.headers.get('host') ?? '';
  const subdomain = extractSubdomain(host);
  const { pathname } = request.nextUrl;

  // A path with a file extension is a static file from public/ (logo.png,
  // robots.txt, ...), not a page. Rewriting those sent
  // vendedores.dominio/logo.png to /vendedor/logo.png, which doesn't
  // exist — the bicho wordmark was silently 404ing on every subdomain
  // (the admin login too), showing an empty plaque. _next/* is already
  // excluded by the matcher below; this covers the rest of public/.
  const isStaticFile = /\.[a-zA-Z0-9]+$/.test(pathname);

  if (!subdomain || isStaticFile || pathname.startsWith('/api')) {
    // API routes are shared infrastructure, not tenant pages — they stay
    // at their literal top-level path regardless of subdomain.
    return response;
  }

  // Three kinds of subdomain (lib/domains.ts holds the lists, because
  // tenant creation has to refuse the same names):
  //
  //  1. A root alias — reservas.* serves a different home page from the
  //     same site. See lib/domains.ts for why this is a rewrite and not
  //     a redirect, and where the duplicate-content problem is handled.
  //  2. A prefixed panel — admin.* and vendedores.*, where the whole
  //     path lives under /admin or /vendedor.
  //  3. Anything else is a business: {slug}.bichomx.com → /t/{slug}.
  const alias = ROOT_ALIAS_SUBDOMAINS[subdomain];
  if (alias) {
    // Only "/" moves. Everything else is served as-is so this host keeps
    // /demo, /plataforma, /privacidad and /terminos working, and so
    // /reservas resolves instead of becoming /reservas/reservas.
    if (pathname !== '/') return response;
    const aliased = NextResponse.rewrite(new URL(alias, request.url), { request });
    response.cookies.getAll().forEach((cookie) => aliased.cookies.set(cookie));
    return aliased;
  }

  const prefix = PREFIXED_SUBDOMAINS[subdomain] ?? `/t/${subdomain}`;

  // Never prefix twice. A <Link> inside these sections is supposed to use
  // the PUBLIC path (/dashboard, not /t/{slug}/dashboard), but one that
  // slips through would otherwise become /t/{slug}/t/{slug}/... and 404
  // — which is exactly the bug that broke the tenant sidebar once and the
  // platform demo's menu a second time. Cheaper to make it impossible
  // here than to catch it in review every time.
  const alreadyPrefixed = pathname === prefix || pathname.startsWith(`${prefix}/`);
  const rewritePath = alreadyPrefixed ? pathname : `${prefix}${pathname}`;
  // new URL(path, base) drops base's query string; without copying it back
  // a page's searchParams arrive empty (?periodo=, ?estilo=, ?cotizacion=).
  const destino = new URL(rewritePath, request.url);
  destino.search = request.nextUrl.search;
  const rewritten = NextResponse.rewrite(destino, { request });

  // Carry over whatever session cookies got refreshed above onto the
  // rewritten response — otherwise the browser never sees them.
  response.cookies.getAll().forEach((cookie) => rewritten.cookies.set(cookie));

  return rewritten;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
