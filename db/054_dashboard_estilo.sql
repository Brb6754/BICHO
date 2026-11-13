-- 054 · Estilo del panel del negocio.
--
-- El dueño escoge cómo se ve su panel: dos estilos tradicionales
-- (clasico, suave) y dos innovadores (vibrante, poster). Solo cambia la
-- piel y el acomodo del Resumen; los datos son los mismos.
--
-- Idempotente: se puede correr dos veces. El código ya funciona sin esta
-- migración (lee la columna aparte y cae a 'clasico').

alter table public.tenants
  add column if not exists dashboard_estilo text not null default 'clasico';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_dashboard_estilo_check'
  ) then
    alter table public.tenants
      add constraint tenants_dashboard_estilo_check
      check (dashboard_estilo in ('clasico', 'suave', 'vibrante', 'poster'));
  end if;
end $$;

-- El dueño la cambia desde /dashboard/marca con el cliente de cookies:
-- la policy tenants_update_owner (db/002) ya cubre la fila completa, no
-- hace falta policy nueva.
