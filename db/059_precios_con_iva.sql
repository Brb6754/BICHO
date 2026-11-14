-- 059 · Precios con IVA incluido.
--
-- Los precios del catálogo de los negocios YA traen el IVA. Hasta ahora
-- las cotizaciones lo sumaban encima ($1,160 salía en $1,345.60).
--
-- tenants.precios_incluyen_iva: lo decide el dueño (/dashboard/cotizaciones).
-- quotes.prices_include_tax: se CONGELA al crear la cotización, igual que
-- tax_rate. Las existentes quedan en false para que sigan sumando como se
-- emitieron; las nuevas toman el valor del negocio.
--
-- Idempotente. El código funciona sin esta migración: lee las columnas
-- aparte y trata al negocio como "precios con IVA" (true).

alter table public.tenants
  add column if not exists precios_incluyen_iva boolean not null default true;

alter table public.quotes
  add column if not exists prices_include_tax boolean not null default false;

-- El update del dueño va por tenants_update_owner (db/002): no hace falta policy nueva.
