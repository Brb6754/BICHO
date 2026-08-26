-- 004_availability_function.sql
-- Given a resource + service + date range, returns the free bookable slots.
-- Applied manually via the Supabase SQL Editor, after 003_resource_schedules.sql.

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
    select t.timezone
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
    -- resource_schedules.starts_at/ends_at are "time of day" — combine
    -- with the calendar day to get a naive local timestamp.
    select
      (d.day + rs.starts_at) as window_start,
      (d.day + rs.ends_at)   as window_end
    from days d
    join resource_schedules rs
      on rs.resource_id = p_resource_id
     and rs.day_of_week = extract(dow from d.day)::smallint
  ),
  candidate_slots as (
    -- Back-to-back slots starting at the window open, each exactly as
    -- long as the service's duration.
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
  order by slot_start;
$$;

comment on function get_available_slots is 'Free bookable slots for a resource+service in [p_from, p_to]. SECURITY DEFINER: needs to read resource_schedules/bookings regardless of the caller''s RLS to compute this correctly even for anonymous callers — safe because it only returns computed free/busy time ranges, never booking or customer details.';

grant execute on function get_available_slots(uuid, uuid, date, date) to anon, authenticated;
