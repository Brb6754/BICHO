import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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

  if (!subdomain || pathname.startsWith('/api')) {
    // API routes are shared infrastructure, not tenant pages — they stay
    // at their literal top-level path regardless of subdomain.
    return response;
  }

  const rewritePath = subdomain === 'admin' ? `/admin${pathname}` : `/t/${subdomain}${pathname}`;
  const rewritten = NextResponse.rewrite(new URL(rewritePath, request.url), { request });

  // Carry over whatever session cookies got refreshed above onto the
  // rewritten response — otherwise the browser never sees them.
  response.cookies.getAll().forEach((cookie) => rewritten.cookies.set(cookie));

  return rewritten;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
