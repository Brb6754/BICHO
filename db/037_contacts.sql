-- ============================================================
-- 037 · Contactos — la identidad del cliente, una sola vez
--
-- EL PROBLEMA QUE RESUELVE.
--
-- Hasta hoy "el cliente" era tres cosas distintas que no se conocían:
--
--   · reservas      → una fila NUEVA en `customers` en CADA reserva
--                     (db/005 inserta sin buscar). Hay 15 filas para 8
--                     citas, y la misma persona aparece una vez por cita.
--   · cotizaciones  → nombre, correo y teléfono copiados como texto en
--                     `quotes`, sin llave foránea a nada.
--   · facturación   → `receptor_nombre` y `receptor_rfc` en `invoices`.
--
-- La pantalla de Clientes lo disimulaba agrupando por teléfono al LEER
-- (lib/customers/roster.ts), pero eso solo ve reservas y no deja colgar
-- nada: sin una fila estable no hay dónde escribir "prefiere a Renata"
-- ni "alérgica al acrílico".
--
-- `customers` NO desaparece: cambia de significado. Pasa a ser la foto
-- de lo que la persona escribió al reservar ese día; `contacts` es quién
-- es. Mismo criterio con el que una cotización congela su IVA — lo que
-- el cliente puso entonces no se reescribe después.
--
-- EL TELÉFONO ES LA IDENTIDAD, y el unique de abajo lo vuelve verdad.
-- Es una concesión consciente: una pareja que comparte número queda como
-- un contacto. Para ese caso el negocio crea el segundo a mano sin
-- teléfono. La alternativa —no tener unique— deja que dos reservas
-- simultáneas creen dos contactos de la misma persona, que es
-- exactamente el desorden del que venimos.
--
-- Se arranca LIMPIO: no hay backfill. Los datos que existen hoy son de
-- prueba (verificado: 15 clientes, 8 reservas, 1 cotización, todo en
-- spa / test-salon / casa-luma), así que no hay un solo cliente real que
-- preservar. Fusionar históricos adivinando quién es quién no es
-- reversible, y no vale la pena por datos que nadie va a extrañar.
-- ============================================================

create table if not exists contacts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,

  name          text not null check (length(name) between 1 and 120),
  phone         text check (phone is null or length(phone) <= 40),
  email         text check (email is null or length(email) <= 160),

  -- Datos fiscales del contacto, para no volver a capturarlos en cada
  -- factura. Son los MISMOS campos que `quotes` congela al facturar: lo
  -- de aquí es el valor por defecto, lo de allá es lo que se emitió.
  rfc           text check (rfc is null or length(rfc) between 12 and 13),
  razon_social  text check (razon_social is null or length(razon_social) <= 160),
  regimen       text check (regimen is null or length(regimen) <= 10),
  codigo_postal text check (codigo_postal is null or length(codigo_postal) = 5),

  -- Etiquetas como arreglo y no como tabla aparte: para "VIP" o "pide
  -- factura" una tabla de unión es ceremonia sin beneficio, y Postgres
  -- filtra arreglos bien con un índice GIN.
  tags          text[] not null default '{}',

  -- La nota que el negocio quiere ver SIEMPRE que abre la ficha:
  -- preferencias, alergias, con quién se lleva bien. No es una bitácora
  -- de llamadas — eso es otra cosa y puede esperar.
  notes         text check (notes is null or length(notes) <= 4000),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- La regla que hace que todo lo demás funcione. Parcial porque un
-- contacto sin teléfono es legítimo (el que se creó a mano, el que solo
-- dejó correo) y no debe chocar con otro igual de anónimo.
create unique index if not exists contacts_tenant_phone_idx
  on contacts (tenant_id, phone)
  where phone is not null;

create index if not exists contacts_tenant_idx on contacts (tenant_id, name);
create index if not exists contacts_tags_idx on contacts using gin (tags);

-- ── Los tres enlaces ────────────────────────────────────────────────
--
-- `on delete set null` en los tres: borrar un contacto no puede
-- llevarse una cita, una cotización ni —sobre todo— una factura. Un
-- CFDI timbrado existe en el SAT; que aquí desaparezca su rastro porque
-- alguien borró una ficha sería peor que no tener la ficha.
alter table customers add column if not exists contact_id uuid references contacts(id) on delete set null;
alter table quotes    add column if not exists contact_id uuid references contacts(id) on delete set null;
alter table invoices  add column if not exists contact_id uuid references contacts(id) on delete set null;

create index if not exists customers_contact_idx on customers (contact_id);
create index if not exists quotes_contact_idx on quotes (contact_id);
create index if not exists invoices_contact_idx on invoices (contact_id);

-- ── RLS ─────────────────────────────────────────────────────────────
--
-- Mismo patrón que `customers`, que es lo que esta tabla extiende:
-- visible para el equipo del negocio, invisible para todo lo demás.
-- NO lleva policy pública: la página de reservas nunca necesita leer
-- contactos, y aquí viven teléfonos, RFC y notas sobre personas.
alter table contacts enable row level security;

create policy contacts_select_members
  on contacts for select
  using (private.is_member_of_tenant(tenant_id));

create policy contacts_insert_members
  on contacts for insert
  with check (private.is_member_of_tenant(tenant_id));

create policy contacts_update_members
  on contacts for update
  using (private.is_member_of_tenant(tenant_id));

create policy contacts_delete_members
  on contacts for delete
  using (private.is_member_of_tenant(tenant_id));

comment on table contacts is
  'Una fila por persona por negocio. El teléfono es la identidad (ver el índice único). `customers` guarda lo que se escribió en una reserva concreta; esto guarda quién es.';
comment on column contacts.notes is
  'Nota siempre visible en la ficha. OJO: en un consultorio esto puede ser dato sensible bajo la LFPDPPP — el Aviso de Privacidad debe existir antes de que un negocio real escriba aquí.';
