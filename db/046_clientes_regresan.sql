-- ============================================================
-- 046 — Módulo "Clientes que regresan".
--
-- Tres piezas, ninguna tabla nueva:
--
-- 1. `tenants.regresan_enabled`: la bandera del módulo, mismo patrón que
--    quotes_enabled / reuniones_enabled / copiloto_enabled — apagada
--    hasta que alguien la prende desde el panel interno.
--
-- 2. Ajustes del módulo en `tenants`:
--    · `regresan_weeks`: a partir de cuántas semanas sin venir una
--      clienta aparece en "no han vuelto". 6 por omisión (un retoque de
--      uñas o un corte, el ciclo típico de una estética).
--    · `google_review_url`: el link de reseñas de Google que pega el
--      negocio. Ojo: `tenants` tiene lectura pública (tenants_select_public),
--      así que esto es visible con la llave anon. Está bien: es un link
--      que el negocio reparte a propósito. NO guardar aquí nada privado.
--
-- 3. `bookings.reminder_sent_at`: cuándo salió el recordatorio de 24 h.
--    Es lo que hace idempotente al cron (/api/cron/recordatorios): la
--    fila se "reclama" con un UPDATE ... WHERE reminder_sent_at IS NULL
--    ANTES de mandar, así que dos corridas encimadas nunca mandan el
--    mismo recordatorio dos veces (cada WhatsApp se cobra).
--
-- RLS: no hace falta policy nueva. Las columnas nuevas viven en tablas
-- que ya tienen RLS por tenant (db/002): `tenants` solo la actualiza su
-- dueño, y `bookings` se escribe por service_role desde Server Actions
-- que pasan por requireTenantStaff y filtran por tenant_id.
-- ============================================================

alter table tenants
  add column if not exists regresan_enabled boolean not null default false,
  add column if not exists regresan_weeks integer not null default 6,
  add column if not exists google_review_url text;

alter table tenants drop constraint if exists tenants_regresan_weeks_range;
alter table tenants
  add constraint tenants_regresan_weeks_range check (regresan_weeks between 1 and 52);

alter table tenants drop constraint if exists tenants_google_review_url_https;
alter table tenants
  add constraint tenants_google_review_url_https check (
    google_review_url is null
    or (google_review_url ~ '^https://' and char_length(google_review_url) <= 500)
  );

comment on column tenants.regresan_enabled is
  'Módulo "Clientes que regresan" (recordatorio 24 h, clientas inactivas, pedir reseña). Extra por negocio.';
comment on column tenants.regresan_weeks is
  'Semanas sin venir para que una clienta cuente como "no ha vuelto". 1–52, 6 por omisión.';
comment on column tenants.google_review_url is
  'Link de reseñas de Google del negocio. Público (tenants tiene lectura anon): solo el link.';

alter table bookings
  add column if not exists reminder_sent_at timestamptz;

comment on column bookings.reminder_sent_at is
  'Cuándo se mandó el recordatorio de 24 h. NULL = pendiente. El cron lo reclama antes de enviar.';

-- El cron busca "citas confirmadas, sin recordatorio, en las próximas
-- horas". Índice parcial: solo las que todavía pueden necesitarlo.
create index if not exists bookings_reminder_pending_idx
  on bookings (starts_at)
  where reminder_sent_at is null and status = 'confirmed';

-- Prendido en los negocios de demostración (lib/domains.ts DEMO_SLUGS).
update tenants set regresan_enabled = true
where slug in (
  'dental-nova', 'casa-luma', 'alto-padel', 'mesa-doce', 'agua-serena',
  'hierro-monte', 'clinica-alameda', 'don-ramon', 'lima-laca',
  'burbujas-bigotes', 'casa-norte'
);
