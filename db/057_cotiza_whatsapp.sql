-- 057_cotiza_whatsapp.sql
-- Add-on premium "Cotiza, cobra y factura por WhatsApp" + tope de
-- mensajes de la recepcionista. Requiere db/027, db/033, db/034 y db/056.
--
-- Idempotente: se puede correr dos veces sin romper nada.
--
--   1. tenants: el switch del add-on y "confirmar facturas antes de
--      timbrar" (prendido por default: el dueño aprueba cada CFDI).
--   2. quotes: de dónde salió (whatsapp), el teléfono que la pidió (un
--      teléfono solo ve SUS cotizaciones), el seguimiento de 48 h (uno
--      por cotización) y en qué va la factura. Los datos fiscales del
--      receptor ya existen (receptor_*, db/033). `quotes` sigue con RLS
--      y CERO policies (db/027): solo service_role; el panel lee después
--      de comprobar la membresía (requireTenantStaff).
--   3. whatsapp_mensajes_procesados: teléfono y negocio de cada mensaje,
--      para contar el tope por teléfono y por negocio.

alter table tenants
  add column if not exists cotiza_whatsapp_enabled boolean not null default false,
  add column if not exists cotiza_confirmar_facturas boolean not null default true;

comment on column tenants.cotiza_whatsapp_enabled is 'Add-on Cotiza por WhatsApp (plan Pro + cotizaciones + número propio). El webhook vuelve a checar todo.';
comment on column tenants.cotiza_confirmar_facturas is 'true = el dueño aprueba en el panel cada factura pedida por WhatsApp antes de timbrar.';

alter table quotes
  add column if not exists origen text,
  add column if not exists whatsapp_telefono text,
  add column if not exists seguimiento_enviado_at timestamptz,
  add column if not exists factura_estado text,
  add column if not exists factura_datos_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quotes_origen_check') then
    alter table quotes add constraint quotes_origen_check
      check (origen is null or origen in ('whatsapp'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quotes_whatsapp_telefono_check') then
    alter table quotes add constraint quotes_whatsapp_telefono_check
      check (whatsapp_telefono is null or whatsapp_telefono ~ '^[0-9]{8,15}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quotes_factura_estado_check') then
    alter table quotes add constraint quotes_factura_estado_check
      check (factura_estado is null or factura_estado in ('esperando_datos', 'por_confirmar', 'por_aprobar', 'timbrada', 'error'));
  end if;
end $$;

comment on column quotes.factura_estado is
  'Factura pedida por WhatsApp: esperando_datos → por_confirmar (datos mostrados al cliente) → por_aprobar (si el dueño confirma) → timbrada | error.';

-- Lo que consulta el agente (cotizaciones de un teléfono) y el cron de seguimiento.
create index if not exists quotes_whatsapp_tel_idx
  on quotes (tenant_id, whatsapp_telefono, created_at desc)
  where origen = 'whatsapp';
create index if not exists quotes_whatsapp_seguimiento_idx
  on quotes (sent_at)
  where origen = 'whatsapp' and seguimiento_enviado_at is null;

alter table whatsapp_mensajes_procesados
  add column if not exists telefono text,
  add column if not exists tenant_id uuid references tenants(id) on delete cascade,
  -- Imagen/PDF: cada uno cuesta una llamada al modelo que lee la constancia; tope aparte.
  add column if not exists archivo boolean not null default false;

create index if not exists whatsapp_mensajes_tel_idx
  on whatsapp_mensajes_procesados (telefono, created_at desc);
create index if not exists whatsapp_mensajes_tenant_idx
  on whatsapp_mensajes_procesados (tenant_id, created_at desc);
