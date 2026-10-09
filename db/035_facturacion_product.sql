-- ============================================================
-- 035 · Facturación como producto aparte
--
-- Tercer módulo de bicho, al lado de reservas y cotizaciones, y se
-- contrata igual: un interruptor por negocio desde el panel interno o
-- el del vendedor.
--
-- Default FALSE, como quotes_enabled y al revés que reservas_enabled.
-- La razón es la misma: reservas existía antes que el concepto de
-- "producto", así que su ausencia significa "sí"; facturación nace
-- después, y nadie la tiene hasta que alguien la vende.
--
-- Y aquí el default importa más que en los otros dos: facturar emite
-- documentos fiscales a nombre del negocio. Un módulo así nunca debe
-- llegar encendido por omisión.
-- ============================================================

alter table tenants
  add column if not exists facturacion_enabled boolean not null default false;

comment on column tenants.facturacion_enabled is
  'Si el negocio contrató el módulo de facturación. El enlace con Facturapi vive aparte, en tenant_billing_credentials.';
