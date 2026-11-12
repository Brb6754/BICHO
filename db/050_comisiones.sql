-- ============================================================
-- 050 — Comisiones por empleado.
--
-- La dueña pone un % de comisión a cada persona de "Quién atiende"
-- (`resources`) y el panel le dice, por periodo, cuánto vendió cada
-- quien (citas completadas × precio del servicio) y cuánto le toca.
--
-- 1. La bandera por negocio (`comisiones_enabled`), mismo patrón que
--    caja_enabled / posts_enabled: apagada hasta que alguien la prende.
--
-- 2. `comision_tasas`: el % por persona. Tabla aparte y NO una columna
--    en `resources`, porque `resources` tiene lectura pública (db/002,
--    decisión #4) y el % de cada empleada no es asunto del cliente.
--    Se guarda en puntos base (12.5% = 1250): enteros, sin floats.
--    shortcut: solo % por persona, sin % distinto por servicio; si se
--    pide, va en otra tabla (resource_id, service_type_id, pct_bp).
--
-- 3. `comision_pagos`: historial de pagos. Cada fila congela lo que se
--    pagó (citas, vendido, %, comisión) para que cambiar el % después
--    no reescriba el pasado. Un periodo exacto (desde, hasta) se paga
--    una sola vez por persona (índice único).
--
-- Montos en centavos, como el resto del proyecto. Idempotente.
-- ============================================================

alter table tenants
  add column if not exists comisiones_enabled boolean not null default false;

comment on column tenants.comisiones_enabled is
  'Comisiones por empleado (% por persona, cálculo por periodo e historial de pagos). Módulo extra por negocio.';

create table if not exists comision_tasas (
  resource_id  uuid primary key references resources(id) on delete cascade,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  pct_bp       integer not null check (pct_bp >= 0 and pct_bp <= 10000),
  updated_at   timestamptz not null default now()
);

create index if not exists comision_tasas_tenant_idx on comision_tasas(tenant_id);

create table if not exists comision_pagos (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  resource_id         uuid not null references resources(id) on delete cascade,
  desde               date not null,
  hasta               date not null,
  citas               integer not null check (citas >= 0),
  vendido_cents       integer not null check (vendido_cents >= 0),
  pct_bp              integer not null check (pct_bp >= 0 and pct_bp <= 10000),
  comision_cents      integer not null check (comision_cents >= 0),
  -- El gasto en Caja (db/045) si se registró ahí. Sin FK a propósito:
  -- un negocio sin Caja (o sin db/045) también paga comisiones.
  caja_movimiento_id  uuid,
  created_by          uuid,
  created_at          timestamptz not null default now(),

  constraint comision_pagos_rango check (hasta >= desde)
);

create unique index if not exists comision_pagos_periodo_uidx
  on comision_pagos(tenant_id, resource_id, desde, hasta);
create index if not exists comision_pagos_tenant_idx
  on comision_pagos(tenant_id, created_at desc);

-- RLS por tenant_id, igual que db/045. Las Server Actions escriben con
-- service_role tras `requireTenantStaff`; estas policies son la segunda
-- cerradura.
alter table comision_tasas enable row level security;
alter table comision_pagos enable row level security;

drop policy if exists comision_tasas_members_all on comision_tasas;
create policy comision_tasas_members_all
  on comision_tasas for all
  using (private.is_member_of_tenant(tenant_id))
  with check (private.is_member_of_tenant(tenant_id));

drop policy if exists comision_pagos_members_all on comision_pagos;
create policy comision_pagos_members_all
  on comision_pagos for all
  using (private.is_member_of_tenant(tenant_id))
  with check (private.is_member_of_tenant(tenant_id));

-- Prendido en los negocios de demostración (lib/domains.ts DEMO_SLUGS).
update tenants set comisiones_enabled = true
where slug in (
  'dental-nova', 'casa-luma', 'alto-padel', 'mesa-doce', 'agua-serena',
  'hierro-monte', 'clinica-alameda', 'don-ramon', 'lima-laca',
  'burbujas-bigotes', 'casa-norte'
);
