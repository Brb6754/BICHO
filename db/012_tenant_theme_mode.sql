-- 012_tenant_theme_mode.sql
-- Lets the admin panel pick light or dark mode for a tenant's PUBLIC
-- booking page (/t/[slug]/reservar) — a per-tenant setting, not a
-- visitor toggle and not tied to the visitor's OS/browser preference.
-- Applied manually via the Supabase SQL Editor, after 011.

alter table tenants
  add column theme_mode text not null default 'light' check (theme_mode in ('light', 'dark'));

comment on column tenants.theme_mode is 'Public booking page (/t/[slug]/reservar) color mode — set from the admin panel BrandEditor, not visitor-controlled. "light" uses background_color/text_color as today; "dark" anchors the page to the tenant''s own darkest brand color (see tenantDarkModeCssVars in lib/branding/colors.ts), same mechanism as the tenant dashboard''s dark mode.';
