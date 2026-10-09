-- ============================================================
-- 033 · Datos fiscales — cimientos del módulo de facturación
--
-- Primera pieza de facturar dentro de bicho. Todavía no emite nada:
-- guarda lo que un CFDI 4.0 exige saber ANTES de poder timbrarse, que
-- hoy no existe en ninguna tabla.
--
-- EMISOR (el negocio) y RECEPTOR (su cliente) son dos juegos distintos
-- de datos y viven en tablas distintas a propósito:
--
--   · El emisor es uno por negocio y casi nunca cambia → `tenants`.
--   · El receptor cambia en cada venta, y el MISMO cliente puede pedir
--     factura con datos distintos (a su nombre o al de su empresa) →
--     se congela en la cotización, igual que ya se congela la tasa de
--     impuesto. Lo que el cliente dio cuando compró es lo que vale,
--     aunque luego actualice su constancia.
--
-- LO QUE ESTA MIGRACIÓN NO HACE, Y ES DELIBERADO: no guarda el
-- certificado de sello digital. Quien custodia el sello de un negocio
-- custodia su capacidad de facturar a su nombre, y eso es una
-- responsabilidad legal que no queremos. El sello se queda del lado del
-- PAC, que para eso está autorizado.
--
-- Las claves de régimen y uso de CFDI son catálogos del SAT. Se guardan
-- como texto corto y SIN check constraint: el SAT los actualiza, y una
-- restricción en la base obligaría a una migración cada vez que agregan
-- una clave. La validación real la hace el PAC al timbrar, que es quien
-- tiene el catálogo vigente.
-- ============================================================

alter table tenants
  add column if not exists fiscal_rfc            text,
  add column if not exists fiscal_razon_social   text,
  add column if not exists fiscal_regimen        text,
  add column if not exists fiscal_codigo_postal  text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tenants_fiscal_rfc_len') then
    -- 12 para persona moral, 13 para física. Sin validar el formato
    -- completo aquí: el PAC lo rechaza con un mensaje mejor del que
    -- podría dar un check constraint.
    alter table tenants add constraint tenants_fiscal_rfc_len
      check (fiscal_rfc is null or length(fiscal_rfc) between 12 and 13);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tenants_fiscal_cp_len') then
    alter table tenants add constraint tenants_fiscal_cp_len
      check (fiscal_codigo_postal is null or length(fiscal_codigo_postal) = 5);
  end if;
end $$;

-- Receptor, congelado en la cotización.
alter table quotes
  add column if not exists receptor_rfc           text,
  add column if not exists receptor_razon_social  text,
  add column if not exists receptor_regimen       text,
  add column if not exists receptor_codigo_postal text,
  add column if not exists receptor_uso_cfdi      text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quotes_receptor_rfc_len') then
    alter table quotes add constraint quotes_receptor_rfc_len
      check (receptor_rfc is null or length(receptor_rfc) between 12 and 13);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quotes_receptor_cp_len') then
    alter table quotes add constraint quotes_receptor_cp_len
      check (receptor_codigo_postal is null or length(receptor_codigo_postal) = 5);
  end if;
end $$;

comment on column tenants.fiscal_rfc is
  'RFC del negocio que emite. El certificado de sello digital NO se guarda aquí ni en ninguna tabla: vive del lado del PAC.';
comment on column quotes.receptor_rfc is
  'Datos fiscales de quien pide la factura, congelados al momento de la venta — igual que tax_rate.';
