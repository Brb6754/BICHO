-- 055 — Directorio y mapa de negocios Bicho (bichomx.com/negocios).
--
-- Opt-in del dueño: nada sale en el directorio hasta que él prende el
-- switch. Solo se publica lo que acepta mostrar: nombre, logo, giro,
-- ciudad, colonia y el pin. La dirección completa se guarda para
-- geocodificar y prellenar el formulario; la página pública no la lee.
--
-- Idempotente: se puede correr dos veces.

alter table public.tenants add column if not exists en_directorio boolean not null default false;
alter table public.tenants add column if not exists ciudad text;
alter table public.tenants add column if not exists direccion text;
alter table public.tenants add column if not exists colonia text;
alter table public.tenants add column if not exists lat double precision;
alter table public.tenants add column if not exists lng double precision;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tenants_directorio_len') then
    alter table public.tenants add constraint tenants_directorio_len check (
      char_length(coalesce(ciudad, '')) <= 80
      and char_length(coalesce(direccion, '')) <= 200
      and char_length(coalesce(colonia, '')) <= 80
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tenants_directorio_coords') then
    alter table public.tenants add constraint tenants_directorio_coords check (
      (lat is null and lng is null)
      or (lat between -90 and 90 and lng between -180 and 180)
    );
  end if;
end $$;

-- Los negocios demo (lib/domains.ts → DEMO_SLUGS) son inventados: nunca
-- en el directorio. El código también los filtra; esto es la segunda capa.
update public.tenants set en_directorio = false
where slug in (
  'dental-nova', 'casa-luma', 'alto-padel', 'mesa-doce', 'agua-serena',
  'hierro-monte', 'clinica-alameda', 'don-ramon', 'lima-laca',
  'burbujas-bigotes', 'casa-norte'
) and en_directorio;

create index if not exists tenants_en_directorio_idx on public.tenants (ciudad) where en_directorio;
