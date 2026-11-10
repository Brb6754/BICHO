-- 044_tenant_billing_mercadopago.sql
-- Cobro del plan mensual ($300 MXN) a cada negocio con una suscripción
-- (preapproval) de Mercado Pago. Requiere db/042 (trial_ends_at).
--
-- PENDIENTE DE CORRER A MANO en el SQL Editor. Idempotente.
--
-- El estado de acceso (prueba / gracia / pausa / activo) NO se guarda:
-- lo calcula lib/billing/trial.ts a partir de status, trial_ends_at y
-- past_due_since. Así un reloj que avanza no necesita un cron.

alter table tenants
  add column if not exists mp_preapproval_id text,
  -- Estado tal cual lo reporta MP (pending/authorized/paused/cancelled),
  -- solo para mostrarlo y depurar. Lo que bloquea es past_due_since.
  add column if not exists mp_subscription_status text,
  -- Cuándo falló el cobro o se canceló la suscripción de un negocio
  -- activo. Desde aquí corren los 3 días de gracia. Null = al corriente.
  add column if not exists past_due_since timestamptz;

create unique index if not exists tenants_mp_preapproval_id_key
  on tenants(mp_preapproval_id) where mp_preapproval_id is not null;

comment on column tenants.mp_preapproval_id is 'Suscripción (preapproval) vigente de Mercado Pago. external_reference del preapproval = tenants.id.';
comment on column tenants.past_due_since is 'Inicio de la gracia de 3 días por cobro fallido/cancelado. Null = al corriente.';

-- Deduplicación de webhooks. Misma tabla que db/018 (Stripe); se crea
-- aquí también por si 018 no se ha corrido. provider = 'mercadopago'.
create table if not exists webhook_events_processed (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null default 'stripe',
  event_id         text not null,
  event_type       text not null,
  event_created_at timestamptz,
  processed_at     timestamptz not null default now(),
  unique (provider, event_id)
);

-- RLS encendido y cero policies: solo service_role (el webhook) la toca.
alter table webhook_events_processed enable row level security;
