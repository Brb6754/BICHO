import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Uses the service_role key — bypasses RLS entirely. Only ever import
// this from server-only code (Route Handlers), never from a Client or
// Server Component. This is what the public booking flow uses: it needs
// to write `customers` (PII, no anon RLS access) and run availability
// check + booking insert + payment attempt as one server-side operation.
// See CLAUDE.md, architecture decision #3.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      // Next.js patches the global fetch() to cache GET requests made
      // during a Server Component render (its Data Cache) — a SEPARATE
      // layer from route-level `dynamic`/revalidatePath, and one that
      // doesn't reliably get busted just by marking the route dynamic.
      // Confirmed live: after a real DB write, a fresh request (even a
      // cache-busted URL) kept rendering the pre-write value from this
      // client's own reads. Forcing every request this client makes to
      // `no-store` is what actually fixes it — this client only ever
      // needs live data, never a cached snapshot.
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    }
  );
}
