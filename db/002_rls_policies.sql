-- 002_rls_policies.sql
-- Row Level Security: tenant isolation lives in the database, not just app code.
-- Applied manually via the Supabase SQL Editor, after 001_schema.sql.

-- ============================================================
-- private schema — helper functions used inside policies.
-- Not "public" so PostgREST never exposes them as API endpoints.
-- SECURITY DEFINER so they can read business_users without re-triggering
-- RLS on business_users itself (which would recurse).
-- ============================================================
create schema if not exists private;

create or replace function private.is_member_of_tenant(check_tenant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from business_users
    where tenant_id = check_tenant_id
      and user_id = auth.uid()
  );
$$;

create or replace function private.is_owner_of_tenant(check_tenant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from business_users
    where tenant_id = check_tenant_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

-- ============================================================
-- tenants
-- Public can read (needed to resolve {slug}.tuapp.com on the public
-- booking page, no session involved). Only the owner can update.
-- Insert/delete are done via service_role (super-admin panel), so no
-- policy is needed for those — service_role bypasses RLS entirely.
-- ============================================================
alter table tenants enable row level security;

create policy tenants_select_public
  on tenants for select
  using (true);

create policy tenants_update_owner
  on tenants for update
  using (private.is_owner_of_tenant(id));

-- ============================================================
-- business_users
-- Members can see who else is on their tenant's team.
-- Only owners can add/remove/change team members.
-- ============================================================
alter table business_users enable row level security;

create policy business_users_select_members
  on business_users for select
  using (private.is_member_of_tenant(tenant_id));

create policy business_users_insert_owner
  on business_users for insert
  with check (private.is_owner_of_tenant(tenant_id));

create policy business_users_update_owner
  on business_users for update
  using (private.is_owner_of_tenant(tenant_id));

create policy business_users_delete_owner
  on business_users for delete
  using (private.is_owner_of_tenant(tenant_id));

-- ============================================================
-- resources
-- Public can see active resources (booking page catalog).
-- Tenant members manage their own resources (including inactive ones).
-- ============================================================
alter table resources enable row level security;

create policy resources_select_public_active
  on resources for select
  using (active = true);

create policy resources_select_members
  on resources for select
  using (private.is_member_of_tenant(tenant_id));

create policy resources_insert_members
  on resources for insert
  with check (private.is_member_of_tenant(tenant_id));

create policy resources_update_members
  on resources for update
  using (private.is_member_of_tenant(tenant_id));

create policy resources_delete_members
  on resources for delete
  using (private.is_member_of_tenant(tenant_id));

-- ============================================================
-- service_types
-- Same shape as resources: public sees the active catalog,
-- tenant members manage the full list.
-- ============================================================
alter table service_types enable row level security;

create policy service_types_select_public_active
  on service_types for select
  using (active = true);

create policy service_types_select_members
  on service_types for select
  using (private.is_member_of_tenant(tenant_id));

create policy service_types_insert_members
  on service_types for insert
  with check (private.is_member_of_tenant(tenant_id));

create policy service_types_update_members
  on service_types for update
  using (private.is_member_of_tenant(tenant_id));

create policy service_types_delete_members
  on service_types for delete
  using (private.is_member_of_tenant(tenant_id));

-- ============================================================
-- customers
-- PII. No anon access at all — the public booking flow writes
-- customers via the service_role API route, never via anon RLS.
-- Tenant members can view/manage their own customers (dashboard use).
-- ============================================================
alter table customers enable row level security;

create policy customers_select_members
  on customers for select
  using (private.is_member_of_tenant(tenant_id));

create policy customers_insert_members
  on customers for insert
  with check (private.is_member_of_tenant(tenant_id));

create policy customers_update_members
  on customers for update
  using (private.is_member_of_tenant(tenant_id));

create policy customers_delete_members
  on customers for delete
  using (private.is_member_of_tenant(tenant_id));

-- ============================================================
-- bookings
-- No anon access — anonymous booking creation goes through the
-- service_role API route (needs one server-side transaction covering
-- availability check + booking insert + payment attempt).
-- Tenant members manage their own calendar.
-- ============================================================
alter table bookings enable row level security;

create policy bookings_select_members
  on bookings for select
  using (private.is_member_of_tenant(tenant_id));

create policy bookings_insert_members
  on bookings for insert
  with check (private.is_member_of_tenant(tenant_id));

create policy bookings_update_members
  on bookings for update
  using (private.is_member_of_tenant(tenant_id));

create policy bookings_delete_members
  on bookings for delete
  using (private.is_member_of_tenant(tenant_id));

-- ============================================================
-- payments
-- Read-only for tenant members (dashboard visibility). Payments are
-- only ever written by the service_role webhook handler, never by a
-- logged-in business user directly — so no insert/update/delete policy.
-- ============================================================
alter table payments enable row level security;

create policy payments_select_members
  on payments for select
  using (private.is_member_of_tenant(tenant_id));
