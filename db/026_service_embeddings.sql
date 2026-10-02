-- ============================================================
-- 026 — Semantic search over each tenant's service catalog.
--
-- A customer types "me duele una muela" and should find "Consulta de
-- urgencia dental", which shares no word with it. Each service gets an
-- embedding (384 numbers from paraphrase-multilingual-MiniLM-L12-v2,
-- computed in the Next.js server), and a search compares the query's
-- embedding against them by cosine similarity.
--
-- No vector index on purpose: a tenant has tens of services, and an
-- exact scan over that is faster than any approximate index would be.
-- The tenant_id filter does the narrowing.
-- ============================================================

create extension if not exists vector with schema extensions;

alter table service_types
  add column if not exists embedding extensions.vector(384);

comment on column service_types.embedding is
  'paraphrase-multilingual-MiniLM-L12-v2, normalized. Null until computed; such rows are simply not returned by match_services.';

-- security invoker: runs with the CALLER's permissions, so the existing
-- RLS on service_types still applies. Anon only ever sees active
-- services, same as reading the table directly.
create or replace function match_services(
  p_tenant_id       uuid,
  p_query_embedding extensions.vector(384),
  p_limit           int default 5
)
returns table (id uuid, name text, duration_minutes int, price_cents int, similarity float)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select s.id, s.name, s.duration_minutes, s.price_cents,
         1 - (s.embedding <=> p_query_embedding) as similarity
  from service_types s
  where s.tenant_id = p_tenant_id
    and s.active = true
    and s.embedding is not null
  order by s.embedding <=> p_query_embedding
  limit least(greatest(p_limit, 1), 20);
$$;

grant execute on function match_services(uuid, extensions.vector, int) to anon, authenticated;
