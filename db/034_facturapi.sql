-- ============================================================
-- 034 · Facturación con Facturapi
--
-- Modelo: una ORGANIZACIÓN de Facturapi por negocio. El negocio sube su
-- certificado de sello digital del lado de Facturapi, y bicho guarda
-- solo el id de su organización y la llave con la que se timbra a su
-- nombre.
--
-- Esto mueve la custodia, no la elimina, y conviene tenerlo claro:
-- bicho NO guarda el sello —eso sería custodiar la identidad fiscal del
-- negocio— pero sí guarda una llave que puede emitir a su nombre. La
-- diferencia real es que una llave se revoca desde el panel de
-- Facturapi en un clic y un sello comprometido se tramita de nuevo ante
-- el SAT.
--
-- POR QUÉ UNA TABLA APARTE Y NO DOS COLUMNAS EN `tenants`.
--
-- `tenants` tiene lectura PÚBLICA (`tenants_select_public`, db/002):
-- la página de reservas la consulta sin sesión, con la llave anon, que
-- viaja en el navegador de cualquier visitante. Una llave de facturación
-- ahí sería una llave publicada. Esta tabla sigue el patrón de
-- `platform_admins` y `resellers`: RLS encendido y CERO policies, así
-- que solo `service_role` la toca — nunca el cliente del navegador.
-- ============================================================

create table if not exists tenant_billing_credentials (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  provider        text not null default 'facturapi',
  organization_id text,
  -- Llave de la organización. Secreta: ver el bloque de arriba.
  api_key         text,
  -- Modo de pruebas de Facturapi: timbra facturas que NO tienen efectos
  -- fiscales. Arranca en true a propósito — un negocio mal configurado
  -- debe emitir basura inofensiva, no un CFDI real que luego haya que
  -- cancelar ante el SAT.
  live            boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table tenant_billing_credentials enable row level security;
-- Sin policies a propósito: solo service_role.

-- ── Las facturas emitidas ───────────────────────────────────────────
--
-- Guarda el resultado del timbrado, no el CFDI: el XML y el PDF los
-- sirve Facturapi y son la copia buena. Aquí vive lo que bicho necesita
-- para enseñar la lista, buscar, y saber qué se facturó de qué.
create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  -- De dónde salió. Las dos son opcionales: se puede facturar una
  -- cotización aceptada, una cita cumplida, o nada de lo anterior.
  quote_id        uuid references quotes(id) on delete set null,
  booking_id      uuid references bookings(id) on delete set null,

  provider        text not null default 'facturapi',
  provider_id     text,
  -- El folio fiscal del SAT. Es el identificador que le importa a un
  -- contador, y por eso se guarda aparte del id del proveedor.
  uuid_fiscal     text,
  serie           text,
  folio           text,

  receptor_rfc    text,
  receptor_nombre text,
  total_cents     int not null check (total_cents >= 0),
  currency        text not null default 'MXN',

  status          text not null default 'draft'
                  check (status in ('draft', 'stamped', 'cancelled', 'error')),
  error_message   text,
  stamped_at      timestamptz,
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists invoices_tenant_idx on invoices (tenant_id, created_at desc);
create index if not exists invoices_quote_idx on invoices (quote_id);
create unique index if not exists invoices_uuid_fiscal_idx
  on invoices (uuid_fiscal) where uuid_fiscal is not null;

alter table invoices enable row level security;
-- Sin policies, igual que `quotes`: guarda datos fiscales de personas y
-- los montos con los que un negocio factura. Se lee y escribe con
-- service_role, detrás de `requireTenantStaff`.

comment on table tenant_billing_credentials is
  'Enlace con Facturapi por negocio. Secreta: tabla aparte porque tenants tiene lectura pública con la llave anon.';
comment on table invoices is
  'Facturas emitidas. El XML y el PDF los sirve el proveedor; aquí vive el rastro que bicho necesita.';
