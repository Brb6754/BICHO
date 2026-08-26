-- 007_templates.sql
-- Real template definitions for the admin panel's template gallery/editor.
-- Applied manually via the Supabase SQL Editor, after 006.

create table templates (
  id                  uuid primary key default gen_random_uuid(),
  vertical            text not null unique,
  name                text not null,
  features            jsonb not null default '[]'::jsonb,
  available           boolean not null default false,
  accent_color        text not null default '#0E3B2C',
  default_services    jsonb not null default '[]'::jsonb,
  booking_form_fields jsonb not null default '["name", "phone"]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table templates is 'Per-vertical default config (features, colors, default services, booking form fields) managed from the internal admin panel. Same access pattern as platform_admins — no RLS policies, service_role only.';
comment on column templates.accent_color is 'Hex color, not a Tailwind class — a class name coming from the DB at runtime would not exist in Tailwind''s build-time-generated CSS. Rendered via inline style.';

alter table templates enable row level security;
-- No policies added — default-deny for anon/authenticated, only
-- service_role (which bypasses RLS) can read/write.

insert into templates (vertical, name, features, available, accent_color, default_services, booking_form_fields) values
  (
    'peluqueria',
    'Peluquería / Barbería',
    '["Catálogo de servicios con duración y precio", "Horario semanal por estilista", "Reserva pública con selección de profesional"]'::jsonb,
    true,
    '#8FE24A',
    '[{"name":"Corte de cabello","duration_minutes":30,"price_cents":15000},{"name":"Barba","duration_minutes":20,"price_cents":8000}]'::jsonb,
    '["name", "phone"]'::jsonb
  ),
  (
    'dentista',
    'Consultorio dental',
    '["Catálogo de servicios con duración y precio", "Horario semanal por consultorio", "Reserva pública con selección de profesional"]'::jsonb,
    true,
    '#0E3B2C',
    '[{"name":"Limpieza dental","duration_minutes":45,"price_cents":60000}]'::jsonb,
    '["name", "phone", "email"]'::jsonb
  ),
  (
    'padel',
    'Cancha de pádel',
    '["Reserva de recurso sin profesional asociado (requires_staff=false)", "Horario semanal por cancha", "Pendiente: reglas de duración fija y precios por horario pico"]'::jsonb,
    false,
    '#6B6B6B',
    '[]'::jsonb,
    '["name", "phone"]'::jsonb
  );
