import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Integration test against the REAL Supabase project — no mocking,
// because the thing actually worth verifying here (the exclusion
// constraint at db/001_schema.sql:109 rejecting an overlapping booking)
// only exists in Postgres itself; a mock would just prove the mock
// works. Creates its own throwaway tenant/resource/service, cleans up
// via cascade delete on the tenant row in afterAll — never touches any
// tenant a real user might have.
//
// Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, read the
// same way the rest of this project's env vars are (no dotenv
// dependency) — loads .env.local directly since Vitest doesn't do this
// automatically outside of a Next.js process.
function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    if (!line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// Skips cleanly (not a failure) in any environment that doesn't have a
// real Supabase project configured — e.g. CI running before secrets are
// wired up — rather than failing the whole suite on a missing .env.local.
describe.skipIf(!hasEnv)('create_booking atomicity (real Supabase)', () => {
  let supabase: SupabaseClient;
  let tenantId: string;
  let resourceId: string;
  let serviceTypeId: string;
  const slug = `vitest-tmp-${Date.now()}`;

  beforeAll(async () => {
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ slug, name: 'Vitest Temp Tenant' })
      .select('id')
      .single();
    if (tenantError || !tenant) throw new Error(`Setup failed creating tenant: ${tenantError?.message}`);
    tenantId = tenant.id;

    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .insert({ tenant_id: tenantId, name: 'Test Resource' })
      .select('id')
      .single();
    if (resourceError || !resource) throw new Error(`Setup failed creating resource: ${resourceError?.message}`);
    resourceId = resource.id;

    const { data: service, error: serviceError } = await supabase
      .from('service_types')
      .insert({ tenant_id: tenantId, name: 'Test Service', duration_minutes: 30, price_cents: 10000 })
      .select('id')
      .single();
    if (serviceError || !service) throw new Error(`Setup failed creating service: ${serviceError?.message}`);
    serviceTypeId = service.id;
  });

  afterAll(async () => {
    // Cascade delete: every table referencing tenants(id) is `on delete
    // cascade` (db/001_schema.sql) — one delete cleans up the resource,
    // service_type, customers, and bookings created during this test.
    if (tenantId) {
      await supabase.from('tenants').delete().eq('id', tenantId);
    }
  });

  it('creates a booking successfully for a free slot', async () => {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();

    const { data: bookingId, error } = await supabase.rpc('create_booking', {
      p_tenant_id: tenantId,
      p_resource_id: resourceId,
      p_service_type_id: serviceTypeId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_customer_name: 'Vitest Customer',
      p_customer_phone: '5555555555',
    });

    expect(error).toBeNull();
    expect(bookingId).toBeTruthy();

    const { data: booking } = await supabase.from('bookings').select('status').eq('id', bookingId).single();
    expect(booking?.status).toBe('confirmed');
  });

  it('rejects a second booking that overlaps an existing one on the same resource', async () => {
    const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 48 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();

    const first = await supabase.rpc('create_booking', {
      p_tenant_id: tenantId,
      p_resource_id: resourceId,
      p_service_type_id: serviceTypeId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_customer_name: 'First Customer',
      p_customer_phone: '5555555555',
    });
    expect(first.error).toBeNull();

    // Same resource, overlapping window (starts 15min into the first
    // booking) — this is exactly the race condition the exclusion
    // constraint exists for: two requests landing close together for
    // the same resource/time.
    const overlapStart = new Date(new Date(startsAt).getTime() + 15 * 60 * 1000).toISOString();
    const overlapEnd = new Date(new Date(overlapStart).getTime() + 30 * 60 * 1000).toISOString();

    const second = await supabase.rpc('create_booking', {
      p_tenant_id: tenantId,
      p_resource_id: resourceId,
      p_service_type_id: serviceTypeId,
      p_starts_at: overlapStart,
      p_ends_at: overlapEnd,
      p_customer_name: 'Second Customer',
      p_customer_phone: '5555555555',
    });

    expect(second.error).not.toBeNull();
    expect(second.error?.code).toBe('23P01'); // exclusion_violation

    // The whole function call must roll back on conflict — no orphan
    // customer row left behind from the failed second attempt.
    const { count } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('name', 'Second Customer');
    expect(count).toBe(0);
  });

  it('allows a booking on the SAME resource once the first one is cancelled', async () => {
    const startsAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 72 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();

    const first = await supabase.rpc('create_booking', {
      p_tenant_id: tenantId,
      p_resource_id: resourceId,
      p_service_type_id: serviceTypeId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_customer_name: 'Cancels Me',
      p_customer_phone: '5555555555',
    });
    expect(first.error).toBeNull();

    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', first.data);

    // The exclusion constraint filters `where status <> 'cancelled'` —
    // a cancelled booking must free up the slot for a new one.
    const second = await supabase.rpc('create_booking', {
      p_tenant_id: tenantId,
      p_resource_id: resourceId,
      p_service_type_id: serviceTypeId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_customer_name: 'Rebooked',
      p_customer_phone: '5555555555',
    });
    expect(second.error).toBeNull();
    expect(second.data).toBeTruthy();
  });
});
