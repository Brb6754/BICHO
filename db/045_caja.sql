-- ============================================================
-- 045 — Caja (área: Números).
--
-- Le dice al dueño cuánto vendió, cuánto gastó y cuánto le quedó, sin
-- que sepa contabilidad.
--
-- 1. La bandera por negocio (`caja_enabled`), mismo patrón que
--    quotes_enabled / reuniones_enabled / copiloto_enabled: apagada
--    hasta que alguien la prende.
--
-- 2. `caja_movimientos`: ventas manuales y gastos. Las ventas de citas
--    NO se copian aquí: se calculan al leer desde las citas
--    `completed` (precio del servicio). Solo cuando el dueño edita o
--    quita una de esas ventas se guarda una fila con `booking_id`, que
--    gana sobre el cálculo. Así una cita completada nunca queda sin
--    venta por un trigger que faltó, ni contada dos veces.
--
-- Montos en centavos, como el resto del proyecto.
-- ============================================================

alter table tenants
  add column if not exists caja_enabled boolean not null default false;

comment on column tenants.caja_enabled is
  'Caja (ventas, gastos, utilidad y corte del día). Módulo extra por negocio.';

create table if not exists caja_movimientos (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  tipo         text not null check (tipo in ('venta', 'gasto')),
  concepto     text not null default '' check (char_length(concepto) <= 120),
  monto_cents  integer not null check (monto_cents >= 0 and monto_cents <= 1000000000),
  metodo       text not null default 'efectivo' check (metodo in ('efectivo', 'tarjeta', 'transferencia')),
  categoria    text check (categoria in ('renta', 'productos', 'sueldos', 'servicios', 'otro')),
  -- El día del negocio (su zona horaria) en que pasó, no un instante:
  -- "lo de hoy" se agrupa por este campo.
  dia          date not null,
  -- Solo para ventas de citas editadas o quitadas por el dueño.
  booking_id   uuid references bookings(id) on delete cascade,
  anulada      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint caja_gasto_con_categoria check (tipo <> 'gasto' or categoria is not null),
  constraint caja_booking_es_venta check (booking_id is null or tipo = 'venta')
);

create index if not exists caja_movimientos_tenant_dia_idx on caja_movimientos(tenant_id, dia);
create unique index if not exists caja_movimientos_booking_uidx
  on caja_movimientos(booking_id) where booking_id is not null;

-- RLS por tenant_id, igual que db/002. Las Server Actions escriben con
-- service_role tras `requireTenantStaff`; estas policies son la segunda
-- cerradura (y dejan leer al copiloto con el JWT del dueño).
alter table caja_movimientos enable row level security;

drop policy if exists caja_movimientos_select_members on caja_movimientos;
create policy caja_movimientos_select_members
  on caja_movimientos for select
  using (private.is_member_of_tenant(tenant_id));

drop policy if exists caja_movimientos_insert_members on caja_movimientos;
create policy caja_movimientos_insert_members
  on caja_movimientos for insert
  with check (private.is_member_of_tenant(tenant_id));

drop policy if exists caja_movimientos_update_members on caja_movimientos;
create policy caja_movimientos_update_members
  on caja_movimientos for update
  using (private.is_member_of_tenant(tenant_id))
  with check (private.is_member_of_tenant(tenant_id));

drop policy if exists caja_movimientos_delete_members on caja_movimientos;
create policy caja_movimientos_delete_members
  on caja_movimientos for delete
  using (private.is_member_of_tenant(tenant_id));
