-- 058_boost.sql
-- Add-on "Boost de clientes" (Negocio/Pro, $399/mes, 300 mensajes/mes):
-- llena huecos de la agenda con clientas que el negocio ya tiene.
--
-- Idempotente: se puede correr dos veces sin romper nada.
--
--   1. tenants: los dos switches (lista VIP, horas flojas) y la
--      configuración de horas flojas (descuento máximo = precio piso,
--      cuánto antes avisar, días y horas permitidas).
--   2. boost_contactos: la lista VIP. Teléfono = PII. Consentimiento de
--      avisos obligatorio (check), el de promociones aparte. baja_at =
--      respondió BAJA por WhatsApp.
--   3. boost_ofertas: cada hueco ofrecido a una clienta. El id (uuid) es
--      el token del link; expira_at es el fin de la ventana de descuento,
--      que valida el servidor (nunca un precio en la URL).
--   4. boost_mensajes: cada envío (o intento) — cuenta el tope mensual y
--      el costo estimado. Sin teléfonos.
--   5. bookings: de qué oferta salió la cita y a qué precio.
--
-- RLS: los miembros del negocio LEEN; nadie escribe salvo service_role
-- (sin policies de insert/update/delete).

alter table tenants
  add column if not exists boost_vip_enabled boolean not null default false,
  add column if not exists boost_flojas_enabled boolean not null default false,
  add column if not exists boost_descuento_max smallint not null default 15,
  add column if not exists boost_aviso_horas smallint not null default 4,
  add column if not exists boost_dias smallint[] not null default '{1,2,3,4,5}',
  add column if not exists boost_hora_desde smallint not null default 11,
  add column if not exists boost_hora_hasta smallint not null default 17;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tenants_boost_config_check') then
    alter table tenants add constraint tenants_boost_config_check check (
      boost_descuento_max between 5 and 50
      and boost_aviso_horas between 1 and 12
      and boost_hora_desde between 0 and 23
      and boost_hora_hasta between 1 and 24
      and boost_hora_desde < boost_hora_hasta
      and boost_dias <@ '{0,1,2,3,4,5,6}'::smallint[]
    );
  end if;
end $$;

create table if not exists boost_contactos (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id) on delete cascade,
  nombre                 text not null check (char_length(nombre) between 1 and 200),
  telefono               text not null check (telefono ~ '^[0-9]{10,15}$'),
  service_type_id        uuid references service_types(id) on delete set null,
  dias                   smallint[] not null default '{}' check (dias <@ '{0,1,2,3,4,5,6}'::smallint[]),
  franjas                text[] not null default '{}' check (franjas <@ '{manana,tarde,noche}'::text[]),
  consentimiento_avisos  boolean not null check (consentimiento_avisos),
  consentimiento_promos  boolean not null default false,
  consentimiento_at      timestamptz not null default now(),
  baja_at                timestamptz,
  ultimo_aviso_at        timestamptz,
  ultima_promo_at        timestamptz,
  created_at             timestamptz not null default now(),
  unique (tenant_id, telefono)
);

create table if not exists boost_ofertas (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  contacto_id           uuid not null references boost_contactos(id) on delete cascade,
  tipo                  text not null check (tipo in ('vip', 'flojas')),
  resource_id           uuid not null references resources(id) on delete cascade,
  service_type_id       uuid not null references service_types(id) on delete cascade,
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  precio_normal_cents   int not null check (precio_normal_cents >= 0),
  precio_oferta_cents   int not null check (precio_oferta_cents >= 0 and precio_oferta_cents <= precio_normal_cents),
  expira_at             timestamptz not null,
  booking_id            uuid references bookings(id) on delete set null,
  precio_cobrado_cents  int check (precio_cobrado_cents >= 0),
  tomada_at             timestamptz,
  created_at            timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists boost_mensajes (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  contacto_id  uuid references boost_contactos(id) on delete set null,
  oferta_id    uuid references boost_ofertas(id) on delete set null,
  tipo         text not null check (tipo in ('vip', 'flojas')),
  status       text not null check (status in ('sent', 'skipped', 'failed')),
  motivo       text check (char_length(motivo) <= 500),
  created_at   timestamptz not null default now()
);

alter table bookings
  add column if not exists boost_oferta_id uuid references boost_ofertas(id) on delete set null,
  add column if not exists boost_precio_cents int check (boost_precio_cents >= 0);

create index if not exists boost_contactos_tenant_idx on boost_contactos (tenant_id, created_at);
create index if not exists boost_contactos_tel_idx on boost_contactos (telefono);
create index if not exists boost_ofertas_tenant_idx on boost_ofertas (tenant_id, created_at desc);
create index if not exists boost_mensajes_tenant_idx on boost_mensajes (tenant_id, created_at desc);
create index if not exists bookings_boost_idx on bookings (tenant_id) where boost_oferta_id is not null;

alter table boost_contactos enable row level security;
alter table boost_ofertas enable row level security;
alter table boost_mensajes enable row level security;

drop policy if exists boost_contactos_select_members on boost_contactos;
create policy boost_contactos_select_members on boost_contactos
  for select using (private.is_member_of_tenant(tenant_id));

drop policy if exists boost_ofertas_select_members on boost_ofertas;
create policy boost_ofertas_select_members on boost_ofertas
  for select using (private.is_member_of_tenant(tenant_id));

drop policy if exists boost_mensajes_select_members on boost_mensajes;
create policy boost_mensajes_select_members on boost_mensajes
  for select using (private.is_member_of_tenant(tenant_id));

comment on table boost_contactos is 'Boost: lista VIP de cancelaciones. Teléfono = PII. Lectura: miembros; escritura: service_role.';
comment on table boost_ofertas is 'Boost: hueco ofrecido a una clienta. id = token del link; el descuento vale hasta expira_at (validado en servidor).';
comment on table boost_mensajes is 'Boost: cada envío o intento; cuenta el tope mensual (status = sent) y el costo estimado.';
