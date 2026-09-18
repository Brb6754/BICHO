-- 021_whatsapp_addon.sql
-- WhatsApp as a per-business add-on that can be switched on and off.
--
-- Why a switch and not a global feature: every WhatsApp template message
-- costs real money (MX$0.15–0.20 in Mexico, and from 2026-10-01 Meta also
-- charges for utility templates inside the 24h window, which used to be
-- free). A business that doesn't pay for the add-on must not generate
-- charges, and the only way to guarantee that is a flag checked before
-- anything is sent.

alter table tenants
  add column if not exists whatsapp_enabled boolean not null default false;

comment on column tenants.whatsapp_enabled is 'Add-on switch. When false, no WhatsApp message is ever sent for this tenant — checked before the API call, so a disabled tenant costs nothing.';

-- ============================================================
-- Every send, logged. This is the only way to know what the add-on
-- actually costs per business, which is what makes it billable: without
-- it, "WhatsApp" is a line on an invoice nobody can justify.
--
-- Failures are logged too (status='failed'): a template that Meta
-- rejects is silent otherwise, and silence is how a business finds out
-- weeks later that no one ever got a confirmation.
-- ============================================================
create table if not exists whatsapp_messages (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  -- Kept when the booking is deleted: the message was still sent and
  -- still cost money, so the bill has to survive the appointment.
  booking_id   uuid references bookings(id) on delete set null,

  -- Which template, so cost can be split by purpose later
  -- (confirmación vs recordatorio) without parsing message bodies.
  kind         text not null check (kind in ('confirmation', 'reminder', 'rescheduled', 'cancelled')),
  -- The E.164 number it went to. PII, hence the service-role-only policy
  -- below, same as customers.
  to_phone     text not null,
  status       text not null check (status in ('sent', 'failed', 'skipped')),
  -- Meta's message id when it accepted the send; its error when it
  -- didn't. Both are what a support question starts from.
  provider_id  text,
  error        text,
  created_at   timestamptz not null default now()
);

create index if not exists whatsapp_messages_tenant_idx
  on whatsapp_messages (tenant_id, created_at desc);

alter table whatsapp_messages enable row level security;

-- Zero policies on purpose: same pattern as platform_admins and
-- resellers. This table holds customers' phone numbers, and nothing that
-- runs with a visitor's or a staff member's session has any reason to
-- read it — the panels reach it through the service_role client only.
comment on table whatsapp_messages is 'Log of every WhatsApp send attempt, for cost attribution and debugging. RLS on with no policies: service_role only.';
