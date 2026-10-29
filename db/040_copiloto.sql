-- ============================================================
-- 040 — Copiloto del negocio.
--
-- 1. La bandera por negocio (`copiloto_enabled`), mismo patrón que
--    quotes_enabled / reuniones_enabled: apagada hasta que alguien la
--    prende.
--
-- 2. Policies de LECTURA para miembros en `quotes` y `quote_items`.
--    db/027 las dejó sin ninguna policy (solo service_role). El copiloto
--    corre sus consultas como `authenticated` con el JWT del dueño, para
--    que el aislamiento entre negocios lo haga Postgres y no un `where`
--    escrito por un modelo. Sin estas policies el copiloto vería cero
--    cotizaciones, y la única alternativa sería service_role — que es
--    justo lo que la frontera existe para no usar.
--
--    Solo SELECT. Escribir cotizaciones sigue siendo exclusivo de
--    service_role (las Server Actions del panel), igual que antes.
-- ============================================================

alter table tenants
  add column if not exists copiloto_enabled boolean not null default false;

comment on column tenants.copiloto_enabled is
  'Copiloto del negocio (chat sobre sus propios datos). Extra por negocio.';

drop policy if exists quotes_select_members on quotes;
create policy quotes_select_members
  on quotes for select
  using (private.is_member_of_tenant(tenant_id));

-- quote_items no tiene tenant_id: hereda el negocio de su cotización.
drop policy if exists quote_items_select_members on quote_items;
create policy quote_items_select_members
  on quote_items for select
  using (exists (
    select 1 from quotes q
    where q.id = quote_items.quote_id
      and private.is_member_of_tenant(q.tenant_id)
  ));

-- Prender el copiloto para el negocio de prueba.
update tenants set copiloto_enabled = true where slug = 'nova-solar';
