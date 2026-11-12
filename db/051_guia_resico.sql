-- ============================================================
-- 051 · Guía RESICO ("¿Cómo me formalizo?")
--
-- Guía en lenguaje simple para que la dueña (persona física) entienda
-- el Régimen Simplificado de Confianza, un checklist de trámites con
-- progreso guardado por negocio y una calculadora de ISR mensual
-- estimado (pura, en lib/resico/isr.ts; no guarda nada).
--
-- 1. `tenants.resico_enabled`, mismo patrón que caja_enabled /
--    posts_enabled: apagado hasta que alguien lo prende.
-- 2. `resico_checklist`: una fila por paso marcado ("ya tengo RFC").
--    Quitar la marca borra la fila. La escribe la Server Action con
--    service_role tras requireTenantStaff; la RLS es la segunda cerradura.
--
-- Idempotente: se puede correr dos veces.
-- ============================================================

alter table tenants
  add column if not exists resico_enabled boolean not null default false;

comment on column tenants.resico_enabled is
  'Guía RESICO (cómo formalizarse + checklist + ISR estimado). Módulo extra por negocio.';

create table if not exists resico_checklist (
  tenant_id   uuid not null references tenants(id) on delete cascade,
  paso        text not null check (paso in ('rfc', 'efirma', 'buzon', 'regimen', 'csd', 'declaracion')),
  hecho_at    timestamptz not null default now(),
  primary key (tenant_id, paso)
);

alter table resico_checklist enable row level security;

drop policy if exists resico_checklist_members_all on resico_checklist;
create policy resico_checklist_members_all
  on resico_checklist for all
  using (private.is_member_of_tenant(tenant_id))
  with check (private.is_member_of_tenant(tenant_id));

-- Prendido en los negocios de demostración (lib/domains.ts DEMO_SLUGS).
update tenants set resico_enabled = true
where slug in (
  'dental-nova', 'casa-luma', 'alto-padel', 'mesa-doce', 'agua-serena',
  'hierro-monte', 'clinica-alameda', 'don-ramon', 'lima-laca',
  'burbujas-bigotes', 'casa-norte'
);
