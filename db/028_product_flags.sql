-- ============================================================
-- 028 · Qué productos tiene contratado cada negocio
--
-- bicho deja de ser un producto y pasa a ser dos:
--
--   reservas      la página de citas y la agenda
--   cotizaciones  armar, mandar y seguir cotizaciones
--
-- Un negocio puede tener uno, el otro o los dos, y el panel se arma
-- según eso. `quotes_enabled` ya existe (db/027); esta migración agrega
-- su espejo.
--
-- `reservas_enabled` arranca en TRUE a propósito: todos los negocios
-- que existen hoy contrataron reservas, y un default en false los
-- dejaría a todos con el panel vacío en el instante en que se corra
-- esto. Una migración nunca debe apagarle el producto a quien ya lo
-- está usando.
-- ============================================================

alter table tenants
  add column if not exists reservas_enabled boolean not null default true;

comment on column tenants.reservas_enabled is
  'Producto de citas. En false, el panel esconde agenda/servicios/horario y la página pública de reservas deja de existir.';

-- Por si 027 no se corrió todavía: estas columnas son las que el panel
-- necesita para decidir qué enseñar, y pedirlas dos veces no hace daño.
alter table tenants
  add column if not exists quotes_enabled boolean not null default false;
