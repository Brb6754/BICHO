-- 005_create_booking_function.sql
-- Atomic customer+booking creation for the public booking flow.
-- Applied manually via the Supabase SQL Editor, after 004.

create or replace function create_booking(
  p_tenant_id        uuid,
  p_resource_id      uuid,
  p_service_type_id  uuid,
  p_starts_at        timestamptz,
  p_ends_at          timestamptz,
  p_customer_name    text,
  p_customer_phone   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_booking_id uuid;
begin
  insert into customers (tenant_id, name, phone)
  values (p_tenant_id, p_customer_name, p_customer_phone)
  returning id into v_customer_id;

  -- If this violates no_overlapping_bookings (someone else took the slot
  -- first), the whole function call rolls back — including the customer
  -- insert above. No orphan customer row on failure.
  insert into bookings (tenant_id, resource_id, service_type_id, customer_id, starts_at, ends_at)
  values (p_tenant_id, p_resource_id, p_service_type_id, v_customer_id, p_starts_at, p_ends_at)
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

comment on function create_booking is 'Atomic customer+booking insert for the public booking flow. Only callable via service_role (see grants below) — inserts PII and must never be reachable by anon/authenticated directly.';

revoke execute on function create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text) from public;
grant execute on function create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text) to service_role;
