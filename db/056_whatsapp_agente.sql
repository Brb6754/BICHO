-- 056_whatsapp_agente.sql
-- La "recepcionista IA" por WhatsApp (add-on del plan Pro).
--
-- Idempotente: se puede correr dos veces sin romper nada.
--
-- Tres piezas:
--   1. Dos columnas en tenants: el switch del agente y, opcional, el
--      número propio del negocio (phone_number_id de Meta). Sin número
--      propio, el negocio atiende por el número de la plataforma y el
--      ruteo sale del código "Hola <slug>" o de la conversación previa.
--   2. whatsapp_conversaciones: una fila por (negocio, teléfono del
--      cliente) con un historial CORTO (lo que el agente necesita para
--      seguir el hilo, no un archivo de chats) y el estado ia | humano.
--   3. whatsapp_mensajes_procesados: Meta reintenta los webhooks; la
--      llave primaria sobre el id del mensaje es lo que evita contestar
--      (y agendar) dos veces.

alter table tenants
  add column if not exists agente_whatsapp_enabled boolean not null default false,
  add column if not exists whatsapp_phone_number_id text;

comment on column tenants.agente_whatsapp_enabled is 'Recepcionista IA por WhatsApp. Solo se prende desde el panel con plan Pro; el webhook vuelve a checar ambas cosas.';
comment on column tenants.whatsapp_phone_number_id is 'Phone number ID de Meta del número propio del negocio. NULL = atiende por el número de la plataforma.';

-- Un número de Meta pertenece a un solo negocio. Sin esto, dos filas con
-- el mismo id harían que el ruteo eligiera una al azar.
create unique index if not exists tenants_whatsapp_phone_number_id_key
  on tenants (whatsapp_phone_number_id)
  where whatsapp_phone_number_id is not null;

create table if not exists whatsapp_conversaciones (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  -- Solo dígitos, con lada de país (lo que manda Meta en `from`).
  telefono         text not null check (telefono ~ '^[0-9]{8,15}$'),
  -- Por qué número entró. El ruteo por "conversación previa" del número
  -- de la plataforma busca SOLO filas de ese número.
  phone_number_id  text not null,
  -- [{ role: 'user'|'assistant', content: text, at: iso }], acotado en
  -- código a los últimos mensajes.
  historial        jsonb not null default '[]'::jsonb,
  estado           text not null default 'ia' check (estado in ('ia', 'humano')),
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (tenant_id, telefono)
);

create index if not exists whatsapp_conversaciones_tenant_idx
  on whatsapp_conversaciones (tenant_id, last_message_at desc);
create index if not exists whatsapp_conversaciones_ruteo_idx
  on whatsapp_conversaciones (telefono, phone_number_id, last_message_at desc);

alter table whatsapp_conversaciones enable row level security;

-- Lectura: solo miembros del negocio (mismo helper que el resto de las
-- tablas con tenant_id, db/002). Escritura: ninguna policy, así que solo
-- service_role (el webhook y las acciones del panel, que verifican la
-- membresía antes).
drop policy if exists whatsapp_conversaciones_select_member on whatsapp_conversaciones;
create policy whatsapp_conversaciones_select_member
  on whatsapp_conversaciones for select
  to authenticated
  using (private.is_member_of_tenant(tenant_id));

create table if not exists whatsapp_mensajes_procesados (
  wamid       text primary key,
  created_at  timestamptz not null default now()
);

alter table whatsapp_mensajes_procesados enable row level security;
-- Cero policies a propósito: solo service_role.

comment on table whatsapp_conversaciones is 'Conversaciones de la recepcionista IA. Leen los miembros del negocio (RLS); escribe solo service_role.';
comment on table whatsapp_mensajes_procesados is 'Dedup de webhooks de WhatsApp por id de mensaje. Solo service_role.';
