-- 014_template_design.sql
-- Applied manually via the Supabase SQL Editor, like every migration
-- before it.
--
-- WHY THIS COLUMN EXISTS
-- Until now a template row was {name, vertical, accent_color, features,
-- blocks}. Two templates built from the same block types could only
-- differ by colour — and colour is precisely what every tenant
-- overrides during setup (the public page reads primary/accent from the
-- tenants row, not from the template). So a template had no identity
-- that survived being branded, which is the root reason all of them
-- looked like the same page in different colours.
--
-- `design` holds the part of a template's identity that DOES survive
-- rebranding: type scale, vertical rhythm, corner language, image
-- treatment, heading font and casing. See TemplateDesign in
-- lib/templates/blocks.ts; the renderer turns it into CSS custom
-- properties (--tpl-*) on the page root.
--
-- jsonb with a default, so the app keeps working on any environment
-- where this hasn't been applied yet (the code also defaults through
-- normalizeDesign()).

alter table templates
  add column if not exists design jsonb not null default '{}'::jsonb;

comment on column templates.design is
  'TemplateDesign: {typeScale, rhythm, shape, imageTreatment, headingFont, upperHeadings}. The template''s design language — the identity that survives a tenant applying their own colours. Empty object = platform defaults (see DEFAULT_DESIGN in lib/templates/blocks.ts).';
