-- ============================================================
-- 038 · create_booking resuelve el contacto
--
-- Segunda mitad de db/037. La tabla `contacts` por sí sola no sirve de
-- nada si nadie la llena: esto hace que CADA reserva —venga del flujo
-- público o del panel— resuelva a una persona en vez de crear otra
-- fila anónima.
--
-- POR QUÉ AQUÍ DENTRO Y NO EN LA APLICACIÓN.
--
-- `create_booking` ya es la transacción atómica que protege contra el
-- doble-booking: si el `exclude` constraint rechaza la cita, TODO se
-- revierte y no queda un `customers` huérfano (ver db/005). Resolver el
-- contacto desde la app significaría dos viajes separados, y una cita
-- rechazada dejaría un contacto creado que nadie pidió. Aquí dentro,
-- el contacto nace y muere con la cita.
--
-- EL TELÉFONO NORMALIZADO ES LA LLAVE.
--
-- La gente teclea "618 123 4567", "+52 618 1234567", "6181234567". Sin
-- normalizar, cada forma crea un contacto distinto y volvemos al
-- problema original. Se guardan SOLO los dígitos; el formato bonito
-- vive en `customers`, que es la foto de lo que escribió esa vez.
--
-- `on conflict do nothing` + un `select` después, y no `do update`: si
-- el contacto ya existe, su nombre y sus notas son los que el negocio
-- curó en la ficha. Que una reserva nueva —donde alguien escribió
-- "maria" en minúsculas— sobreescriba "María Fernanda Gómez" sería
-- perder trabajo humano a manos de un formulario público.
-- ============================================================

create or replace function create_booking(
  p_tenant_id        uuid,
  p_resource_id      uuid,
  p_service_type_id  uuid,
  p_starts_at        timestamptz,
  p_ends_at          timestamptz,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_email   text default null,
  p_notes            text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_booking_id  uuid;
  v_contact_id  uuid;
  v_phone_key   text;
begin
  -- Solo dígitos. Cadena vacía → NULL, para no chocar contra el índice
  -- único con un montón de contactos "sin teléfono" que en realidad
  -- son personas distintas.
  v_phone_key := nullif(regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g'), '');

  if v_phone_key is not null then
    insert into contacts (tenant_id, name, phone, email)
    values (p_tenant_id, p_customer_name, v_phone_key, p_customer_email)
    on conflict (tenant_id, phone) where phone is not null do nothing;

    select id into v_contact_id
    from contacts
    where tenant_id = p_tenant_id and phone = v_phone_key;

    -- Si el contacto ya existía sin correo y ahora sí lo dio, se
    -- completa. Es lo único que una reserva puede añadir sin pisar
    -- nada: rellenar un hueco, nunca reemplazar un dato.
    if p_customer_email is not null then
      update contacts
      set email = p_customer_email, updated_at = now()
      where id = v_contact_id and email is null;
    end if;
  else
    -- Sin teléfono no hay identidad que reusar, así que se crea uno
    -- suelto. El negocio puede fusionarlo a mano después si resulta
    -- ser alguien que ya conocía.
    insert into contacts (tenant_id, name, email)
    values (p_tenant_id, p_customer_name, p_customer_email)
    returning id into v_contact_id;
  end if;

  -- `customers` sigue guardando lo que la persona escribió ESTA vez,
  -- con su formato original. Ahora además apunta a quién es.
  insert into customers (tenant_id, name, phone, email, contact_id)
  values (p_tenant_id, p_customer_name, p_customer_phone, p_customer_email, v_contact_id)
  returning id into v_customer_id;

  insert into bookings (tenant_id, resource_id, service_type_id, customer_id, starts_at, ends_at, notes)
  values (p_tenant_id, p_resource_id, p_service_type_id, v_customer_id, p_starts_at, p_ends_at, p_notes)
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

comment on function create_booking is
  'Crea cita + customer + resuelve contact, todo en una transacción. Si el exclude constraint rechaza la cita, no queda ningún rastro. El contacto se busca por teléfono normalizado a dígitos.';
