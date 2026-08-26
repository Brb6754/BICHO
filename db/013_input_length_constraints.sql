-- 013_input_length_constraints.sql
-- Bounds on free-text fields reachable from the public, unauthenticated
-- booking flow — nothing stopped a crafted request from sending an
-- arbitrarily large string before this. Applied manually via the
-- Supabase SQL Editor, after 012.

alter table customers
  add constraint customers_name_length check (length(name) <= 200),
  add constraint customers_email_length check (email is null or length(email) <= 200),
  add constraint customers_phone_length check (phone is null or length(phone) <= 50);

alter table bookings
  add constraint bookings_notes_length check (notes is null or length(notes) <= 1000);

alter table tenants
  add constraint tenants_description_length check (description is null or length(description) <= 2000);
