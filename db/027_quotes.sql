-- ============================================================
-- 027 · Cotizaciones
--
-- El segundo producto de bicho: un negocio arma una cotización en
-- treinta segundos, la manda por correo o WhatsApp, y ve cuándo el
-- cliente la abrió.
--
-- NO cobra. Se decidió a propósito (2026-10-02): en cuanto el dinero
-- pasa por una cuenta de bicho, bicho se vuelve intermediario
-- financiero. Si más adelante hay enlace de pago, cada negocio conecta
-- su propia cuenta y el cobro va directo a ellos.
--
-- Y una cotización NO ES UNA FACTURA. No hay CFDI, timbrado ni PAC
-- aquí: eso es otro producto, con su propio costo y su propia
-- responsabilidad legal. El PDF lo dice en su pie.
-- ============================================================

-- El impuesto no se adivina. 16% es el caso común en México, pero hay
-- 8% en zona fronteriza, 0% y exentos (alimentos, medicinas), y
-- retenciones cuando se le vende a una persona moral. Cada negocio fija
-- el suyo y puede cambiarlo cotización por cotización.
alter table tenants
  add column if not exists quotes_enabled boolean not null default false,
  add column if not exists tax_rate       numeric(5,2) not null default 16.00,
  add column if not exists tax_label      text not null default 'IVA',
  add column if not exists quote_terms    text;

comment on column tenants.quotes_enabled is 'Extra de cotizaciones, prendido por negocio desde el panel.';
comment on column tenants.tax_rate is 'Porcentaje por defecto. 16 = IVA general, 8 = frontera, 0 = exento.';

-- ============================================================
-- quotes — la cotización
-- ============================================================
create table if not exists quotes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,

  -- Consecutivo POR NEGOCIO, no global: el cliente de un negocio no
  -- tiene por qué deducir cuántas cotizaciones hizo bicho en total.
  folio       int  not null,

  customer_name  text not null check (length(customer_name) between 1 and 120),
  customer_email text check (customer_email is null or length(customer_email) <= 160),
  customer_phone text check (customer_phone is null or length(customer_phone) <= 40),
  notes          text check (notes is null or length(notes) <= 2000),

  -- Se congelan al crear: si el negocio sube sus precios o cambia de
  -- IVA, una cotización ya enviada no puede cambiar sola. Lo que el
  -- cliente recibió es lo que vale.
  tax_rate    numeric(5,2) not null default 16.00,
  tax_label   text not null default 'IVA',
  discount_cents int not null default 0 check (discount_cents >= 0),
  currency    text not null default 'MXN',

  valid_until date,

  status      text not null default 'draft'
              check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),

  -- Momentos, no banderas: "¿cuándo la abrió?" es la pregunta que hace
  -- que un vendedor levante el teléfono.
  sent_at     timestamptz,
  viewed_at   timestamptz,
  accepted_at timestamptz,

  created_at  timestamptz not null default now(),

  unique (tenant_id, folio)
);

create index if not exists quotes_tenant_id_idx on quotes(tenant_id, created_at desc);

-- ============================================================
-- quote_items — las partidas
-- ============================================================
create table if not exists quote_items (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references quotes(id) on delete cascade,
  position     int  not null default 0,
  description  text not null check (length(description) between 1 and 300),
  quantity     numeric(10,2) not null default 1 check (quantity > 0),
  unit         text,
  unit_price_cents int not null check (unit_price_cents >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists quote_items_quote_id_idx on quote_items(quote_id, position);

-- ============================================================
-- RLS — sin policies, igual que customers y bookings.
--
-- Una cotización lleva nombre, correo y teléfono de una persona, y
-- además los precios con los que ese negocio vende. Las dos cosas se
-- leen solo con service_role: el panel del negocio y el enlace público,
-- que filtra por el uuid de la cotización.
-- ============================================================
alter table quotes      enable row level security;
alter table quote_items enable row level security;

-- ============================================================
-- Folio consecutivo por negocio, resuelto en la base.
--
-- Calcularlo en la app (max(folio) + 1) es una condición de carrera:
-- dos vendedores cotizando al mismo tiempo generan el mismo número y
-- el unique de arriba rechaza al segundo. Aquí el lock lo pone
-- Postgres.
-- ============================================================
create or replace function next_quote_folio(p_tenant_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folio int;
begin
  select coalesce(max(folio), 0) + 1 into v_folio
  from quotes
  where tenant_id = p_tenant_id
  for update;

  return v_folio;
end;
$$;

revoke all on function next_quote_folio(uuid) from public, anon, authenticated;
grant execute on function next_quote_folio(uuid) to service_role;
