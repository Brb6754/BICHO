-- ============================================================
-- 032 · Qué servicios da cada recurso
--
-- Hasta hoy cualquier recurso podía dar cualquier servicio, y eso es
-- falso en casi todos los negocios reales: Renata pinta pero no corta,
-- la cabina grande es la única con mesa doble, la cancha 1 es la única
-- techada. Sin esto, la página ofrece horarios que el negocio no puede
-- cumplir — y una cita que hay que cancelar a mano cuesta más que no
-- haberla tomado.
--
-- LA DECISIÓN QUE ORDENA TODO: tabla vacía = hace de todo.
--
-- Un recurso SIN filas aquí sigue ofreciendo todos los servicios, igual
-- que hoy. Si la ausencia de filas significara "no hace nada", esta
-- migración le apagaría la agenda a todos los negocios que ya existen en
-- el instante en que se corre. Se restringe solo a quien se moleste en
-- marcar sus casillas, que además es exactamente lo que quiere decir
-- una lista vacía en la cabeza de quien la ve.
--
-- Por eso tampoco hay backfill: no hace falta.
-- ============================================================

create table if not exists resource_services (
  resource_id     uuid not null references resources(id) on delete cascade,
  service_type_id uuid not null references service_types(id) on delete cascade,
  -- Denormalizado a propósito: las policies de RLS de este proyecto
  -- comparan contra `tenant_id` en la propia fila (private.is_member_of_tenant),
  -- y sin la columna cada chequeo tendría que salir a buscar el recurso.
  tenant_id       uuid not null references tenants(id) on delete cascade,
  created_at      timestamptz not null default now(),

  primary key (resource_id, service_type_id)
);

create index if not exists resource_services_tenant_idx on resource_services (tenant_id);
create index if not exists resource_services_service_idx on resource_services (service_type_id);

alter table resource_services enable row level security;

-- Lectura pública: la página de reservas necesita saber, sin sesión, qué
-- recurso puede dar el servicio que el visitante eligió. No hay nada
-- sensible aquí — son dos ids del mismo catálogo que ya es público.
create policy resource_services_select_public
  on resource_services for select
  using (true);

create policy resource_services_insert_members
  on resource_services for insert
  with check (private.is_member_of_tenant(tenant_id));

create policy resource_services_delete_members
  on resource_services for delete
  using (private.is_member_of_tenant(tenant_id));

comment on table resource_services is
  'Qué servicios puede dar cada recurso. Un recurso SIN filas aquí los da todos — la ausencia de restricción es la restricción vacía, no la prohibición total.';
