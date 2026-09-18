-- 015_tenant_page.sql
-- Applied manually via the Supabase SQL Editor, like every migration
-- before it.
--
-- WHY THIS EXISTS
-- Until now a tenant had no page of its own. `/t/{slug}/reservar`
-- looked up `templates` by the tenant's `vertical` and rendered that
-- shared row. Two consequences, both bad:
--
--   1. Editing a template silently rewrote the LIVE page of every
--      business already using that vertical. Fix a typo for one salon
--      and you have republished forty other salons' pages.
--   2. A business could never differ from its template — its own
--      services, its own wording, its own section order were all
--      impossible, because there was nowhere to put them.
--
-- A template is now what its name says: a STARTING POINT. Creating a
-- tenant copies the template's blocks and design into the tenant, and
-- from that moment the two are independent. Editing the template
-- affects future tenants only.
--
-- Both columns are nullable on purpose. NULL means "this tenant was
-- created before this migration, or from a vertical with no template"
-- — the renderer falls back to the shared template exactly as before,
-- so nothing that exists today breaks.

alter table tenants
  add column if not exists page_blocks jsonb,
  add column if not exists page_design jsonb;

comment on column tenants.page_blocks is
  'This tenant''s own page sections, snapshotted from its template at creation. NULL = fall back to the shared templates row for this vertical (pre-015 tenants, or verticals with no template). Same Block[] shape as templates.blocks — see lib/templates/blocks.ts.';

comment on column tenants.page_design is
  'This tenant''s own TemplateDesign, snapshotted alongside page_blocks. NULL = fall back to the template''s design, then to DEFAULT_DESIGN.';

-- Backfill: give every EXISTING tenant its own copy of whatever it is
-- currently rendering, so behaviour is unchanged today but no tenant is
-- exposed to a future template edit. Tenants whose vertical has no
-- template row keep NULL and keep using the fallback path.
update tenants t
set page_blocks = tpl.blocks,
    page_design = tpl.design
from templates tpl
where tpl.vertical = t.vertical
  and t.page_blocks is null;
