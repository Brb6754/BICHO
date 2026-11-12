-- ============================================================
-- 049 — Inventario (área: Números).
--
-- La dueña anota los productos que usa o vende (esmaltes, tintes,
-- cremas) y cada entrada, uso, venta o ajuste. La pantalla le avisa
-- cuando algo "se está acabando" (stock <= mínimo).
--
-- 1. La bandera por negocio (`inventario_enabled`), mismo patrón que
--    caja_enabled / posts_enabled: apagada hasta que alguien la prende.
--
-- 2. `inventario_productos.stock` se GUARDA (no se suma al leer) y solo
--    lo cambia `inventario_mover(...)`, que en una sola transacción
--    bloquea la fila del producto (`for update`), calcula el stock
--    nuevo, escribe el movimiento y actualiza el producto. Dos personas
--    anotando a la vez se forman en fila en vez de pisarse, y un
--    "ajuste" (contar el estante: "hay 7") se convierte en la diferencia
--    exacta contra el stock de ese instante. Con stock derivado de la
--    suma, el ajuste tendría que calcular esa diferencia en la app y
--    ahí sí habría carrera. `stock >= 0` es la última cerradura.
--
-- 3. Una venta puede anotarse también en Caja (db/045) dentro de la
--    misma transacción: o quedan las dos, o ninguna.
--
-- Cantidades con 2 decimales (medio litro de tinte). Montos en
-- centavos, como el resto del proyecto. Idempotente.
-- ============================================================

alter table tenants
  add column if not exists inventario_enabled boolean not null default false;

comment on column tenants.inventario_enabled is
  'Inventario (productos, entradas, usos, ventas y alerta de stock bajo). Módulo extra por negocio.';

create table if not exists inventario_productos (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  nombre        text not null check (char_length(nombre) between 1 and 80),
  unidad        text not null default 'pieza' check (char_length(unidad) between 1 and 20),
  stock         numeric(12,2) not null default 0 check (stock >= 0),
  stock_minimo  numeric(12,2) not null default 0 check (stock_minimo >= 0),
  costo_cents   integer check (costo_cents is null or (costo_cents >= 0 and costo_cents <= 1000000000)),
  precio_cents  integer check (precio_cents is null or (precio_cents >= 0 and precio_cents <= 1000000000)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists inventario_productos_tenant_idx on inventario_productos(tenant_id, nombre);

create table if not exists inventario_movimientos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  producto_id     uuid not null references inventario_productos(id) on delete cascade,
  tipo            text not null check (tipo in ('entrada', 'uso', 'venta', 'ajuste')),
  -- Con signo: lo que el movimiento le sumó o restó al stock.
  cantidad        numeric(12,2) not null,
  stock_despues   numeric(12,2) not null,
  -- El día del negocio (su zona horaria), igual que caja_movimientos.
  dia             date not null,
  nota            text not null default '' check (char_length(nota) <= 200),
  created_at      timestamptz not null default now()
);

create index if not exists inventario_movimientos_tenant_idx
  on inventario_movimientos(tenant_id, created_at desc);
create index if not exists inventario_movimientos_producto_idx
  on inventario_movimientos(producto_id, created_at desc);

-- RLS por tenant_id, igual que db/045. Las Server Actions escriben con
-- service_role tras `requireTenantStaff`; estas policies son la segunda
-- cerradura (y dejan leer al Resumen con el JWT del dueño).
alter table inventario_productos enable row level security;
alter table inventario_movimientos enable row level security;

drop policy if exists inventario_productos_members_all on inventario_productos;
create policy inventario_productos_members_all
  on inventario_productos for all
  using (private.is_member_of_tenant(tenant_id))
  with check (private.is_member_of_tenant(tenant_id));

drop policy if exists inventario_movimientos_members_all on inventario_movimientos;
create policy inventario_movimientos_members_all
  on inventario_movimientos for all
  using (private.is_member_of_tenant(tenant_id))
  with check (private.is_member_of_tenant(tenant_id));

-- ------------------------------------------------------------
-- inventario_mover: la ÚNICA forma de cambiar el stock.
--
--   entrada → suma p_cantidad      uso / venta → resta p_cantidad
--   ajuste  → p_cantidad es lo que hay AHORA (el conteo)
--
-- p_caja_cents (solo venta): si viene, anota la venta en
-- caja_movimientos en la misma transacción.
--
-- SECURITY INVOKER y ejecutable solo por service_role: la llama la
-- Server Action después de `requireTenantStaff`, nunca el navegador.
-- El tenant se vuelve a comprobar aquí contra el producto.
-- ------------------------------------------------------------
create or replace function inventario_mover(
  p_tenant       uuid,
  p_producto     uuid,
  p_tipo         text,
  p_cantidad     numeric,
  p_dia          date,
  p_nota         text default '',
  p_caja_cents   integer default null,
  p_caja_metodo  text default 'efectivo'
) returns numeric
language plpgsql
set search_path = public
as $$
declare
  v_stock   numeric(12,2);
  v_nombre  text;
  v_delta   numeric(12,2);
  v_nuevo   numeric(12,2);
begin
  if p_tipo not in ('entrada', 'uso', 'venta', 'ajuste') then
    raise exception 'inventario: tipo inválido' using errcode = '22023';
  end if;
  if p_cantidad is null or p_cantidad < 0 or (p_tipo <> 'ajuste' and p_cantidad = 0) then
    raise exception 'inventario: cantidad inválida' using errcode = '22023';
  end if;

  select stock, nombre into v_stock, v_nombre
  from inventario_productos
  where id = p_producto and tenant_id = p_tenant
  for update;
  if not found then
    raise exception 'inventario: producto no encontrado' using errcode = 'P0002';
  end if;

  v_delta := case p_tipo
    when 'entrada' then p_cantidad
    when 'ajuste' then p_cantidad - v_stock
    else -p_cantidad
  end;
  v_nuevo := v_stock + v_delta;
  if v_nuevo < 0 then
    -- El mensaje lo lee la app (lib/inventario/logica.ts) para decir cuánto hay.
    raise exception 'inventario: stock insuficiente (%)', v_stock using errcode = 'P0001';
  end if;

  update inventario_productos set stock = v_nuevo, updated_at = now() where id = p_producto;

  insert into inventario_movimientos (tenant_id, producto_id, tipo, cantidad, stock_despues, dia, nota)
  values (p_tenant, p_producto, p_tipo, v_delta, v_nuevo, p_dia, left(coalesce(p_nota, ''), 200));

  if p_caja_cents is not null and p_tipo = 'venta' then
    insert into caja_movimientos (tenant_id, tipo, concepto, monto_cents, metodo, dia)
    values (
      p_tenant, 'venta',
      left(v_nombre || ' x' || trim(trailing '.' from trim(trailing '0' from p_cantidad::numeric(12,2)::text)), 120),
      p_caja_cents, p_caja_metodo, p_dia
    );
  end if;

  return v_nuevo;
end;
$$;

revoke all on function inventario_mover(uuid, uuid, text, numeric, date, text, integer, text) from public, anon, authenticated;
grant execute on function inventario_mover(uuid, uuid, text, numeric, date, text, integer, text) to service_role;

-- Prendido en los negocios de demostración (lib/domains.ts DEMO_SLUGS).
update tenants set inventario_enabled = true
where slug in (
  'dental-nova', 'casa-luma', 'alto-padel', 'mesa-doce', 'agua-serena',
  'hierro-monte', 'clinica-alameda', 'don-ramon', 'lima-laca',
  'burbujas-bigotes', 'casa-norte'
);
