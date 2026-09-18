-- 020_schedule_blocks.sql
-- Time the business is NOT available, on top of its weekly schedule.
--
-- Until now a tenant could only describe a recurring week
-- (resource_schedules). There was no way to say "cerramos el 25 de
-- diciembre", "me voy de vacaciones esa semana" or "hoy salgo a comer una
-- hora más tarde" — so the booking page kept selling hours the business
-- couldn't honour, and the owner found out when they had to call someone
-- to cancel. That is worse than having had no system at all.
--
-- Design notes:
--   * A block is an absolute instant range (timestamptz), not a time of
--     day: "el 25 de diciembre" is a specific range, and storing it as a
--     local time of day would need a second rule for which date it lands
--     on.
--   * resource_id NULL means "the whole business". Closing for a holiday
--     is one row, not one per chair — and a resource added later is
--     covered by it automatically, which the per-resource version would
--     silently miss.
--   * No exclusion constraint: blocks are allowed to overlap each other.
--     Two overlapping holidays are not a conflict, they are the same
--     closed day described twice.

create table if not exists schedule_blocks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  -- NULL = applies to every resource of this tenant.
  resource_id uuid references resources(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text check (reason is null or char_length(reason) <= 200),
  created_at  timestamptz not null default now(),

  constraint schedule_blocks_range_valid check (ends_at > starts_at)
);

create index if not exists schedule_blocks_tenant_idx
  on schedule_blocks (tenant_id, starts_at);
create index if not exists schedule_blocks_resource_idx
  on schedule_blocks (resource_id, starts_at);

alter table schedule_blocks enable row level security;

-- Same shape as the rest of the tenant tables: the staff of a business
-- manage their own blocks, nobody else sees them. The public booking page
-- never reads this table directly — get_available_slots is SECURITY
-- DEFINER and already only returns free/busy ranges, never reasons.
-- Split per verb, matching resource_schedules (db/002): the helper is
-- private.is_member_of_tenant, and `for all` hides which verb a policy
-- failure came from when one is debugged later.
drop policy if exists schedule_blocks_select_members on schedule_blocks;
create policy schedule_blocks_select_members
  on schedule_blocks for select
  using (private.is_member_of_tenant(tenant_id));

drop policy if exists schedule_blocks_insert_members on schedule_blocks;
create policy schedule_blocks_insert_members
  on schedule_blocks for insert
  with check (private.is_member_of_tenant(tenant_id));

drop policy if exists schedule_blocks_update_members on schedule_blocks;
create policy schedule_blocks_update_members
  on schedule_blocks for update
  using (private.is_member_of_tenant(tenant_id));

drop policy if exists schedule_blocks_delete_members on schedule_blocks;
create policy schedule_blocks_delete_members
  on schedule_blocks for delete
  using (private.is_member_of_tenant(tenant_id));

comment on table schedule_blocks is 'Exceptions to the weekly schedule: holidays, vacations, one-off closures. resource_id NULL = the whole tenant.';

-- ============================================================
-- get_available_slots now subtracts blocks as well as bookings.
-- Same signature, so nothing that calls it has to change.
-- ============================================================
create or replace function get_available_slots(
  p_resource_id     uuid,
  p_service_type_id uuid,
  p_from            date,
  p_to              date
)
returns table (slot_start timestamptz, slot_end timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with resource_tenant as (
    select r.tenant_id, t.timezone
    from resources r
    join tenants t on t.id = r.tenant_id
    where r.id = p_resource_id
  ),
  svc as (
    select duration_minutes
    from service_types
    where id = p_service_type_id
  ),
  days as (
    select generate_series(p_from, p_to, interval '1 day')::date as day
  ),
  windows as (
    select
      (d.day + rs.starts_at) as window_start,
      (d.day + rs.ends_at)   as window_end
    from days d
    join resource_schedules rs
      on rs.resource_id = p_resource_id
     and rs.day_of_week = extract(dow from d.day)::smallint
  ),
  candidate_slots as (
    select
      step as local_start,
      step + make_interval(mins => svc.duration_minutes) as local_end
    from windows w
    cross join svc
    cross join lateral generate_series(
      w.window_start,
      w.window_end - make_interval(mins => svc.duration_minutes),
      make_interval(mins => svc.duration_minutes)
    ) as step
  )
  select
    (cs.local_start at time zone rt.timezone) as slot_start,
    (cs.local_end   at time zone rt.timezone) as slot_end
  from candidate_slots cs, resource_tenant rt
  where not exists (
    select 1
    from bookings b
    where b.resource_id = p_resource_id
      and b.status <> 'cancelled'
      and tstzrange(b.starts_at, b.ends_at) && tstzrange(
            (cs.local_start at time zone rt.timezone),
            (cs.local_end   at time zone rt.timezone)
          )
  )
  and not exists (
    select 1
    from schedule_blocks sb
    where sb.tenant_id = rt.tenant_id
      -- NULL resource_id blocks the whole business.
      and (sb.resource_id is null or sb.resource_id = p_resource_id)
      and tstzrange(sb.starts_at, sb.ends_at) && tstzrange(
            (cs.local_start at time zone rt.timezone),
            (cs.local_end   at time zone rt.timezone)
          )
  )
  order by slot_start;
$$;

comment on function get_available_slots is 'Free bookable slots for a resource+service in [p_from, p_to], minus existing bookings and schedule_blocks. SECURITY DEFINER: needs to read resource_schedules/bookings/schedule_blocks regardless of the caller''s RLS to compute this correctly even for anonymous callers — safe because it only returns computed free/busy time ranges, never booking, customer or block details.';

grant execute on function get_available_slots(uuid, uuid, date, date) to anon, authenticated;
