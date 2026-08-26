-- 001_schema.sql
-- Core schema for the multi-tenant booking platform.
-- Applied manually via the Supabase SQL Editor.

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist"; -- needed for the exclude constraint on bookings

-- ============================================================
-- tenants — one row per business (the "T" in multi-tenant)
-- ============================================================
create table tenants (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now(),

  constraint slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table tenants is 'One row per business. slug is the {slug}.tuapp.com subdomain — keep it URL/DNS-safe.';

-- ============================================================
-- business_users — links Supabase auth users to a tenant, with a role
-- ============================================================
create table business_users (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),

  unique (tenant_id, user_id)
);

create index business_users_tenant_id_idx on business_users(tenant_id);
create index business_users_user_id_idx on business_users(user_id);

comment on table business_users is 'Membership: which auth.users belong to which tenant, and as what role.';

-- ============================================================
-- resources — a bookable "slot generator": a chair, a room, a court
-- ============================================================
create table resources (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index resources_tenant_id_idx on resources(tenant_id);

comment on table resources is 'A physical bookable thing (chair, room, court). Only active=true rows are public.';

-- ============================================================
-- service_types — the catalog of services a tenant offers
-- ============================================================
create table service_types (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  name             text not null,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents      int not null check (price_cents >= 0),
  requires_staff   boolean not null default true,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create index service_types_tenant_id_idx on service_types(tenant_id);

comment on table service_types is 'requires_staff=false is the hook for padel-style resource-only bookings, added later.';

-- ============================================================
-- customers — end customers of a tenant. Holds PII, never public.
-- ============================================================
create table customers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  email      text,
  phone      text,
  created_at timestamptz not null default now()
);

create index customers_tenant_id_idx on customers(tenant_id);

comment on table customers is 'PII. Never exposed to anon via RLS — only written/read through the service_role API route.';

-- ============================================================
-- bookings — the core table. resource_id + time range must never overlap.
-- ============================================================
create table bookings (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  resource_id     uuid not null references resources(id) on delete cascade,
  service_type_id uuid not null references service_types(id) on delete restrict,
  customer_id     uuid not null references customers(id) on delete cascade,
  staff_user_id   uuid references business_users(id) on delete set null,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  created_at      timestamptz not null default now(),

  constraint ends_after_starts check (ends_at > starts_at),

  -- Last line of defense against double-booking: two non-cancelled bookings
  -- on the same resource can't have overlapping time ranges, enforced by
  -- Postgres itself so an application-level race condition can't slip through.
  constraint no_overlapping_bookings exclude using gist (
    resource_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled')
);

create index bookings_tenant_id_idx on bookings(tenant_id);
create index bookings_resource_id_idx on bookings(resource_id);
create index bookings_customer_id_idx on bookings(customer_id);

comment on table bookings is 'requires_staff=false services should leave staff_user_id null.';

-- ============================================================
-- payments — payment attempts/records tied to a booking
-- ============================================================
create table payments (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  booking_id         uuid not null references bookings(id) on delete cascade,
  provider           text not null check (provider in ('stripe', 'mercadopago')),
  provider_payment_id text,
  amount_cents       int not null check (amount_cents >= 0),
  currency           text not null default 'MXN',
  status             text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at         timestamptz not null default now()
);

create index payments_tenant_id_idx on payments(tenant_id);
create index payments_booking_id_idx on payments(booking_id);

comment on table payments is 'One row per payment attempt against a booking; provider_payment_id links back to Stripe/Mercado Pago.';
