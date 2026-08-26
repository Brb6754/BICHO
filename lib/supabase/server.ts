import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// For use in Server Components, Route Handlers, and Server Actions.
// Still the anon key — subject to RLS, scoped to the logged-in user's
// session via cookies. This is what the business dashboard uses.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // See lib/supabase/admin.ts for why this is here — Next.js's Data
      // Cache can still cache this client's fetch() calls even on a
      // route that's dynamic for other reasons (here, via cookies()).
      // Confirmed live on the admin client; forcing no-store here too
      // since the dashboard has the identical save-then-reload shape
      // (resources/services/schedule) and would hit the same bug.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set() called from a Server Component with no following
            // response — safe to ignore as long as session refresh
            // happens in middleware.
          }
        },
      },
    }
  );
}
