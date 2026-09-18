-- 022_template_cover.sql
-- A real cover image for each template, instead of an emoji.
--
-- The gallery showed 💇 / 🦷 / 🎾 on a tinted band, which says nothing
-- about what the template actually looks like — the one thing you are
-- choosing between when you pick one for a business.
--
-- Nullable on purpose: with no image set, the card renders a live
-- miniature of the template's own first section. That is more honest
-- than a stock photo of strangers (see the note in ProductMocks.tsx) and
-- it can never go stale, because it IS the template.
alter table templates
  add column if not exists cover_image_url text;

comment on column templates.cover_image_url is 'Optional cover photo for the gallery card. When null, the card renders a live miniature of the template instead.';
