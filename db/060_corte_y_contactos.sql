-- ============================================================
-- 060 — Corte de caja y "Ya le escribiste" en la base.
--
-- Hasta ahora las dos cosas vivían en el localStorage del teléfono: si
-- la dueña hacía el corte en el celular y lo revisaba en la compu, no
-- aparecía; si su recepcionista ya le había escrito a una clienta, ella
-- no lo sabía.
--
-- 1. `caja_cortes`: un renglón por negocio y día. Con qué abrió el
--    cajón (fondo) y cuánto contó al cerrar. El resultado (cuadra /
--    sobran / faltan) se calcula al leer contra los movimientos, igual
--    que hoy.
-- 2. `regresan_contactos`: a qué clienta ya se le escribió y cuándo.
--    `clave` es la misma llave que arma lib/regresan (no un FK: puede
--    venir de un teléfono o de un cliente). La pantalla ignora las de
--    más de 30 días.
--
-- Idempotente: se puede correr dos veces. RLS por tenant_id igual que
-- db/002 y db/045: solo miembros del negocio. Las Server Actions
-- escriben con service_role tras requireTenantStaff y filtran por
-- tenant_id; las policies son la segunda cerradura.
--
-- El código tolera que esta migración no esté corrida: si la tabla no
-- existe, sigue usando el localStorage como antes.
-- ============================================================

create table if not exists caja_cortes (
  tenant_id      uuid not null references tenants(id) on delete cascade,
  dia            date not null,
  fondo_cents    integer check (fondo_cents is null or (fondo_cents >= 0 and fondo_cents <= 1000000000)),
  contado_cents  integer check (contado_cents is null or (contado_cents >= 0 and contado_cents <= 1000000000)),
  updated_at     timestamptz not null default now(),
  primary key (tenant_id, dia)
);

create table if not exists regresan_contactos (
  tenant_id      uuid not null references tenants(id) on delete cascade,
  clave          text not null check (char_length(clave) between 1 and 200),
  contactado_at  timestamptz not null default now(),
  primary key (tenant_id, clave)
);

create index if not exists regresan_contactos_tenant_fecha_idx
  on regresan_contactos(tenant_id, contactado_at desc);

-- ── RLS: caja_cortes ─────────────────────────────────────────
alter table caja_cortes enable row level security;

drop policy if exists caja_cortes_select_members on caja_cortes;
create policy caja_cortes_select_members
  on caja_cortes for select
  using (private.is_member_of_tenant(tenant_id));

drop policy if exists caja_cortes_insert_members on caja_cortes;
create policy caja_cortes_insert_members
  on caja_cortes for insert
  with check (private.is_member_of_tenant(tenant_id));

drop policy if exists caja_cortes_update_members on caja_cortes;
create policy caja_cortes_update_members
  on caja_cortes for update
  using (private.is_member_of_tenant(tenant_id))
  with check (private.is_member_of_tenant(tenant_id));

drop policy if exists caja_cortes_delete_members on caja_cortes;
create policy caja_cortes_delete_members
  on caja_cortes for delete
  using (private.is_member_of_tenant(tenant_id));

-- ── RLS: regresan_contactos ──────────────────────────────────
alter table regresan_contactos enable row level security;

drop policy if exists regresan_contactos_select_members on regresan_contactos;
create policy regresan_contactos_select_members
  on regresan_contactos for select
  using (private.is_member_of_tenant(tenant_id));

drop policy if exists regresan_contactos_insert_members on regresan_contactos;
create policy regresan_contactos_insert_members
  on regresan_contactos for insert
  with check (private.is_member_of_tenant(tenant_id));

drop policy if exists regresan_contactos_update_members on regresan_contactos;
create policy regresan_contactos_update_members
  on regresan_contactos for update
  using (private.is_member_of_tenant(tenant_id))
  with check (private.is_member_of_tenant(tenant_id));

drop policy if exists regresan_contactos_delete_members on regresan_contactos;
create policy regresan_contactos_delete_members
  on regresan_contactos for delete
  using (private.is_member_of_tenant(tenant_id));
