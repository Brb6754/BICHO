-- 009_tenant_branding.sql
-- Per-tenant brand customization (logo, colors, fonts) — configured by
-- the internal team from the admin panel (/admin/tenants/[tenantId]),
-- not self-service by the tenant. Also adds a notes field to bookings
-- for the redesigned customer form.
-- Applied manually via the Supabase SQL Editor, after 008.

alter table tenants
  add column description        text,
  add column theme               text not null default 'modern',
  add column primary_color       text not null default '#0E3B2C',
  add column secondary_color     text not null default '#0A2E22',
  add column accent_color        text not null default '#8FE24A',
  add column background_color    text not null default '#F7F6F3',
  add column text_color          text not null default '#1A1A1A',
  add column font_heading        text not null default 'inter',
  add column font_body           text not null default 'inter',
  add column logo_url            text,
  add column logo_mobile_url     text,
  add column favicon_url         text,
  add column cover_image_url     text,
  add column profile_image_url   text;

comment on column tenants.theme is 'Last preset applied from the admin panel (minimal/modern/luxury/corporate/bold/soft) — informational only, a starting point for colors, not enforced afterwards.';
comment on column tenants.font_heading is 'Key into a small curated font list (see lib/branding/fonts.ts), not a free-text font-family — needed to safely build a Google Fonts URL at runtime.';

alter table bookings
  add column notes text;

comment on column bookings.notes is 'Optional note the customer leaves at booking time (public reservar flow).';
