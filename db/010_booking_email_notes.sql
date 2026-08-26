-- 010_booking_email_notes.sql
-- Extends create_booking to accept the customer's email and a note,
-- both optional, for the redesigned public booking flow.
-- Applied manually via the Supabase SQL Editor, after 009.

-- Adding parameters changes the function's signature, so
-- create-or-replace can't just patch the old one in place — Postgres
-- would treat it as a new overload and leave the old 7-arg version
-- behind. Drop it explicitly first.
drop function if exists create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text);

create or replace function create_booking(
  p_tenant_id        uuid,
  p_resource_id      uuid,
  p_service_type_id  uuid,
  p_starts_at        timestamptz,
  p_ends_at          timestamptz,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_email   text default null,
  p_notes            text default null
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
  insert into customers (tenant_id, name, phone, email)
  values (p_tenant_id, p_customer_name, p_customer_phone, p_customer_email)
  returning id into v_customer_id;

  insert into bookings (tenant_id, resource_id, service_type_id, customer_id, starts_at, ends_at, notes)
  values (p_tenant_id, p_resource_id, p_service_type_id, v_customer_id, p_starts_at, p_ends_at, p_notes)
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

comment on function create_booking is 'Atomic customer+booking insert for the public booking flow. Only callable via service_role — inserts PII and must never be reachable by anon/authenticated directly.';

revoke execute on function create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text) from public;
grant execute on function create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text) to service_role;
