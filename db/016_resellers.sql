-- 016_resellers.sql
-- The authorised sales-rep network (marketing site: "Red de vendedores").
-- Apply manually in the Supabase SQL Editor, after 015.

-- ============================================================
-- resellers — independent sales reps who sign businesses up.
--
-- Same access model as platform_admins (db/006): RLS enabled with ZERO
-- policies, so the table is opaque to anon/authenticated and can only
-- be read or written by the service_role client (lib/supabase/admin.ts)
-- inside server code that has already checked who is asking. A rep is
-- NOT a tenant staff member (business_users) and NOT internal team
-- (platform_admins) — it is its own layer.
--
-- user_id is nullable on purpose: the internal team can register a rep
-- (name, zone, commission) before that person has an account, and link
-- the login afterwards.
-- ============================================================
create table resellers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references auth.users(id) on delete set null,
  name           text not null check (char_length(name) between 1 and 120),
  email          text not null check (char_length(email) <= 160),
  phone          text check (char_length(phone) <= 40),
  zone           text check (char_length(zone) <= 120),
  -- WHOLESALE: what bicho charges THIS rep, per month, per active
  -- business they brought in. The money flows rep → bicho, not the other
  -- way: the rep sets their own price to each business (tenants
  -- .retail_price_mxn) and keeps the difference. Whole pesos, hand-set
  -- in the internal panel.
  wholesale_price_mxn integer not null default 0 check (wholesale_price_mxn between 0 and 100000),
  -- What this rep usually charges a business. Only a default to prefill
  -- the form: the real price lives per business, since a rep prices case
  -- by case.
  default_retail_price_mxn integer not null default 0 check (default_retail_price_mxn between 0 and 100000),
  -- Day of the month bicho bills this rep for their active businesses.
  -- Capped at 28 so every month has it.
  billing_day smallint not null default 1 check (billing_day between 1 and 28),
  active         boolean not null default true,
  notes          text check (char_length(notes) <= 2000),
  created_at     timestamptz not null default now()
);

comment on table resellers is 'Independent sales reps. No RLS policies for anon/authenticated on purpose — service_role only, same as platform_admins.';
comment on column resellers.wholesale_price_mxn is 'MXN per month per ACTIVE tenant that this rep OWES bicho. The rep resells at their own price (tenants.retail_price_mxn) and keeps the margin.';
comment on column resellers.default_retail_price_mxn is 'Prefill for the price a rep charges a new business. The binding number is per business.';
comment on column resellers.user_id is 'Nullable: a rep can exist in the panel before they have a login. Set on delete set null so removing an auth user does not erase the rep and their attributed businesses.';

alter table resellers enable row level security;
-- No policies added — default-deny for everything except service_role.

-- ============================================================
-- Which rep brought each business in. `on delete set null`: removing a
-- rep must never cascade into deleting real businesses and their
-- bookings — the tenant simply goes back to having no rep attributed.
-- ============================================================
alter table tenants
  add column reseller_id uuid references resellers(id) on delete set null,
  -- What the rep charges THIS business per month, in whole pesos. Null
  -- for a business that came in directly (no rep in between).
  add column retail_price_mxn integer check (retail_price_mxn between 0 and 100000);

create index tenants_reseller_id_idx on tenants(reseller_id);

comment on column tenants.reseller_id is 'The sales rep who sells to this business, or null if it came in directly.';
comment on column tenants.retail_price_mxn is 'The price the rep charges this business per month. Set by the rep; bicho never charges this amount — it only charges the rep their wholesale price.';
