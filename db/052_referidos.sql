-- ============================================================
-- 052 · Referidos
--
-- Cada negocio comparte https://bichomx.com/registro?ref={slug}. El
-- código ES el slug: ya es público (es su subdominio), único y nadie lo
-- cambia después del alta, así que no hace falta otra columna.
--
-- UNA FILA POR NEGOCIO REFERIDO, y es a la vez el "referred_by" y el
-- crédito: la PK sobre referred_tenant_id hace que un negocio tenga
-- un solo referidor y gane a lo más un mes para él. Va en tabla aparte
-- y no como columna de `tenants` porque `tenants` tiene lectura
-- pública y quién refirió a quién no es asunto de nadie más.
--
-- El referidor ve solo el nombre del negocio y si ya pagó: nada de
-- correos ni teléfonos (esos viven en tenant_owner_contacts / auth).
--
-- Escriben solo /registro y el webhook de Mercado Pago (service_role).
-- PENDIENTE DE CORRER A MANO en el SQL Editor. Idempotente.
-- ============================================================

create table if not exists referrals (
  referred_tenant_id uuid primary key references tenants(id) on delete cascade,
  referrer_tenant_id uuid not null references tenants(id) on delete cascade,
  referred_name      text not null,
  created_at         timestamptz not null default now(),
  -- Primer pago del referido. Se marca con un UPDATE ... WHERE
  -- first_paid_at IS NULL: solo un aviso del webhook lo gana.
  first_paid_at      timestamptz,
  -- none: aún no paga. applied: se le sumaron 30 días de prueba al
  -- referidor. pending: el referidor ya paga por MP, Bruno lo aplica a
  -- mano y lo marca done.
  credit_status      text not null default 'none'
    check (credit_status in ('none', 'applied', 'pending', 'done')),
  credit_applied_at  timestamptz,
  check (referrer_tenant_id <> referred_tenant_id)
);

create index if not exists referrals_referrer_idx on referrals(referrer_tenant_id);

alter table referrals enable row level security;

drop policy if exists referrals_select_referrer on referrals;
create policy referrals_select_referrer on referrals
  for select using (private.is_member_of_tenant(referrer_tenant_id));

comment on table referrals is 'Negocio referido -> referidor + estado del mes gratis. Escribe solo service_role.';
