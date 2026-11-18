-- ============================================================
-- 061 · Citas con anticipo (bot de citas) + Mercado Pago Connect
--
-- Idempotente: se puede correr dos veces sin romper nada.
-- Una sola migración para las dos fases: la fase 1 (apartar, liberar,
-- confirmar a mano) usa las columnas; la fase 2 (cobro real con la
-- cuenta de Mercado Pago DEL NEGOCIO) usa las tres tablas del final.
--
-- MODELO DE UN APARTADO — por qué NO se toca el check de `status`:
-- decenas de pantallas y la función de disponibilidad filtran
-- `status = 'confirmed'` / `status <> 'cancelled'`. Un status nuevo
-- ('pending_deposit') obligaría a revisar cada una, y la que se olvide
-- ofrecería como libre un horario apartado. En cambio:
--   apartado  = status 'confirmed' + deposit_status 'pending' + hold_expires_at
--   pagado    = status 'confirmed' + deposit_status 'paid'
--   liberado  = status 'cancelled' + deposit_status 'released'
-- Un apartado sigue siendo una fila viva para el exclude constraint
-- (db/001), así que nadie más puede tomar ese horario mientras corre el
-- reloj, sin una sola línea nueva de lógica de doble-booking.
-- ============================================================

-- ── 1. Configuración por negocio (en tenants) ───────────────────────
--
-- Va en `tenants` aunque esa tabla tiene lectura pública con la llave
-- anon (tenants_select_public, db/002): nada de esto es secreto — el
-- monto y la política son justo lo que el cliente necesita ver antes de
-- reservar. Lo secreto (tokens de Mercado Pago) vive aparte, abajo.
alter table tenants
  add column if not exists anticipo_enabled boolean not null default false,
  -- Monto general en pesos enteros. NULL = sin monto general (solo
  -- cobran anticipo los servicios que tengan el suyo).
  add column if not exists anticipo_mxn int,
  -- Cuánto dura apartado un horario sin pagar antes de liberarse.
  add column if not exists anticipo_apartado_min int not null default 15,
  -- Con cuántas horas de anticipación se puede reagendar conservando el
  -- anticipo. Menos que eso: lo decide el negocio (pasa a humano).
  add column if not exists anticipo_reagendar_horas int not null default 24,
  add column if not exists anticipo_politica text;

alter table tenants drop constraint if exists tenants_anticipo_mxn_check;
alter table tenants add constraint tenants_anticipo_mxn_check
  check (anticipo_mxn is null or anticipo_mxn between 0 and 100000);
alter table tenants drop constraint if exists tenants_anticipo_apartado_min_check;
alter table tenants add constraint tenants_anticipo_apartado_min_check
  check (anticipo_apartado_min between 5 and 120);
alter table tenants drop constraint if exists tenants_anticipo_reagendar_horas_check;
alter table tenants add constraint tenants_anticipo_reagendar_horas_check
  check (anticipo_reagendar_horas between 0 and 720);
alter table tenants drop constraint if exists tenants_anticipo_politica_check;
alter table tenants add constraint tenants_anticipo_politica_check
  check (anticipo_politica is null or char_length(anticipo_politica) <= 500);

-- ── 2. Monto por servicio ───────────────────────────────────────────
--
-- Regla (lib/anticipos/config.ts → montoAnticipo):
--   anticipo apagado en el negocio      → 0, siempre
--   service_types.deposit_mxn NOT NULL  → ese monto (0 = este servicio
--                                         no pide anticipo aunque haya
--                                         monto general)
--   service_types.deposit_mxn NULL      → tenants.anticipo_mxn (o 0)
-- Se pide anticipo si y solo si el resultado es > 0.
alter table service_types add column if not exists deposit_mxn int;
alter table service_types drop constraint if exists service_types_deposit_mxn_check;
alter table service_types add constraint service_types_deposit_mxn_check
  check (deposit_mxn is null or deposit_mxn between 0 and 100000);

-- ── 3. Estado del anticipo y de los avisos en cada cita ─────────────
alter table bookings
  add column if not exists deposit_status text,
  -- El monto se COPIA al apartar: si el negocio cambia su precio
  -- mañana, lo que este cliente debe no cambia.
  add column if not exists deposit_mxn int,
  add column if not exists hold_expires_at timestamptz,
  add column if not exists deposit_paid_at timestamptz,
  -- Id del pago en el proveedor (Mercado Pago) o referencia manual.
  add column if not exists deposit_payment_id text,
  -- Banderas de envío para los crons: se ponen en el MISMO update que
  -- filtra `... is null`, así un cron que corre dos veces no manda dos.
  add column if not exists reminder_24h_sent_at timestamptz,
  add column if not exists reminder_2h_sent_at timestamptz,
  add column if not exists followup_sent_at timestamptz,
  add column if not exists customer_confirmed_at timestamptz;

alter table bookings drop constraint if exists bookings_deposit_status_check;
alter table bookings add constraint bookings_deposit_status_check
  check (deposit_status is null or deposit_status in ('pending', 'paid', 'waived', 'released'));
-- Un apartado sin vencimiento nunca se liberaría solo.
alter table bookings drop constraint if exists bookings_deposit_hold_check;
alter table bookings add constraint bookings_deposit_hold_check
  check (deposit_status is distinct from 'pending' or hold_expires_at is not null);
alter table bookings drop constraint if exists bookings_deposit_mxn_check;
alter table bookings add constraint bookings_deposit_mxn_check
  check (deposit_mxn is null or deposit_mxn >= 0);

-- El barrido de vencidos se corre "perezosamente" en cada mensaje de
-- WhatsApp y antes de calcular disponibilidad: tiene que ser barato.
-- Parcial: solo indexa los apartados vivos, que son un puñado.
create index if not exists bookings_hold_pendiente_idx
  on bookings (hold_expires_at)
  where deposit_status = 'pending';

-- ── 4. Mercado Pago Connect (fase 2) ────────────────────────────────
--
-- Tokens OAuth de la cuenta de Mercado Pago DEL NEGOCIO: con ellos se
-- cobra a su nombre, así que siguen el patrón de
-- tenant_billing_credentials (db/034): RLS encendido y CERO policies,
-- solo service_role. El panel sabe si está conectado leyendo con
-- service_role DESPUÉS de verificar membresía en el servidor — más
-- simple que una función SECURITY DEFINER y no expone nada al cliente.
create table if not exists tenant_mp_connections (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null unique references tenants(id) on delete cascade,
  mp_user_id        text not null,
  -- Cifrados en la app antes de guardar (nunca en claro).
  access_token_enc  text not null,
  refresh_token_enc text,
  token_expires_at  timestamptz,
  public_key        text,
  live_mode         boolean not null default false,
  scope             text,
  connected_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table tenant_mp_connections enable row level security;
-- Sin policies a propósito: solo service_role.

-- Mercado Pago reintenta sus webhooks: la llave primaria sobre el id
-- del evento es lo que evita marcar (o avisar) un pago dos veces.
create table if not exists mp_anticipo_events (
  event_id    text primary key,
  tenant_id   uuid references tenants(id) on delete cascade,
  received_at timestamptz not null default now()
);
alter table mp_anticipo_events enable row level security;
-- Sin policies a propósito: solo service_role.

-- `state` del OAuth: tabla y no firma HMAC porque así es de UN SOLO USO
-- (se borra al consumirlo) sin depender de otro secreto de entorno, y
-- liga el regreso de Mercado Pago al negocio que inició la conexión.
-- Quien lo consume debe rechazar los de más de ~10 minutos.
create table if not exists mp_oauth_states (
  state      text primary key,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table mp_oauth_states enable row level security;
-- Sin policies a propósito: solo service_role.

comment on column tenants.anticipo_enabled is 'Bot de citas con anticipo. Apagado = las citas se confirman directo, como siempre.';
comment on column service_types.deposit_mxn is 'Anticipo de este servicio en pesos. NULL = usa tenants.anticipo_mxn; 0 = sin anticipo.';
comment on column bookings.deposit_status is 'pending (apartada, corre hold_expires_at) | paid | waived (el negocio lo perdonó) | released (venció; la cita queda cancelled).';
comment on table tenant_mp_connections is 'OAuth de Mercado Pago del negocio. Tokens cifrados. Solo service_role.';
comment on table mp_anticipo_events is 'Dedup de webhooks de anticipos por id de evento. Solo service_role.';
comment on table mp_oauth_states is 'state del OAuth de Mercado Pago, de un solo uso. Solo service_role.';
