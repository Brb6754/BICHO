-- ============================================================
-- 029 · Arreglo de next_quote_folio (db/027)
--
-- La función venía con `select max(folio) ... for update`, y Postgres
-- rechaza eso: "FOR UPDATE is not allowed with aggregate functions".
-- Un agregado no devuelve filas que se puedan bloquear. Error mío, y
-- del tipo que solo aparece al correrla — el SQL se crea sin quejarse.
--
-- La intención era correcta: serializar la generación del folio para
-- que dos vendedores cotizando al mismo tiempo no obtengan el mismo
-- número. Lo que faltaba era el candado adecuado.
--
-- `pg_advisory_xact_lock` bloquea por NEGOCIO —no la tabla— y se suelta
-- solo al terminar la transacción. Dos vendedores del mismo negocio
-- esperan uno al otro unos microsegundos; dos de negocios distintos ni
-- se enteran.
-- ============================================================

create or replace function next_quote_folio(p_tenant_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folio int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 0));

  select coalesce(max(folio), 0) + 1 into v_folio
  from quotes
  where tenant_id = p_tenant_id;

  return v_folio;
end;
$$;

revoke all on function next_quote_folio(uuid) from public, anon, authenticated;
grant execute on function next_quote_folio(uuid) to service_role;
