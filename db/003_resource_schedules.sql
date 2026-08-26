-- 003_resource_schedules.sql
-- Recurring weekly operating hours per resource, fully customizable per tenant.
-- Applied manually via the Supabase SQL Editor, after 002_rls_policies.sql.

-- Needed to convert a resource's local schedule (a "time of day") into an
-- actual timestamptz slot — different tenants could be in different
-- timezones, and IANA names (not fixed offsets) handle daylight saving
-- automatically.
alter table tenants
  add column timezone text not null default 'America/Mexico_City';

comment on column tenants.timezone is 'IANA timezone name (e.g. America/Mexico_City). Used to convert resource_schedules (local time-of-day) into timestamptz slots.';

-- ============================================================
-- resource_schedules — recurring weekly availability windows.
-- Multiple rows per (resource, day) are allowed on purpose, so a
-- resource can have a split shift (e.g. 09:00-13:00 and 15:00-19:00
-- with a lunch break in between) — fully customizable, no assumption
-- of a single continuous window per day.
-- ============================================================
create table resource_schedules (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sunday..6=Saturday, matches Postgres extract(dow from ...)
  starts_at   time not null,
  ends_at     time not null,
  created_at  timestamptz not null default now(),

  constraint schedule_ends_after_starts check (ends_at > starts_at)
);

create index resource_schedules_tenant_id_idx on resource_schedules(tenant_id);
create index resource_schedules_resource_id_idx on resource_schedules(resource_id);

comment on table resource_schedules is 'Recurring weekly hours a resource is bookable. day_of_week: 0=Sunday..6=Saturday (extract(dow)).';

-- ============================================================
-- RLS — same pattern as resources/service_types: public read (it's
-- just operating hours, not sensitive), tenant members manage it.
-- ============================================================
alter table resource_schedules enable row level security;

create policy resource_schedules_select_public
  on resource_schedules for select
  using (true);

create policy resource_schedules_insert_members
  on resource_schedules for insert
  with check (private.is_member_of_tenant(tenant_id));

create policy resource_schedules_update_members
  on resource_schedules for update
  using (private.is_member_of_tenant(tenant_id));

create policy resource_schedules_delete_members
  on resource_schedules for delete
  using (private.is_member_of_tenant(tenant_id));
