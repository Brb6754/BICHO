-- ============================================================
-- 041 — Documentos del copiloto.
--
-- El dueño sube un PDF, Word o texto (lista de precios, ficha técnica,
-- política de garantía) y el copiloto lo consulta al responder.
--
-- Se guarda el TEXTO extraído partido en fragmentos con su embedding, no
-- el archivo original: el copiloto solo necesita leer, y guardar el
-- archivo exigiría un bucket de Storage con sus propias policies. Si
-- algún día hace falta descargarlo, se agrega aparte.
--
-- Aquí sí hay tabla de vectores (a diferencia de las notas, db/040 /
-- bitácora decisión 004): un documento son cientos de fragmentos, y
-- embeberlos en cada pregunta no es viable.
--
-- RLS: lectura para miembros del negocio — el copiloto lee estos
-- fragmentos A TRAVÉS de la frontera, como `authenticated`, igual que el
-- resto de sus datos. Escritura solo service_role (la ruta de subida
-- verifica membresía antes de escribir).
-- ============================================================

create table if not exists copiloto_documentos (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  nombre     text not null check (length(nombre) between 1 and 200),
  tipo       text not null check (tipo in ('pdf', 'docx', 'txt')),
  caracteres int  not null default 0,
  fragmentos int  not null default 0,
  subido_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists copiloto_documentos_tenant_idx
  on copiloto_documentos (tenant_id, created_at desc);

create table if not exists copiloto_fragmentos (
  id           uuid primary key default gen_random_uuid(),
  documento_id uuid not null references copiloto_documentos(id) on delete cascade,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  posicion     int  not null,
  texto        text not null check (length(texto) <= 4000),
  embedding    extensions.vector(384) not null
);

create index if not exists copiloto_fragmentos_tenant_idx
  on copiloto_fragmentos (tenant_id);

alter table copiloto_documentos enable row level security;
alter table copiloto_fragmentos enable row level security;

drop policy if exists copiloto_documentos_select_members on copiloto_documentos;
create policy copiloto_documentos_select_members
  on copiloto_documentos for select
  using (private.is_member_of_tenant(tenant_id));

drop policy if exists copiloto_fragmentos_select_members on copiloto_fragmentos;
create policy copiloto_fragmentos_select_members
  on copiloto_fragmentos for select
  using (private.is_member_of_tenant(tenant_id));

grant select on copiloto_documentos, copiloto_fragmentos to authenticated;
