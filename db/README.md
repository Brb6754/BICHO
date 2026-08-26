# db/ — decisiones de diseño

## 001_schema.sql

- **UUIDs, no serial ints.** IDs no deben ser adivinables/secuenciales,
  especialmente `tenants.id` y `customers.id`.
- **`tenants.slug`** restringido por check constraint a
  `[a-z0-9]+(-[a-z0-9]+)*` porque se usa como subdominio público
  (`{slug}.tuapp.com`) — es superficie de ataque si se permite cualquier
  string.
- **`business_users`** es la tabla de membresía (auth.users ↔ tenants) con
  `role` en (`owner`, `staff`). Todo el sistema de permisos de RLS depende
  de esta tabla.
- **`bookings.no_overlapping_bookings`** — `exclude using gist` sobre
  `(resource_id, tstzrange(starts_at, ends_at))` filtrando `status <>
  'cancelled'`. Esto es la última línea de defensa contra doble-booking:
  incluso si la app tiene una condición de carrera (dos requests
  simultáneas intentando reservar el mismo horario), Postgres rechaza el
  segundo insert a nivel de constraint. Requiere la extensión
  `btree_gist` porque `resource_id` es un `uuid`, no un tipo nativo de
  rango.
- **`service_types.requires_staff`** — existe desde ahora aunque el MVP
  solo cubre peluquero/dentista (que siempre requieren staff), para que
  agregar padel después (`requires_staff = false`, sin `staff_user_id` en
  el booking) no requiera una migración de schema.
- **`payments.provider_payment_id`** guarda el ID de Stripe/Mercado Pago
  para reconciliar con el webhook.

## 002_rls_policies.sql

- **Funciones helper en schema `private`, `SECURITY DEFINER`.** Dos
  razones: (a) PostgREST solo expone schemas listados en su config
  (normalmente `public`), así que `private` nunca se vuelve un endpoint
  de API por accidente; (b) `SECURITY DEFINER` hace que la función corra
  con los privilegios de quien la creó, no del caller — así puede leer
  `business_users` sin que se re-dispare RLS sobre `business_users` (lo
  cual causaría recursión infinita si una policy de `business_users`
  tuviera que consultar `business_users` bajo su propia RLS).
- **`tenants` y el catálogo (`resources`, `service_types`) tienen SELECT
  público** porque la página pública de reserva necesita mostrarlos sin
  sesión. Todo lo demás (`business_users`, `customers`, `bookings`,
  `payments`) NO tiene ninguna policy para el rol `anon` — cero acceso.
- **`customers`, `bookings`: sin policy de insert/update para `anon`.**
  El flujo público de reserva no pasa por Postgres con el JWT del
  visitante; pasa por una API route de Next.js usando el `service_role`
  key, que ignora RLS completamente. Razón (repetida de CLAUDE.md):
  `customers` tiene PII que no debe ser accesible por RLS a `anon`, y la
  secuencia disponibilidad → crear booking → intentar cobro necesita ser
  una sola transacción del lado del servidor — RLS por fila no puede
  expresar "todo esto o nada".
- **`payments` es de solo lectura para miembros del tenant.** Los pagos
  solo se escriben desde el webhook de Stripe/Mercado Pago (vía
  `service_role`), nunca desde un usuario logueado directamente — así que
  no existe policy de insert/update/delete para business_users.

## Pendiente / no resuelto todavía

- No hay constraint de unicidad en `customers` (ej. por `tenant_id,
  phone`) — se dejó fuera hasta decidir cómo se maneja duplicados/upsert
  en el flujo de reserva pública.
- `resources`/`service_types`: cualquier miembro del tenant (owner o
  staff) puede crear/editar/borrar. Si en el futuro se quiere que solo el
  owner pueda tocar el catálogo, cambiar `private.is_member_of_tenant` por
  `private.is_owner_of_tenant` en esas policies de insert/update/delete.
- Ningún FK compuesto valida que `resource_id`/`customer_id`/etc.
  realmente pertenezcan al mismo `tenant_id` que se está insertando en la
  fila hija (ej. en teoría alguien con acceso de escritura podría meter un
  `booking` con `tenant_id` de un tenant y `resource_id` de otro). No es
  explotable por un `anon` gracias a RLS, pero sí es una hendidura de
  integridad de datos si un bug de la app manda IDs mezclados. Posible
  mejora futura: FKs compuestos `(id, tenant_id)` o un trigger de
  validación.

## 003_resource_schedules.sql / 004_availability_function.sql

- **Horario por `resource`, no por `tenant`.** Así un negocio con dos
  profesionales de horarios distintos (o una cancha con horario propio)
  no necesita ningún truco — cada `resource` es la unidad de
  disponibilidad. Decisión de Bruno: "100% personalizable".
- **`resource_schedules` permite varias filas por `(resource_id,
  day_of_week)`** a propósito, para turnos partidos (ej. 9-13 y 15-19
  con descanso de comida). No hay constraint que impida filas
  traslapadas dentro del mismo día — es un error de configuración del
  negocio, no un problema de seguridad; se podría agregar un `exclude`
  constraint después si hace falta.
- **`day_of_week` sigue la convención de Postgres `extract(dow from
  ...)`: 0=domingo .. 6=sábado.** Ojo con esto al construir cualquier UI
  de selección de días — es distinto de ISO 8601 (`extract(isodow)`,
  donde lunes=1).
- **Se agregó `tenants.timezone`** (default `America/Mexico_City`,
  nombre IANA) porque un horario tipo "abre a las 9:00" no tiene sentido
  sin saber en qué zona horaria — y usar el nombre de zona en vez de un
  offset fijo hace que Postgres maneje el horario de verano
  automáticamente.
- **`get_available_slots(...)` vive en `public`** (no en `private`)
  porque se llama como RPC directo desde la app (dashboard y, más
  adelante, la página pública de reserva). Es `security definer` porque
  necesita leer `bookings` para saber qué horarios ya están ocupados,
  incluso cuando quien llama es `anon` (que no tiene policy de select en
  `bookings`) — es seguro exponerlo así porque solo devuelve rangos de
  tiempo libres/ocupados, nunca detalles de la cita ni del cliente.
- **Los slots se generan "pegados" uno tras otro**, del tamaño exacto de
  la duración del servicio, empezando justo cuando abre la ventana de
  horario — no están alineados a una cuadrícula fina independiente (cada
  15/30 min). Simplificación deliberada para el MVP.
- **Probada en vivo** (2026-08-17) contra un tenant/resource/schedule de
  prueba (`test-salon`, slug de prueba, sigue en la base): se confirmó
  que respeta el horario configurado (incluyendo el corte correcto de
  fin de semana) y que una cita ya existente hace desaparecer ese slot de
  los resultados.

## 005_create_booking_function.sql

- **`create_booking(...)` es una función plpgsql, no dos inserts sueltos
  desde la API route.** Un solo `insert` a `customers` seguido de un
  `insert` a `bookings` dentro de la MISMA llamada a función es
  atómico en Postgres: si el segundo insert falla (por ejemplo, choca con
  `no_overlapping_bookings`), el primero se revierte automáticamente. Es
  la implementación concreta de la decisión de arquitectura #3
  ("disponibilidad + reserva + cobro en una sola transacción del lado del
  servidor") para la mitad de disponibilidad+reserva — el cobro se suma
  en el paso 7.
- **Acceso revocado de `public` y otorgado solo a `service_role`**
  (`revoke ... from public` + `grant ... to service_role`), a diferencia
  de `get_available_slots` que sí es público. Diferencia clave: esta
  función escribe PII (`customers`) — no debe ser invocable directo por
  `anon`/`authenticated` bajo ninguna circunstancia, solo a través de
  `/api/reservar` con la `service_role` key.
- **Probada en vivo** (2026-08-18): reserva real creada de punta a punta
  desde `/reservar`, y un segundo intento sobre el mismo horario
  confirmado rechazado (409, código Postgres `23P01`) sin dejar un
  `customers` huérfano.
