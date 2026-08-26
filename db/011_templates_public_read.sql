-- 011_templates_public_read.sql
-- Fixes a real bug: templates (db/007) was created with zero RLS
-- policies at all — correct for locking down writes to service_role
-- only, but it also silently blocked the public /reservar page (which
-- reads via the anon key) from ever seeing a tenant's template. The
-- lookup returned zero rows with no error, so the page always fell back
-- to the plain layout instead of rendering the tenant's actual blocks.
-- Applied manually via the Supabase SQL Editor, after 010.

-- Template content (name, features, colors, blocks) isn't sensitive —
-- same reasoning as the existing public-read policies on resources and
-- service_types.
create policy templates_select_public
  on templates for select
  using (true);
