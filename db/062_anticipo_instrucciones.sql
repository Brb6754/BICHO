-- ============================================================
-- 062 · Cómo pagar el anticipo (fase 1, sin cobro en línea)
--
-- Idempotente. Texto libre que escribe la dueña: "Transferencia a la
-- CLABE … a nombre de …". La recepcionista se lo manda a la clienta
-- cuando aparta una cita y no hay link de pago.
--
-- Va en `tenants`, que tiene lectura pública con la llave anon
-- (tenants_select_public, db/002): es dato del negocio para recibir
-- dinero, no un secreto de bicho. El panel lo dice junto al campo.
-- ============================================================

alter table tenants add column if not exists anticipo_instrucciones text;

alter table tenants drop constraint if exists tenants_anticipo_instrucciones_check;
alter table tenants add constraint tenants_anticipo_instrucciones_check
  check (anticipo_instrucciones is null or char_length(anticipo_instrucciones) <= 500);

notify pgrst, 'reload schema';
