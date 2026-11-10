-- ============================================================
-- 048 · Posts con IA
--
-- La dueña arma en su panel un post para redes: texto escrito con
-- Claude a partir de sus datos reales (servicios, precios, horarios
-- libres, promociones) + una imagen con su marca armada en el servidor
-- (next/og, no IA). Módulo que se prende por negocio.
--
-- `post_generations` es el historial Y el contador del límite mensual
-- (30 por negocio): cada fila es una llamada a Claude que ya se pagó.
-- La escribe la Server Action con service_role después de pasar por
-- requireTenantStaff; la RLS es para que nadie más la lea.
--
-- Idempotente: se puede correr dos veces.
-- ============================================================

alter table tenants
  add column if not exists posts_enabled boolean not null default false;

comment on column tenants.posts_enabled is
  'Modulo "Posts con IA" (texto con Claude + imagen con la marca). False por defecto: extra que se vende aparte.';

create table if not exists post_generations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  tipo            text not null check (tipo in ('servicio', 'promo', 'horarios', 'fecha', 'libre')),
  formato         text not null check (formato in ('feed', 'historia', 'whatsapp')),
  prompt_resumen  text not null check (length(prompt_resumen) between 1 and 300),
  -- { opciones: [{ titular, texto }], base: { plantilla, precio, ... } }
  opciones        jsonb not null,
  created_by      uuid,
  created_at      timestamptz not null default now()
);

-- El historial (últimos 20) y el conteo del mes leen por aquí.
create index if not exists post_generations_tenant_idx
  on post_generations (tenant_id, created_at desc);

alter table post_generations enable row level security;

drop policy if exists post_generations_members_all on post_generations;
create policy post_generations_members_all
  on post_generations for all
  using (private.is_member_of_tenant(tenant_id))
  with check (private.is_member_of_tenant(tenant_id));

-- Prendido en los negocios de demostración (lib/domains.ts DEMO_SLUGS).
update tenants set posts_enabled = true
where slug in (
  'dental-nova', 'casa-luma', 'alto-padel', 'mesa-doce', 'agua-serena',
  'hierro-monte', 'clinica-alameda', 'don-ramon', 'lima-laca',
  'burbujas-bigotes', 'casa-norte'
);
