-- 024_tenant_labels.sql
-- Two words the product had hardcoded for every business on it.
--
-- `resource_label` is what the booking flow calls the thing you pick in
-- the "¿con quién?" step. It said "Profesional" to everyone, which is
-- right for a salon, odd for a dental clinic and simply wrong for a
-- padel court — where the resource is a court, not a person, and the
-- question is "¿en cuál?". BookingFlow has accepted a resourceLabel
-- prop all along; nothing was ever able to set it, so the default was
-- the only value that existed.
--
-- `location` is the address shown on the confirmation page and in the
-- reminder — "where do I go". The page builder has a Location block,
-- but that only covers businesses whose owner built a page with it;
-- the appointment itself had nowhere to read an address from.
--
-- Both nullable: a business that sets neither keeps exactly today's
-- behaviour, so this migration cannot change what any existing tenant
-- looks like.
alter table tenants
  add column if not exists resource_label text,
  add column if not exists location       text;

-- Lengths in the same spirit as 013_input_length_constraints: these are
-- rendered into a sentence, so an unbounded value is a layout bug
-- waiting to happen, not just a storage question.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_resource_label_len'
  ) then
    alter table tenants add constraint tenants_resource_label_len
      check (resource_label is null or char_length(resource_label) between 1 and 40);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tenants_location_len'
  ) then
    alter table tenants add constraint tenants_location_len
      check (location is null or char_length(location) between 1 and 200);
  end if;
end $$;

comment on column tenants.resource_label is
  'What this business calls a bookable resource, singular: "Profesional", "Doctor", "Cancha", "Mesa". Null falls back to "Profesional".';
comment on column tenants.location is
  'Street address shown on the confirmation page and in reminders. Null hides that line entirely.';
