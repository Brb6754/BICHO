-- ============================================================
-- 047 · Lealtad
--
-- La tarjeta de sellos de papel, pero digital, más promociones
-- simples con vigencia. Módulo que se prende por negocio.
--
-- LA IDENTIDAD ES EL CONTACTO (db/037), no `customers`: `customers`
-- guarda una fila por cita, `contacts` una por persona (teléfono único
-- por negocio). Una tarjeta por contacto.
--
-- LOS SELLOS SON UN LIBRO, NO UN CONTADOR. Cada sello es una fila
-- (de una cita completada o puesto a mano) y cada canje otra. Lo que
-- lleva la tarjeta hoy = sellos − sellos usados en canjes. Así queda
-- historial de todo y un "+1" repetido por un doble clic se ve.
--
-- El sello por cita lo pone un TRIGGER, no la Server Action: la cita
-- puede pasar a 'completed' desde más de un lugar (agenda, demo, lo que
-- venga) y ninguno tiene que acordarse de la lealtad. `booking_id`
-- único evita sellar dos veces la misma cita.
--
-- Idempotente: se puede correr dos veces.
-- ============================================================

alter table tenants
  add column if not exists lealtad_enabled boolean not null default false;

comment on column tenants.lealtad_enabled is
  'Modulo de lealtad (tarjeta de sellos + promociones). False por defecto: extra que se vende aparte.';

-- ── La regla del negocio ────────────────────────────────────────────
-- Una por negocio. "A la 6ª visita, la 7ª gratis" = 6 sellos, premio
-- "Tu siguiente visita gratis".
create table if not exists loyalty_programs (
  tenant_id        uuid primary key references tenants(id) on delete cascade,
  stamps_required  int  not null default 6 check (stamps_required between 2 and 30),
  reward           text not null default 'Tu siguiente visita gratis'
                     check (length(reward) between 1 and 120),
  active           boolean not null default true,
  updated_at       timestamptz not null default now()
);

-- ── La tarjeta de cada clienta ──────────────────────────────────────
-- `token` es lo único que va en el link público. NO es el id: el id
-- aparece en el panel y en logs; el token solo en el link que se le
-- manda a ella. 32 hex = 128 bits.
create table if not exists loyalty_cards (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  contact_id  uuid not null references contacts(id) on delete cascade,
  token       text not null unique check (token ~ '^[0-9a-f]{32}$'),
  created_at  timestamptz not null default now(),
  unique (tenant_id, contact_id)
);

create table if not exists loyalty_stamps (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  card_id     uuid not null references loyalty_cards(id) on delete cascade,
  -- set null: borrar una cita no le quita a la clienta un sello que ya
  -- se ganó.
  booking_id  uuid references bookings(id) on delete set null,
  source      text not null check (source in ('cita', 'manual')),
  created_by  uuid,
  created_at  timestamptz not null default now()
);

create unique index if not exists loyalty_stamps_booking_idx
  on loyalty_stamps (booking_id) where booking_id is not null;
create index if not exists loyalty_stamps_card_idx on loyalty_stamps (card_id);

create table if not exists loyalty_redemptions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  card_id      uuid not null references loyalty_cards(id) on delete cascade,
  stamps_used  int  not null check (stamps_used > 0),
  -- Congelado: si el negocio cambia el premio mañana, lo que se canjeó
  -- ayer no cambia.
  reward       text not null check (length(reward) between 1 and 120),
  redeemed_by  uuid,
  created_at   timestamptz not null default now()
);

create index if not exists loyalty_redemptions_card_idx on loyalty_redemptions (card_id);
create index if not exists loyalty_redemptions_tenant_idx on loyalty_redemptions (tenant_id, created_at desc);

-- ── Promociones ─────────────────────────────────────────────────────
-- Fechas de calendario (date), no instantes: "vigente del 1 al 15" es
-- en el día del negocio; la app compara contra el día local.
create table if not exists promotions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  title       text not null check (length(title) between 1 and 80),
  details     text check (details is null or length(details) <= 240),
  code        text check (code is null or code ~ '^[A-Z0-9_-]{2,30}$'),
  starts_on   date not null,
  ends_on     date not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index if not exists promotions_tenant_idx on promotions (tenant_id, ends_on desc);

-- ── RLS ─────────────────────────────────────────────────────────────
-- Equipo del negocio: todo. Anónimo: nada, salvo promociones activas
-- (son la vitrina de la página de reservas, no tienen PII). La página
-- pública de la tarjeta lee por server con service_role filtrando por
-- token, igual que /reservar/cita/[bookingId].
alter table loyalty_programs    enable row level security;
alter table loyalty_cards       enable row level security;
alter table loyalty_stamps      enable row level security;
alter table loyalty_redemptions enable row level security;
alter table promotions          enable row level security;

do $$
declare t text;
begin
  foreach t in array array['loyalty_programs','loyalty_cards','loyalty_stamps','loyalty_redemptions','promotions']
  loop
    execute format('drop policy if exists %I on %I', t || '_members_all', t);
    execute format(
      'create policy %I on %I for all using (private.is_member_of_tenant(tenant_id)) with check (private.is_member_of_tenant(tenant_id))',
      t || '_members_all', t
    );
  end loop;
end $$;

drop policy if exists promotions_select_public on promotions;
create policy promotions_select_public
  on promotions for select
  using (active = true);

-- ── El sello automático ─────────────────────────────────────────────
-- Cita → 'completed': un sello a la tarjeta de su contacto (la crea si
-- no existe). Sale de 'completed' (se corrigió "sí vino" a "no vino"):
-- se quita ese sello. Solo si el negocio tiene el módulo prendido y la
-- regla activa. Las reuniones (db/039) no sellan; `to_jsonb` para no
-- depender de que exista la columna `kind`.
create or replace function private.loyalty_stamp_on_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact uuid;
  v_card    uuid;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if coalesce(to_jsonb(new) ->> 'kind', 'cita') <> 'cita' then
      return new;
    end if;
    if not exists (
      select 1 from tenants t
      join loyalty_programs p on p.tenant_id = t.id and p.active
      where t.id = new.tenant_id and t.lealtad_enabled
    ) then
      return new;
    end if;

    select c.contact_id into v_contact from customers c where c.id = new.customer_id;
    if v_contact is null then
      return new;
    end if;

    insert into loyalty_cards (tenant_id, contact_id, token)
    values (new.tenant_id, v_contact, replace(gen_random_uuid()::text, '-', ''))
    on conflict (tenant_id, contact_id) do nothing;

    select id into v_card from loyalty_cards
    where tenant_id = new.tenant_id and contact_id = v_contact;

    insert into loyalty_stamps (tenant_id, card_id, booking_id, source)
    values (new.tenant_id, v_card, new.id, 'cita')
    on conflict (booking_id) where booking_id is not null do nothing;

  elsif old.status = 'completed' and new.status is distinct from 'completed' then
    delete from loyalty_stamps where booking_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_loyalty_stamp on bookings;
create trigger bookings_loyalty_stamp
  after update of status on bookings
  for each row execute function private.loyalty_stamp_on_booking();
