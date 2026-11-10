-- 043_registro_contacto_y_logos.sql
-- Dos piezas del alta self-serve (/registro):
--
-- 1) WhatsApp del dueño. NO va en `tenants`: esa tabla tiene lectura
--    pública (tenants_select_public, using (true), db/002) y cualquiera
--    con la anon key leería el teléfono. Tabla aparte, RLS prendido y SIN
--    policies: solo service_role (server actions, admin) la lee o escribe.
--    Para contactar al dueño antes de que termine su prueba.
--
-- 2) Bucket público `tenant-logos` para el logo que el dueño sube desde su
--    panel (/dashboard/marca). La subida la hace el server action con
--    service_role después de comprobar que es el owner, así que no hacen
--    falta policies de escritura en storage.objects; la lectura es pública
--    porque el logo sale en la página de reservas.
--
-- El código tolera que esto no se haya corrido: el registro sigue sin
-- guardar el teléfono (queda en el correo de aviso) y la subida de logo
-- responde con un error claro.

create table if not exists tenant_owner_contacts (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  whatsapp text not null check (whatsapp ~ '^\+52[1-9][0-9]{9}$'),
  created_at timestamptz not null default now()
);

alter table tenant_owner_contacts enable row level security;

comment on table tenant_owner_contacts is 'Contacto del dueño capturado en /registro (WhatsApp +52XXXXXXXXXX). Sin policies: solo service_role. No mover a tenants (lectura pública).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-logos', 'tenant-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
