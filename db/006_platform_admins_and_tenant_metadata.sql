-- 006_platform_admins_and_tenant_metadata.sql
-- Internal super-admin auth + lightweight tenant metadata for the admin panel.
-- Applied manually via the Supabase SQL Editor, after 005.

-- ============================================================
-- platform_admins — the platform's own internal team, NOT tenant staff.
-- Deliberately has zero RLS policies for anon/authenticated: membership
-- must only ever be checked server-side via the service_role client
-- (see lib/supabase/admin.ts), never via a client-scoped query. This
-- keeps the table fully opaque to anything but service_role.
-- ============================================================
create table platform_admins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table platform_admins is 'Internal team members with access to the admin.{domain} panel. No RLS policies for anon/authenticated on purpose.';

alter table platform_admins enable row level security;
-- No policies added — default-deny for every role except service_role
-- (which bypasses RLS entirely regardless of policies).

-- ============================================================
-- Lightweight tenant metadata for the admin panel. Real columns, not
-- mocked — even though full billing (plan pricing, renewal dates,
-- payment history) is still step 7 (Stripe) territory.
-- ============================================================
alter table tenants
  add column vertical text not null default 'general',
  add column status   text not null default 'trial' check (status in ('trial', 'active', 'suspended', 'cancelled')),
  add column plan     text not null default 'standard';

comment on column tenants.vertical is 'Descriptive label only (peluqueria, dentista, padel, ...) — does NOT drive app behavior. See CLAUDE.md: one generic app, vertical is just a config preset/label, not a schema-level branch.';
comment on column tenants.status is 'Lifecycle status surfaced in the internal admin panel. Does not yet gate access to the tenant app itself (dashboard/reservar still work regardless of status) — enforcing suspension is a future step, not built yet.';
