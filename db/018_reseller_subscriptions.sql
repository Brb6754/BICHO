-- 018_reseller_subscriptions.sql
-- Stripe billing for the sales-rep network. Apply manually in the
-- Supabase SQL Editor, after 017.
--
-- WHAT IS BEING BILLED, because it is not the obvious thing: bicho
-- charges its own REPS (db/016 resellers), nobody else. It never charges
-- a business (tenants) and never charges the person booking an
-- appointment. The rep collects from the business directly, off-platform,
-- in cash or transfer — that money never touches this system, so there is
-- no Connect, no split, no marketplace and no payouts anywhere in here.
--
-- The amount is  (count of that rep's ACTIVE businesses) x their
-- wholesale price, charged monthly on resellers.billing_day. In Stripe
-- that is one ordinary subscription with a licensed (per-unit) price
-- where `quantity` is the active-business count, resynced from this
-- database whenever a business changes status or changes rep.
--
-- Every statement below is idempotent (add column if not exists, create
-- table if not exists, constraints guarded by a catalog lookup) so
-- re-running this file is always safe — same convention as db/016 and
-- db/017.

-- ============================================================
-- resellers — the Stripe identifiers live HERE, on the rep, because the
-- Stripe customer IS the rep. There is no other payer in this model.
--
-- Both ids are nullable on purpose: a rep exists in the panel long
-- before they sit down and enter a card, and has to keep working
-- (creating businesses, editing pages) the whole time. Null just means
-- "no ha puesto tarjeta", which the panel shows as a pending step rather
-- than an error.
-- ============================================================
alter table resellers
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

do $$
begin
  -- Unique, not primary. Two rep rows pointing at the same Stripe
  -- customer would double-bill one person and make the webhook's
  -- customer -> rep lookup ambiguous. Partial indexes so the many nulls
  -- (reps without payment set up yet) do not collide with each other.
  if not exists (select 1 from pg_class where relname = 'resellers_stripe_customer_id_key') then
    create unique index resellers_stripe_customer_id_key
      on resellers (stripe_customer_id) where stripe_customer_id is not null;
  end if;
  if not exists (select 1 from pg_class where relname = 'resellers_stripe_subscription_id_key') then
    create unique index resellers_stripe_subscription_id_key
      on resellers (stripe_subscription_id) where stripe_subscription_id is not null;
  end if;
end $$;

comment on column resellers.stripe_customer_id is 'Stripe Customer (cus_...). The Stripe customer IS the rep — bicho bills the rep, never the business.';
comment on column resellers.stripe_subscription_id is 'Stripe Subscription (sub_...) whose quantity is this rep ACTIVE business count. Null until they enter a card.';

-- ============================================================
-- reseller_subscriptions — the local mirror of the Stripe subscription.
--
-- Deliberately NOT the existing `payments` table. That table models a
-- different, out-of-scope flow (an end customer paying for an
-- appointment): its booking_id is NOT NULL with an FK to bookings, so a
-- reseller charge literally cannot be represented in it. Forcing it in
-- would mean making booking_id nullable, which quietly destroys the
-- guarantee that every row in `payments` belongs to a real appointment.
--
-- Why mirror Stripe at all instead of calling the API on every render:
-- the rep panel has to answer "estoy al corriente?" on a normal page
-- load, and the webhook is what keeps this row honest. Stripe stays the
-- source of truth for money; this is a read cache with an audit trail.
-- ============================================================
create table if not exists reseller_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  reseller_id              uuid not null unique references resellers(id) on delete cascade,
  stripe_subscription_id   text not null unique,
  stripe_customer_id       text not null,
  stripe_price_id          text,
  stripe_item_id           text,
  -- Stripe's own vocabulary, kept verbatim so nobody has to maintain a
  -- translation table: incomplete, incomplete_expired, trialing, active,
  -- past_due, canceled, unpaid, paused.
  status                   text not null,
  -- The quantity Stripe currently has. Always recomputed from
  -- `select count(*) from tenants where reseller_id = ... and status =
  -- 'active'` and PUT to Stripe — never incremented or decremented from
  -- this cached number, or one missed event drifts the bill forever.
  quantity                 integer not null default 0 check (quantity >= 0),
  -- Snapshot of the per-unit price in CENTAVOS at the last sync.
  -- resellers.wholesale_price_mxn is in WHOLE PESOS; MXN has ISO 4217
  -- exponent 2, so this column is that number x 100. Kept here so a later
  -- change to the rep's wholesale price is visibly a change, and so the
  -- panel can show what Stripe will actually charge.
  unit_amount_cents        integer not null default 0 check (unit_amount_cents >= 0),
  currency                 text not null default 'mxn',
  -- Mirrors resellers.billing_day -> Stripe's billing_cycle_anchor.
  billing_day              smallint check (billing_day between 1 and 28),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  canceled_at              timestamptz,
  -- Set when an invoice fails. The panel uses it to show the dunning
  -- banner without querying Stripe on every render.
  past_due_since           timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table reseller_subscriptions is 'Local mirror of each rep Stripe subscription. Stripe is the source of truth; the webhook keeps this honest. Never reuse `payments` — that table is an end customer paying for a booking (booking_id NOT NULL).';
comment on column reseller_subscriptions.quantity is 'Active-business count last sent to Stripe. Always recomputed from tenants, never incremented.';
comment on column reseller_subscriptions.unit_amount_cents is 'resellers.wholesale_price_mxn * 100 — whole pesos to centavos (MXN ISO 4217 exponent 2).';

create index if not exists reseller_subscriptions_status_idx on reseller_subscriptions(status);

-- ============================================================
-- reseller_payment_methods — the saved card, as metadata only.
--
-- Rule 12 (the PCI-DSS hard wall): there is no column here for a PAN, a
-- CVV or track data, and there never will be. The card itself lives
-- inside Stripe; what this table holds is the token (pm_...) plus the
-- four things a human needs to recognise their own card on a screen —
-- brand, last four, expiry month/year. Those are explicitly the metadata
-- a merchant is allowed to keep.
--
-- network_transaction_id is the reason this is a table rather than two
-- more columns on resellers: the card networks require the original
-- transaction's trace id on every later merchant-initiated charge (which
-- is what a renewal is). Mastercard makes it mandatory for economically
-- related MITs from 23 October 2026 and Visa already scores unlinked
-- MITs down, so a renewal without it is a decline, not a warning. Stripe
-- attaches it automatically while it owns the mandate; storing it means
-- the chain can still be proven if the card is ever migrated elsewhere.
-- ============================================================
create table if not exists reseller_payment_methods (
  id                       uuid primary key default gen_random_uuid(),
  reseller_id              uuid not null references resellers(id) on delete cascade,
  stripe_payment_method_id text not null unique,
  is_default               boolean not null default false,
  brand                    text check (char_length(brand) <= 40),
  last4                    text check (char_length(last4) <= 4),
  exp_month                smallint check (exp_month between 1 and 12),
  exp_year                 smallint check (exp_year between 2000 and 2100),
  -- The card network's trace id from the FIRST cardholder-initiated
  -- authorisation. Nullable because it does not exist until that first
  -- charge settles — it arrives on an invoice webhook, not at setup time.
  network_transaction_id   text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table reseller_payment_methods is 'Saved-card METADATA only. Rule 12: no PAN, no CVV, no track data — the card lives in Stripe, this holds the pm_ token plus brand/last4/expiry.';
comment on column reseller_payment_methods.network_transaction_id is 'Card-network trace id of the first cardholder-initiated charge, required on subsequent merchant-initiated renewals (Mastercard mandatory 2026-10-23; Visa already penalises unlinked MITs).';

create index if not exists reseller_payment_methods_reseller_idx on reseller_payment_methods(reseller_id);

-- ============================================================
-- reseller_charges — one row per Stripe invoice billed to a rep.
--
-- The audit trail the rep reads as "mis cobros" and the internal team
-- reads as "este vendedor esta al corriente?". Amounts are in CENTAVOS
-- (Stripe's unit), unlike every other money column in this schema, which
-- is in whole pesos — the `_cents` suffix is load-bearing, do not drop it.
-- ============================================================
create table if not exists reseller_charges (
  id                       uuid primary key default gen_random_uuid(),
  reseller_id              uuid not null references resellers(id) on delete cascade,
  stripe_invoice_id        text not null unique,
  stripe_payment_intent_id text,
  stripe_charge_id         text,
  -- Stripe invoice status: draft, open, paid, uncollectible, void.
  status                   text not null,
  amount_due_cents         integer not null default 0,
  amount_paid_cents        integer not null default 0,
  amount_refunded_cents    integer not null default 0,
  currency                 text not null default 'mxn',
  -- What the invoice was for, denormalised so a later price change or a
  -- business leaving this rep does not rewrite history.
  quantity                 integer,
  unit_amount_cents        integer,
  period_start             timestamptz,
  period_end               timestamptz,
  -- Stripe's own hosted receipt. Handing the rep this link is simpler
  -- and safer than rebuilding an invoice page.
  hosted_invoice_url       text,
  invoice_pdf_url          text,
  -- Set by charge.dispute.created. A disputed charge is not a refunded
  -- charge and must never be shown as one.
  disputed_at              timestamptz,
  failure_message          text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table reseller_charges is 'One row per Stripe invoice billed to a rep. Amounts in CENTAVOS (Stripe unit) — the rest of this schema uses whole pesos.';

create index if not exists reseller_charges_reseller_idx on reseller_charges(reseller_id, created_at desc);

-- ============================================================
-- webhook_events_processed — replay protection by event id.
--
-- Stripe signs a timestamp and the handler rejects anything outside the
-- 5-minute tolerance, which stops a replay from tomorrow. It does NOT
-- stop the legitimate retries Stripe itself sends when our endpoint is
-- slow or errors, and those arrive with the SAME event id. Without this
-- table one slow response turns into a second charge row, a second
-- email, a second everything. Rule 9: timestamp window AND event-id
-- dedup, not one or the other.
--
-- Rows are worth keeping ~30 days (Stripe retries for up to 3 days);
-- pruning older ones is a maintenance job, not a correctness issue.
-- ============================================================
create table if not exists webhook_events_processed (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null default 'stripe',
  event_id         text not null,
  event_type       text not null,
  -- Stripe's own `created`, not ours: the only way to reconstruct the
  -- real order of events after an outage.
  event_created_at timestamptz,
  processed_at     timestamptz not null default now(),
  unique (provider, event_id)
);

comment on table webhook_events_processed is 'Rule 9 replay protection. The unique (provider, event_id) IS the mechanism: the insert failing is the duplicate check.';

create index if not exists webhook_events_processed_processed_at_idx on webhook_events_processed(processed_at);

-- ============================================================
-- idempotency_keys — the merchant side of Rule 4.
--
-- Every mutating Stripe call sends an Idempotency-Key generated with
-- crypto.randomUUID(). Stripe deduplicates on its side for 24h; this
-- table is our own record of which key was used for which operation, so
-- a retry that never reached Stripe can be recognised here, and so an
-- incident can be reconstructed afterwards ("que llamada creo esta
-- suscripcion?").
-- ============================================================
create table if not exists idempotency_keys (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  -- e.g. 'reseller_subscription.create', 'reseller_subscription.quantity',
  -- 'reseller_charge.refund'.
  operation     text not null,
  -- The row the operation is about (a reseller id here), so a retry can
  -- find its predecessor without parsing the key.
  subject_id    uuid,
  status        text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  -- The provider object the call produced (sub_..., in_..., re_...).
  result_ref    text,
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table idempotency_keys is 'Rule 4: merchant-side record of every Idempotency-Key sent to Stripe. Keys come from crypto.randomUUID(), never from a timestamp or Math.random().';

create index if not exists idempotency_keys_subject_idx on idempotency_keys(subject_id, operation);

-- ============================================================
-- RLS — consistent with db/002 in criterion, not in shape.
--
-- db/002 grants policies exactly where anon/authenticated legitimately
-- need to reach a row (the public booking page reading tenants, a
-- business member reading their own bookings). NOTHING here is in that
-- position: these five tables describe bicho's billing relationship with
-- its reps, and the only code that touches them is server code running
-- on the service_role client after lib/auth/access.ts has already
-- decided who is asking.
--
-- So the correct policy set is the one db/006 (platform_admins) and
-- db/016 (resellers) already use: RLS ENABLED with ZERO policies, which
-- is default-deny for anon and authenticated and pass-through for
-- service_role. A rep reading their own subscription does it through a
-- Server Component that has already called requireReseller() and filters
-- by their own id — never through a request-scoped client.
--
-- This matters more here than anywhere else in the schema: a policy that
-- let `authenticated` read these tables would expose every rep's revenue
-- to every other rep.
-- ============================================================
alter table reseller_subscriptions    enable row level security;
alter table reseller_payment_methods  enable row level security;
alter table reseller_charges          enable row level security;
alter table webhook_events_processed  enable row level security;
alter table idempotency_keys          enable row level security;
-- No policies added, on purpose. Read the block above before adding one.

-- ============================================================
-- updated_at — these tables are written by a webhook, which means there
-- is nobody around to remember to touch updated_at. A trigger is the
-- only version of this that stays true.
--
-- The helper goes in the `private` schema for the same reason db/002
-- puts its RLS helpers there: PostgREST never exposes it as an endpoint.
-- ============================================================
create schema if not exists private;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'reseller_subscriptions',
    'reseller_payment_methods',
    'reseller_charges',
    'idempotency_keys'
  ] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_touch_updated_at') then
      execute format(
        'create trigger %I before update on %I for each row execute function private.touch_updated_at()',
        t || '_touch_updated_at', t
      );
    end if;
  end loop;
end $$;
