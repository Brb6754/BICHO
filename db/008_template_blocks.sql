-- 008_template_blocks.sql
-- Ordered content blocks per template, for the drag-and-drop editor.
-- Applied manually via the Supabase SQL Editor, after 007.

alter table templates
  add column blocks jsonb not null default '[]'::jsonb;

comment on column templates.blocks is 'Ordered array of {id, type, props}. type is one of hero/text/features/testimonial/booking. "booking" renders the real BookingForm and must always be present exactly once — enforced in app code, not here.';

-- Backfill the 3 seeded templates with a sensible default layout built
-- from their existing name/features, so the public reservar page has
-- something real to render immediately.
update templates
set blocks = jsonb_build_array(
  jsonb_build_object(
    'id', 'hero-1',
    'type', 'hero',
    'props', jsonb_build_object('title', name, 'subtitle', 'Elige tu servicio y horario en unos segundos.')
  ),
  jsonb_build_object(
    'id', 'features-1',
    'type', 'features',
    'props', jsonb_build_object('heading', 'Por qué elegirnos', 'items', features)
  ),
  jsonb_build_object(
    'id', 'booking-1',
    'type', 'booking',
    'props', jsonb_build_object()
  )
);
