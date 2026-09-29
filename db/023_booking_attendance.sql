-- 023_booking_attendance.sql
-- Let an appointment end in something other than "confirmed forever".
--
-- The dashboard already READ a 'completed' status — AgendaList dims the
-- row and shows a check, and the customer's own page says the visit is
-- over — but nothing in the product ever WROTE it. The status column
-- had three values and the app could only ever produce two of them.
--
-- 'no_show' is new. It is deliberately NOT the same as 'cancelled':
-- cancelled means the time went back on sale, no-show means the time
-- was consumed and nobody came. Keeping them apart is the whole point —
-- it is the only way the owner can ever see who repeatedly doesn't turn
-- up, and it is why no_show is excluded from the cancellation filter on
-- no_overlapping_bookings below.
alter table bookings
  drop constraint if exists bookings_status_check;

alter table bookings
  add constraint bookings_status_check
  check (status in ('confirmed', 'cancelled', 'completed', 'no_show'));

-- The exclusion constraint already reads `where (status <> 'cancelled')`,
-- so 'completed' and 'no_show' keep holding their slot. That is correct:
-- both describe time that was actually spent, and re-selling an hour
-- that already happened would be nonsense. Nothing to change here — this
-- comment exists so the next person doesn't "fix" it.

comment on column bookings.status is
  'confirmed = on the books. cancelled = called off, slot released. completed = the customer came. no_show = the customer did not, and the slot stays consumed.';
