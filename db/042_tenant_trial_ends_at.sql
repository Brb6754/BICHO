-- 042_tenant_trial_ends_at.sql
-- Alta sin Bruno: un dueño que se registra solo en /registro arranca con
-- 15 días de prueba. Hasta hoy "trial" era solo un estado sin fecha; esta
-- columna es la marca de cuándo se acaba. Nada la hace cumplir todavía
-- (el cobro es otra tarea): es el dato que ese trabajo va a leer.
--
-- Nullable a propósito: los negocios que ya existen (demos, los que dio
-- de alta Bruno o un vendedor) no tienen una fecha real de fin de
-- prueba, e inventársela con un backfill sería peor que dejarla vacía.
--
-- El código de /registro tolera que esta migración no se haya corrido:
-- si la columna no existe, crea el negocio sin la fecha.
alter table tenants
  add column if not exists trial_ends_at timestamptz;

comment on column tenants.trial_ends_at is 'Fin de la prueba gratis (15 días desde el registro propio en /registro). Null = sin fecha de prueba (negocios creados a mano). Todavía no bloquea nada.';
