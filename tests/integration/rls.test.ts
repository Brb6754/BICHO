import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Tests the RLS boundary from the OUTSIDE — using the anon key, exactly
// like an unauthenticated visitor's browser — instead of just reading
// the policy SQL and trusting it does what it says. This is the
// multi-tenant isolation guarantee the whole app's authorization model
// rests on (see db/002_rls_policies.sql), so it's worth verifying
// against the real database rather than only the code that defines it.
//
// Deliberately does NOT create or sign in as any auth user (no
// `auth.admin.createUser`) — everything here is testable as a fully
// anonymous client, which is exactly the threat model that matters for
// these specific tables.
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

const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

describe.skipIf(!hasEnv)('RLS boundary (anon key, real Supabase)', () => {
  let anon: SupabaseClient;

  beforeAll(() => {
    anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  });

  it('cannot read customers (PII) as an anonymous visitor', async () => {
    const { data, error } = await anon.from('customers').select('*').limit(1);
    // RLS returns an empty result set (not an error) for a SELECT with
    // no matching policy — the important assertion is zero rows, not a
    // particular error shape.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('cannot read bookings as an anonymous visitor', async () => {
    const { data, error } = await anon.from('bookings').select('*').limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('cannot read business_users (team membership) as an anonymous visitor', async () => {
    const { data, error } = await anon.from('business_users').select('*').limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('cannot read platform_admins at all — not even an empty array via a policy, the table itself has none', async () => {
    const { data } = await anon.from('platform_admins').select('*').limit(1);
    expect(data).toEqual([]);
  });

  it('cannot read payments as an anonymous visitor', async () => {
    const { data, error } = await anon.from('payments').select('*').limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('CAN read tenants — needed for the public booking page to resolve a slug', async () => {
    const { error } = await anon.from('tenants').select('id, slug').limit(1);
    expect(error).toBeNull();
  });

  it('CAN read only active resources/service_types — the public catalog, not the full list', async () => {
    const { data: resources, error: resourceError } = await anon.from('resources').select('active').limit(50);
    expect(resourceError).toBeNull();
    expect((resources ?? []).every((r) => r.active === true)).toBe(true);

    const { data: services, error: serviceError } = await anon.from('service_types').select('active').limit(50);
    expect(serviceError).toBeNull();
    expect((services ?? []).every((s) => s.active === true)).toBe(true);
  });

  it('cannot call create_booking directly — service_role only, revoked from anon (db/010)', async () => {
    const { error } = await anon.rpc('create_booking', {
      p_tenant_id: '00000000-0000-0000-0000-000000000000',
      p_resource_id: '00000000-0000-0000-0000-000000000000',
      p_service_type_id: '00000000-0000-0000-0000-000000000000',
      p_starts_at: new Date().toISOString(),
      p_ends_at: new Date(Date.now() + 1000).toISOString(),
      p_customer_name: 'x',
      p_customer_phone: 'x',
    });
    expect(error).not.toBeNull();
  });
});
