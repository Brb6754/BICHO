-- ============================================================
-- 039 · Reuniones
--
-- El cuarto módulo: agendar reuniones con prospectos. Es "citas" con
-- otra pregunta detrás — una cita vende un servicio con precio, una
-- reunión abre una venta que todavía no existe.
--
-- POR QUÉ NO ES UNA TABLA NUEVA.
--
-- Una reunión ocupa a la MISMA persona, en el MISMO calendario, que
-- una cita. Si viviera en `meetings`, el `exclude` constraint de
-- `bookings` no la vería: un asesor podría tener una videollamada y
-- una instalación encimadas, y Postgres aceptaría las dos. Postgres no
-- sabe hacer un exclude entre dos tablas, así que la única forma de
-- conservar la garantía más importante del producto (decisión de
-- arquitectura #1) es que una reunión SEA una cita con otra
-- naturaleza. Gratis vienen también `get_available_slots`,
-- `schedule_blocks` y la transacción atómica de `create_booking`.
--
-- Lo mismo con `service_types`: un tipo de reunión es un nombre + una
-- duración, que es exactamente lo que ya guarda esa tabla. Lo único
-- que le falta es CÓMO ocurre (video, en sitio, en oficina).
-- ============================================================

alter table tenants
  add column if not exists reuniones_enabled boolean not null default false;

comment on column tenants.reuniones_enabled is
  'Modulo de reuniones, prendido por negocio. False por defecto: es un extra que se vende aparte, igual que cotizaciones y facturacion.';

-- ============================================================
-- Tipos de reunión = service_types con otra naturaleza
-- ============================================================
alter table service_types
  add column if not exists kind text not null default 'servicio'
    check (kind in ('servicio', 'reunion')),
  -- La modalidad es del TIPO, no de la reunión: "visita técnica"
  -- siempre es en sitio, y preguntárselo al prospecto sería hacerle
  -- tomar una decisión que el negocio ya tomó.
  add column if not exists modality text
    check (modality is null or modality in ('video', 'sitio', 'oficina'));

comment on column service_types.kind is
  'servicio = lo que se vende y se agenda en /reservar. reunion = lo que se agenda en /reuniones. La pagina publica de citas filtra por esto.';

-- ============================================================
-- La reunión en sí
-- ============================================================
alter table bookings
  add column if not exists kind text not null default 'cita'
    check (kind in ('cita', 'reunion')),
  -- La modalidad se COPIA del tipo al agendar en vez de leerse por
  -- join: si el negocio cambia "Visita técnica" de sitio a video el
  -- mes que viene, una reunión que ya ocurrió no puede cambiar de
  -- lugar retroactivamente. Mismo criterio que congelar el IVA en una
  -- cotización ya enviada.
  add column if not exists modality text
    check (modality is null or modality in ('video', 'sitio', 'oficina')),
  add column if not exists address text
    check (address is null or length(address) <= 300),
  -- A quién representa. En una cita el cliente es una persona; en una
  -- reunión suele ser una persona DE una empresa, y el asesor necesita
  -- las dos cosas.
  add column if not exists company text
    check (company is null or length(company) <= 160),

  -- El resultado comercial. NULL mientras nadie lo captura: un default
  -- 'pendiente' mentiría sobre una reunión que es mañana, y obligaría
  -- a distinguir "pendiente porque no ha pasado" de "pendiente porque
  -- nadie la capturó".
  add column if not exists outcome text
    check (outcome is null or outcome in ('interesado', 'cotizado', 'ganado', 'perdido')),
  add column if not exists outcome_notes text
    check (outcome_notes is null or length(outcome_notes) <= 2000),
  -- La cotización que salió de esta reunión. `set null` y no `cascade`:
  -- borrar una cotización no puede borrar la reunión donde se habló de
  -- ella.
  add column if not exists quote_id uuid references quotes(id) on delete set null;

comment on column bookings.kind is
  'cita = agenda de servicio. reunion = prospecto comercial. Comparten tabla para compartir el exclude constraint: un asesor no puede tener las dos encimadas.';
comment on column bookings.outcome is
  'NULL = todavia sin capturar. Es el unico campo del pipeline que el negocio llena a mano, despues de que la reunion ocurre.';

create index if not exists bookings_tenant_kind_idx
  on bookings (tenant_id, kind, starts_at desc);

-- ============================================================
-- create_booking acepta los campos de reunión
--
-- `drop` + `create` y no `create or replace`: agregar parámetros
-- cambia la firma, y un `replace` con firma distinta crea un overload
-- nuevo en vez de reemplazar el viejo — trampa ya documentada en este
-- proyecto desde db/010.
--
-- Todo lo nuevo lleva default, así que las llamadas de 9 argumentos
-- que ya existen (flujo público de citas, panel) siguen resolviendo
-- igual y crean una 'cita'.
-- ============================================================
drop function if exists create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text);

create function create_booking(
  p_tenant_id        uuid,
  p_resource_id      uuid,
  p_service_type_id  uuid,
  p_starts_at        timestamptz,
  p_ends_at          timestamptz,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_email   text default null,
  p_notes            text default null,
  p_kind             text default 'cita',
  p_modality         text default null,
  p_address          text default null,
  p_company          text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_customer_id uuid;
  v_booking_id  uuid;
  v_contact_id  uuid;
  v_phone_key   text;
begin
  v_phone_key := nullif(regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g'), '');

  if v_phone_key is not null then
    insert into contacts (tenant_id, name, phone, email)
    values (p_tenant_id, p_customer_name, v_phone_key, p_customer_email)
    on conflict (tenant_id, phone) where phone is not null do nothing;

    select id into v_contact_id
    from contacts
    where tenant_id = p_tenant_id and phone = v_phone_key;

    if p_customer_email is not null then
      update contacts
      set email = p_customer_email, updated_at = now()
      where id = v_contact_id and email is null;
    end if;
  else
    insert into contacts (tenant_id, name, email)
    values (p_tenant_id, p_customer_name, p_customer_email)
    returning id into v_contact_id;
  end if;

  -- La razón social se rellena solo si el contacto no tenía una. Misma
  -- regla que el correo: una reunión puede llenar un hueco, nunca
  -- pisar lo que el negocio ya curó en la ficha.
  if p_company is not null and v_contact_id is not null then
    update contacts
    set razon_social = p_company, updated_at = now()
    where id = v_contact_id and razon_social is null;
  end if;

  insert into customers (tenant_id, name, phone, email, contact_id)
  values (p_tenant_id, p_customer_name, p_customer_phone, p_customer_email, v_contact_id)
  returning id into v_customer_id;

  insert into bookings (
    tenant_id, resource_id, service_type_id, customer_id,
    starts_at, ends_at, notes, kind, modality, address, company
  )
  values (
    p_tenant_id, p_resource_id, p_service_type_id, v_customer_id,
    p_starts_at, p_ends_at, p_notes,
    coalesce(p_kind, 'cita'), p_modality, p_address, p_company
  )
  returning id into v_booking_id;

  return v_booking_id;
end;
$fn$;

comment on function create_booking is
  'Crea cita o reunion + customer + resuelve contact, todo en una transaccion. Si el exclude constraint la rechaza, no queda ningun rastro. El contacto se busca por telefono normalizado a digitos.';

revoke all on function create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text, text, text, text, text) from public;
revoke all on function create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text, text, text, text, text) from anon;
revoke all on function create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text, text, text, text, text) from authenticated;
grant execute on function create_booking(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text, text, text, text, text) to service_role;
