# CLAUDE.md — Plataforma SaaS de Reservas Multi-Tenant

Este archivo es contexto para Claude Code (u otro LLM) retomando este proyecto.
Ponlo en la raíz del repo — Claude Code lo lee automáticamente al arrancar.

## Cómo quiere trabajar el dueño del proyecto (IMPORTANTE — leer primero)

Bruno (el dueño) **quiere escribir el código él mismo**, paso a paso. NO generes
archivos completos de golpe ni resuelvas todo de una vez, aunque técnicamente
puedas. Tu rol es:
- Explicar el "por qué" antes de que él escriba algo.
- Dar un paso concreto a la vez, esperar confirmación de que lo hizo, y recién
  entonces seguir al siguiente.
- Revisar lo que él escriba: señalar bugs, huecos de seguridad (sobre todo
  fugas de aislamiento entre tenants) o desviaciones del diseño ya acordado.
- Si detectas que un paso es grande, pártelo en sub-pasos en vez de resolverlo
  tú de un jalón.

No asumas que quiere que resuelvas o generes código salvo que lo pida
explícitamente para un caso puntual (ej. "escríbeme la función X").

## Quién es el dueño del proyecto

Bruno — estudiante de 4to semestre de Ingeniería en Inteligencia Artificial
(Universidad Panamericana, Aguascalientes), basado en Durango, México. Hace
marketing freelance para Nova Solar Energy. Meta de carrera: Data Science/AI
para negocios (fintech + marketing). Este proyecto es tanto una idea de
venture como una pieza de portafolio técnico.

**Entorno de desarrollo**: Windows. Node.js ya instalado (v24.19.0, npm
11.17.0). Cuenta de Supabase: aún no creada — ese es el siguiente paso
pendiente antes de tocar código de Next.js.

## Qué es el proyecto

SaaS multi-tenant de reservas de citas + catálogo de servicios + cobro en
línea, para negocios pequeños de servicios (peluquerías, dentistas, canchas
de padel) que hoy gestionan citas por WhatsApp o en papel.

**Decisión de arquitectura clave**: NO se construye una app por vertical. Es
una sola aplicación multi-tenant donde cada negocio es un "tenant", y la
vertical (peluquero/dentista/padel) es solo un preset de configuración sobre
un modelo de datos genérico de "recurso reservable" (silla, consultorio,
cancha) + servicio + cita + pago.

## Stack

Next.js 14 (App Router) + Postgres vía Supabase + Stripe (fase 1) + Mercado
Pago (fase 2) + Vercel + Tailwind.

**Dos capas de usuario**:
- Super-admin (dueño de la plataforma): panel en `admin.tuapp.com`
- Tenant apps: cada negocio en `{slug}.tuapp.com`, con dashboard propio
  (owner/staff) y página pública de reserva

## Estado actual del proyecto (qué ya existe)

Proyecto de Supabase creado (plan Free, org "Brb6754's Org"). `db/001_schema.sql`
y `db/002_rls_policies.sql` ya aplicados y verificados ahí (7 tablas
visibles en Table Editor, RLS activo, `bookings` muestra 4 policies).

Carpeta `db/` con:
- `db/001_schema.sql` — tablas `tenants`, `business_users`, `resources`,
  `service_types`, `customers`, `bookings`, `payments`.
- `db/002_rls_policies.sql` — helpers en schema `private` + policies de
  RLS para las 7 tablas.
- `db/003_resource_schedules.sql` — columna `tenants.timezone` +  tabla
  `resource_schedules` (horario semanal recurrente, por `resource`, 100%
  personalizable) + RLS. Aplicado en Supabase.
- `db/004_availability_function.sql` — función `get_available_slots(...)`
  (RPC pública, `SECURITY DEFINER`). Aplicada y **probada en vivo**: se
  creó un tenant/resource/service/schedule de prueba, se confirmó que
  respeta el horario configurado (incluye el corte correcto de fin de
  semana) y que una cita ya reservada desaparece de los huecos libres.
  Datos de prueba (`test-salon`) siguen en la base — pendiente decidir si
  se limpian antes de seguir.
- `db/README.md` — decisiones de diseño detrás de todo lo anterior.

Todo el SQL de `db/` lo ha escrito Claude a petición explícita de Bruno
(normalmente escribe el código él mismo, ver arriba — en esta sesión pidió
que se generara, revisando y aprobando cada pieza antes de aplicarla).

Scaffold de Next.js 14 (App Router) + TypeScript + Tailwind creado a mano
(no con `create-next-app`, por conflicto con `db/`/`CLAUDE.md` ya
existentes):
- `middleware.ts` — reescribe `admin.{ROOT_DOMAIN}` → `/admin/*`,
  `{slug}.{ROOT_DOMAIN}` → `/t/{slug}/*`, dominio raíz sin reescribir.
  Probado en vivo con `npm run dev` + navegador: los 3 casos funcionan
  (`localhost:3000`, `admin.localhost:3000`, `test-salon.localhost:3000`).
- `app/` — `layout.tsx` + 3 páginas placeholder (`/`, `/admin`,
  `/t/[slug]`) para verificar el ruteo antes de construir features reales.
- `lib/supabase/client.ts` (browser, anon key), `server.ts` (Server
  Components/Actions, anon key + cookies), `admin.ts` (service_role,
  bypassa RLS — solo para código server-only, ver decisión #3).
- `npm run build` pasa limpio (TypeScript strict + lint).
- `.env.local` creado con las keys reales del proyecto de Supabase,
  validado con una conexión real (la `anon` key trae el tenant de prueba
  `test-salon`, confirmando que apunta al proyecto correcto).
- Nota de seguridad: `npm audit` marca CVEs conocidos de Next.js
  (DoS/cache poisoning) sin backport a la rama 14.x, solo resueltos desde
  16.x. No bloqueante para desarrollo local; revisar antes de producción.

Se sigue el orden: DB → disponibilidad → scaffold Next.js → auth/middleware
→ dashboard → página pública de reserva → pagos.

Repo git inicializado localmente en `C:\Users\bruno\Proyectos\reservas-saas`
el 2026-08-17, sin remoto configurado aún.

## Decisiones de arquitectura ya tomadas (no las repitas ni las cuestiones sin razón)

1. **`bookings` tendrá un constraint `exclude using gist` sobre
   `(resource_id, tstzrange(starts_at, ends_at))`** para prevenir
   doble-booking a nivel de base de datos, no solo en código de aplicación.
   Es la última línea de defensa contra condiciones de carrera.

2. **RLS de Postgres en cada tabla con `tenant_id`**, para que el aislamiento
   entre negocios viva en la base de datos. Identificada como la pieza de
   seguridad más crítica de todo el proyecto — nunca debe saltarse ni
   relajarse.

3. **El flujo público de reserva (cliente final, anónimo) NO escribirá directo
   a Postgres.** Pasará por una API route de Next.js con el `service_role` key
   de Supabase (que ignora RLS por diseño). Razón: `customers` tiene PII y no
   debe ser accesible por RLS a `anon`; además la validación de
   disponibilidad + creación de reserva + intento de cobro necesitan ser una
   sola transacción del lado del servidor.

4. **`resources` y `service_types` tendrán lectura pública** (solo filas
   `active = true`) porque son el catálogo que la página pública de reserva
   necesita mostrar sin sesión.

5. **Funciones helper de RLS vivirán en schema `private`** (no `public`), y
   serán `SECURITY DEFINER`, para (a) que PostgREST no las exponga como
   endpoint de la API y (b) evitar recursión de RLS cuando una policy
   necesita consultar la misma tabla que protege (ej. `business_users`
   consultándose a sí misma para saber si alguien es owner).

## MVP: alcance recomendado

Solo 2 verticales al inicio: peluquero + dentista (comparten el modelo "cita
con profesional"). Padel se pospone — su lógica es distinta (reserva de
recurso físico sin "profesional" asociado, campo `requires_staff = false` en
`service_types` ya contempla esto para cuando se agregue).

## Modelo de negocio (contexto, no bloquea el desarrollo)

- Plan único: $499 MXN/mes (página de citas, catálogo, pasarela de pagos,
  dashboard) + add-ons de pago extra (automatización de mensajes, reportes,
  multi-sucursal, branding personalizado).
- Trial de 15 días sin tarjeta, se pide método de pago día 12, 5 días de
  ventana de recuperación en modo solo-lectura antes de suspender.

## Riesgos de negocio ya identificados (no resueltos, pero conocidos)

- Competencia real es WhatsApp gratis, no Booksy/Fresha.
- $499 MXN/mes es una cantidad significativa para negocios pequeños.
- Promesa de soporte 24/7 no es sostenible con el equipo actual.
- Cero validación de mercado real hecha hasta ahora (recomendado: 15-20
  conversaciones con dueños de negocio reales antes de escribir código de
  producción — Bruno decidió priorizar programación primero de todos modos).

## Pendientes fuera del código (no es tu trabajo resolverlos salvo que se pida)

Legal (Aviso de Privacidad LFPDPPP, T&Cs, CFDI), financiero (punto de
equilibrio, costo real por tenant, flujo de caja), producto/soporte (política
de cancelación, contenido de chatbot, definición de SLA 24/7), ventas
(guion de venta, one-pager, análisis competitivo), validación de mercado.

## Roadmap de construcción (orden acordado)

1. ~~Schema SQL + RLS~~ ✅ aplicado en Supabase
2. ~~Función de disponibilidad~~ ✅ aplicada y probada en Supabase
3. ~~Scaffold del proyecto Next.js~~ ✅ hecho y probado en el navegador
4. ~~Auth + middleware multi-tenant~~ ✅ hecho y **confirmado por Bruno en
   vivo** (2026-08-18): login real con `ruedabruno74@gmail.com` → dashboard
   muestra "Salón de Prueba / rol: owner" correctamente. `middleware.ts`
   refresca la sesión de Supabase en cada request; `/t/[slug]/login`
   (email+password) y `/t/[slug]/dashboard` (protegido: exige sesión válida
   Y fila en `business_users` para ese `tenant_id`).
5. ~~Dashboard del negocio~~ ✅ hecho y verificado (recursos, servicios,
   horarios, calendario)
6. ~~Página pública de reserva~~ ✅ hecho y verificado
7. Pagos: checkout Stripe + webhook que escribe en `payments`

**Trampa de Next.js encontrada y resuelta (2026-08-18)**: `redirect()`
llamado *dentro de un Server Action* (ej. al terminar `signIn`) NO vuelve a
pasar por `middleware.ts` — Next intenta pre-renderizar la ruta destino
directamente, sin aplicar el rewrite de subdominio, y como no existe una
ruta `/dashboard` a nivel raíz (solo `/t/[slug]/dashboard`), truena en 404.
Se depuró con un script que traza la cadena de redirects vía `http.request`
crudo (fijando el header `Host` a mano — `fetch()` no lo permite, lo
ignora en silencio) y confirmando por separado que el rewrite del
middleware, la consulta al tenant y el vínculo `business_users` sí
funcionaban. **Fix**: los Server Actions (`signIn`, `signOut` en
`app/t/[slug]/actions.ts`) ya no llaman `redirect()` — devuelven un
resultado, y la navegación real ocurre del lado del cliente
(`router.push()` en `LoginForm.tsx`/`SignOutButton.tsx`), que sí dispara
una request real que pasa por el middleware. Los `redirect()` que están
dentro de Server Components normales (ej. `dashboard/page.tsx` cuando no
hay sesión o no hay membership) **no tienen este problema** — solo aplica
a redirects disparados desde un Server Action.

Dashboard del negocio construido bajo `app/t/[slug]/dashboard/`:
- `layout.tsx` — la verificación de sesión+membership vive aquí una sola
  vez (antes estaba repetida en `dashboard/page.tsx`), compartida por
  todas las sub-secciones. Nav: Resumen / Recursos / Servicios / Horarios
  / Calendario.
- `resources/` — CRUD de recursos (crear, activar/desactivar, borrar).
- `services/` — CRUD de `service_types` (precio se captura en MXN y se
  convierte a `price_cents` en el server action; `requires_staff` es un
  checkbox).
- `schedule/` — CRUD de `resource_schedules` (selector de recurso + día +
  horas). Nota: sin el schema de Supabase generado (`Database` types), el
  embed `resources(name)` se infiere como arreglo aunque en runtime es un
  objeto — se castea explícitamente (ver comentario en el archivo). Vale
  la pena generar los tipos reales más adelante para no repetir este
  parche en cada página nueva.
- `calendar/` — lista de próximas citas (no una cuadrícula visual, no
  hacía falta para el MVP) con botón de cancelar.

Todos verificados en vivo por Bruno contra el tenant de prueba
`test-salon` (recurso "Silla 1", servicio "Corte", una cita de prueba).
Ese tenant/usuario de prueba **sigue en la base a propósito** — se acordó
dejarlo fijo mientras se construye el resto del dashboard, en vez de
recrear el usuario de Auth en cada sub-paso (Claude no puede crear
cuentas/contraseñas por Bruno, así que cada recreación requiere que él lo
haga a mano en el dashboard de Supabase).

Página pública de reserva construida:
- `db/005_create_booking_function.sql` — función `create_booking(...)`
  (plpgsql, transacción atómica: inserta `customers` + `bookings` en una
  sola llamada; si `bookings` falla por el exclude constraint, el insert
  de `customers` se revierte también — nada de clientes huérfanos).
  Acceso revocado de `public`/`anon`/`authenticated`, otorgado solo a
  `service_role`.
- `app/api/reservar/route.ts` — la única puerta de escritura del flujo
  público (usa `service_role`, valida que `resource_id`/`service_type_id`
  realmente pertenezcan al tenant del `slug` antes de reservar, traduce
  el error de Postgres `23P01` (exclusion_violation) a un 409 con mensaje
  amigable).
- `app/t/[slug]/reservar/` — página pública + `BookingForm.tsx` (client
  component). La disponibilidad se consulta **directo desde el navegador**
  vía `supabase.rpc('get_available_slots', ...)` con la `anon` key (es
  seguro, no expone PII) — solo la creación de la cita pasa por la API
  route con `service_role`.

**Bug de middleware encontrado y corregido durante la prueba**: el
rewrite de subdominio aplicaba a *todo*, incluyendo `/api/*` — una
petición a `/api/reservar` desde `test-salon.localhost` se reescribía a
`/t/test-salon/api/reservar` (que no existe) y tronaba en 404. Fix: el
middleware ahora excluye explícitamente cualquier pathname que empiece
con `/api` del rewrite de subdominio (las rutas de API son
infraestructura compartida, no páginas de un tenant).

**Verificado en vivo por Claude** (esta parte no requiere contraseñas,
así que sí se pudo probar de punta a punta sin intervención de Bruno):
reserva creada correctamente vía el flujo público completo (elegir
servicio → recurso → horario → datos → confirmar), y un segundo intento
de reservar exactamente el mismo horario fue rechazado con 409 sin dejar
un cliente huérfano.

**Sistema de diseño (2026-08-18)**: rediseño visual fintech-premium
aplicado a toda la app (no solo landing), a petición de Bruno, con
referencias (Abinsa/Monank/Quiety) y un prompt detallado. Pagos (paso 7)
se pospuso para priorizar esto.
- Tokens en `tailwind.config.ts`: `primary` (#0E3B2C, verde bosque),
  `accent` (#8FE24A, lima), `paper`/`ink`/`muted` para fondo/texto.
  Tipografía Inter vía `next/font/google` (`app/layout.tsx`).
- Componentes base en `components/ui/`: `Button` (variantes `primary`,
  `secondary`, `ghost`, `ghost-inverse`, `danger`), `Card`, `Badge`
  (`tone`: `default`/`muted`/`danger`/`inverse`), `Input`, `Select`,
  `Label`. Todas las páginas existentes (dashboard, login, reservar,
  placeholders) ya los usan.
- **Trampa real encontrada**: pasar `className="bg-white/10 text-accent"`
  a un componente cuya clase base ya trae `text-primary` NO garantiza que
  gane el override — el orden de las clases en el string de `className`
  no es el que decide en CSS, es el orden en que Tailwind las generó en
  la hoja de estilos, que no es controlable de forma confiable. Pasó de
  verdad con `Badge` (texto ilegible, verde oscuro sobre verde oscuro) y
  se hubiera repetido con el botón de "Cerrar sesión". Fix aplicado:
  `Badge`/`Button` NO aceptan overrides de color por `className` — cada
  variante/tono es un string de clases completo y autocontenido
  (`ghost-inverse`, tonos de `Badge`, etc.). Si se agregan más variantes
  de color a futuro, seguir este mismo patrón, nunca confiar en que un
  `className` adicional le va a ganar a la clase base.
- Contraste de texto sobre `primary` verificado con la fórmula de
  contraste WCAG (no a ojo, vía script): 6.9:1–12.5:1 en los casos
  probados, todos muy por encima del mínimo AA (4.5:1).
- **Pendiente de confirmar por Bruno**: Claude verificó compilación y
  contraste programáticamente, pero no pudo tomar capturas de pantalla
  (el panel del navegador no estaba visible en esa sesión) — falta que
  Bruno lo vea con sus propios ojos en el navegador.

Rediseño confirmado visualmente por Bruno el mismo día.

**Panel interno de super-admin (2026-08-18)**, en `admin.{ROOT_DOMAIN}` —
pedido explícito de Bruno con spec detallado (vista de tenants, detalle
por tenant, galería/editor de plantillas). Pagos (paso 7) sigue
pospuesto.

- `db/006_platform_admins_and_tenant_metadata.sql` — tabla
  `platform_admins` (equipo interno, separada de `business_users` porque
  un super-admin no pertenece a un tenant; **cero policies de RLS para
  anon/authenticated a propósito** — la membresía solo se checa vía
  `service_role`, nunca vía el cliente normal). Agrega columnas reales
  (no mockeadas) a `tenants`: `vertical`, `status`
  (`trial`/`active`/`suspended`/`cancelled`), `plan`.
- `db/007_templates.sql` — tabla `templates` (mismo patrón de acceso que
  `platform_admins`: sin RLS, solo `service_role`) con las 3 plantillas
  ya conocidas (peluquería y dentista disponibles, pádel en espera —
  coincide con la decisión ya tomada de "solo 2 verticales al inicio").
  Guarda `accent_color` como **hex, no clase de Tailwind** — un nombre de
  clase que llega en runtime desde la base no existe en el CSS generado
  en build time por Tailwind, así que el color se aplica con `style`
  inline, no `className`.
- Auth del panel: `app/admin/login/` + `app/admin/actions.ts` (mismo
  patrón "no `redirect()` dentro de un Server Action" ya documentado
  arriba) + `app/admin/(panel)/layout.tsx` como el gate real (chequea
  `platform_admins` vía `service_role`) — el grupo de rutas `(panel)`
  no afecta la URL, así que `/tenants`, `/templates`, `/settings` quedan
  protegidos pero `/login` no.
- `app/admin/(panel)/tenants/` — overview (tabla real de `tenants` +
  filtros por estado/vertical/fecha + búsqueda; métricas: total/activos/
  trial reales, MRR = activos × $499 MXN — real solo en el sentido de que
  se calcula de un número real, no hay facturación de verdad todavía —
  y churn con placeholder fijo, ambos anotados como tal en el código) y
  detalle por tenant (`[tenantId]/`: dueño real vía `business_users` +
  Admin API de Supabase Auth, conteos de citas/clientes/cancelación
  reales contra `bookings`/`customers`, gráfica de citas por semana real
  con SVG simple sin librería, pagos reales de la tabla `payments`
  —vacía hasta que exista Stripe—, log de actividad **mockeado y
  marcado como tal** porque no existe un sistema de auditoría real,
  acciones rápidas: suspender/reactivar y cambiar plan son reales
  —escriben en `tenants`—, "resetear onboarding" es un botón
  deshabilitado porque no existe ese concepto todavía, "contactar al
  dueño" es un `mailto:` real).
- `app/admin/(panel)/templates/` — galería + editor real (nombre,
  disponible/en espera, color, features, servicios por defecto, campos
  del formulario de reserva), con "Duplicar" (inserta una copia con
  vertical único tipo `-copia`) y conteo real de tenants por vertical.
- **Trampa de Tailwind repetida varias veces en este panel** (mismo
  patrón que el de `Badge`/`Button` de arriba, pero con propiedades
  distintas): pasar `className="p-5"` o `className="w-24"` a un
  componente cuya clase base ya trae `p-6`/`w-full` tampoco gana de
  forma confiable. Se corrigió dándole a `Card` una prop `padded` real
  y quitándole a `Input`/`Select` el `w-full` por defecto (los que lo
  necesitan lo agregan explícito). Regla general reafirmada: **cualquier
  prop de un componente base que un caller podría querer cambiar
  (padding, ancho, color) debe ser una prop explícita, nunca algo que se
  espera vencer por `className`.**

`006` y `007` ya aplicados y probados en vivo por Bruno (login del panel
funcionando con `ruedabruno74@gmail.com`, vinculado en `platform_admins`
— nota: la base también tiene un segundo usuario,
`brunoruedabeta@gmail.com`, que NO está vinculado; si algún día el login
del panel "rebota sin razón", es probablemente por entrar con esa cuenta).

**Editor de plantillas con drag-and-drop (2026-08-18)**: Bruno pidió algo
"tipo Wix" para el editor de plantillas. Se acotó explícitamente a
reordenar bloques de contenido verticalmente (arrastrar secciones
arriba/abajo), no un canvas 2D libre estilo Webflow — eso sería un
proyecto aparte.

- `db/008_template_blocks.sql` — agrega `templates.blocks` (jsonb: array
  ordenado de `{id, type, props}`). Tipos de bloque: `hero`, `text`,
  `features`, `testimonial`, `booking`. El bloque `booking` es especial:
  siempre debe existir exactamente uno (se puede mover, no se puede
  borrar — la UI lo impide) porque es lo que hace que la página realmente
  funcione. Backfill: las 3 plantillas sembradas en `007` recibieron un
  layout por defecto (hero + features + booking) construido a partir de
  sus campos existentes.
- **`lib/templates/blocks.ts`** — los tipos de bloque compartidos.
- **`components/blocks/BlockRenderer.tsx`** — la pieza clave de diseño:
  es el MISMO componente que dibuja los bloques tanto en el editor
  (`TemplateBuilder.tsx`, sin `bookingData` → muestra un placeholder para
  el bloque de reserva) como en la página pública real
  (`app/t/[slug]/reservar/page.tsx`, con `bookingData` real → renderiza el
  `BookingForm` interactivo de verdad). Lo que se ve en el editor es
  literalmente lo que se va a servir — no son dos implementaciones que se
  puedan desincronizar.
- `BookingForm` se movió de `app/t/[slug]/reservar/` a
  `components/booking/` porque ahora lo usan dos lugares (la página
  pública directamente, y `BlockRenderer` cuando el bloque `booking`
  tiene datos reales).
- **`app/admin/(panel)/templates/[templateId]/TemplateBuilder.tsx`** —
  client component con `@dnd-kit` (`core`+`sortable`+`utilities`,
  librería nueva, instalada). Lista vertical arrastrable (`useSortable` +
  `SortableContext`), menú "+" para agregar bloques (todos menos
  `booking`), edición inline por bloque, panel de vista previa en vivo al
  lado usando el mismo `BlockRenderer`. Guarda vía
  `updateTemplateBlocks` — un Server Action invocado directamente como
  función desde el cliente (`.bind(null, templateId)` pasado como prop),
  no a través de un `<form>`; es un patrón distinto pero igual de válido
  al que se usa en el resto del proyecto.
- **Trampa nueva encontrada**: `Card` no tenía `forwardRef`, así que no
  podía recibir la `ref` que `@dnd-kit`'s `useSortable` necesita para
  enganchar el elemento del DOM arrastrable. Se convirtió a
  `forwardRef` (mismo patrón que `Button`/`Input`/`Select`).
- La página pública (`reservar/page.tsx`) hace fallback silencioso al
  formulario simple (sin bloques) si la plantilla no tiene bloques o no
  existe para ese `vertical` — así no se rompe nada mientras `008` no
  esté aplicada, ni para tenants con `vertical = 'general'` sin plantilla
  asociada.
- Verificado por Claude (sin necesitar sesión, ya que la página pública
  no pide login): compila limpio, `/reservar` sigue funcionando después
  de mover `BookingForm`, fallback confirmado mientras `008` seguía sin
  aplicar en ese momento de la sesión.

`008` aplicada y editor de drag-and-drop probado en vivo por Claude
(agregar bloques, la vista previa del editor coincide con lo que sirve
`/reservar`).

**Redefinición de "Tenant" + rediseño del flujo de reserva (2026-08-18,
misma sesión)**: Bruno corrigió el rumbo — el Tenant no es un sitio web
tipo Wix, es una experiencia de reservas enfocada (Calendly/Fresha/Stripe
Checkout como referencia, no copiar). Mandó un spec de 17 secciones; se
acotó a 2 fases para esta sesión: fundación de marca + rediseño del flujo
de reserva en sí (las fases 3-5 del spec — temas como entidad separada,
bloques específicos de reserva, preview responsivo — quedan pendientes).

**Decisión de arquitectura resuelta con Bruno**: la marca (logo, colores,
tipografía) la configura el **equipo interno desde el panel admin**, no
cada dueño de negocio en su propio dashboard — por eso vive en
`/admin/tenants/[tenantId]`, no en `/t/[slug]/dashboard`.

- `db/009_tenant_branding.sql` — columnas de marca en `tenants`
  (`description`, `theme`, `primary_color`, `secondary_color`,
  `accent_color`, `background_color`, `text_color`, `font_heading`,
  `font_body`, `logo_url`, `logo_mobile_url`, `favicon_url`,
  `cover_image_url`, `profile_image_url`) + `bookings.notes`. Las
  imágenes son URLs directas por ahora — no hay subida de archivos
  (necesitaría Supabase Storage, pieza aparte no construida).
- `db/010_booking_email_notes.sql` — `create_booking` ahora acepta
  `p_customer_email`/`p_notes` opcionales (tuvo que hacerse con `drop
  function` + `create` porque agregar parámetros cambia la firma; un
  `create or replace` con distinta firma crea un overload nuevo en vez de
  reemplazar el viejo).
- `lib/branding/fonts.ts` / `lib/branding/themes.ts` — 4 fuentes
  curadas (Inter/Playfair/Poppins/Merriweather, cargadas vía `<link>` a
  Google Fonts en runtime — `next/font` no sirve aquí porque necesita la
  familia en build time) y 6 presets de tema (Minimal/Modern/Luxury/
  Corporate/Bold/Soft) que solo rellenan colores/fuentes de inicio, no
  se aplican de forma forzada después.
- **`app/admin/(panel)/tenants/[tenantId]/BrandEditor.tsx`** — sección
  "Marca" nueva en el detalle del tenant: botones de tema, 5 color
  pickers, selects de tipografía, URLs de imágenes. Guarda vía
  `updateTenantBranding` (mismo patrón de Server Action invocado
  directo desde cliente que `updateTemplateBlocks`).
- **Flujo de reserva rediseñado** (`components/booking/BookingFlow.tsx`,
  reemplaza `BookingForm.tsx`): pasos reales con indicador de progreso
  (Servicio → Fecha → Hora → Datos → Confirmación), servicios como
  cards, selector de "¿con quién?" solo si hay más de un `resource` activo
  (si hay uno solo, se autoselecciona, sin pedirle al cliente que entienda
  el concepto de "recurso"), calendario real (`react-day-picker`, nueva
  dependencia — no reinventar aritmética de fechas a mano, ya nos
  topamos con bugs de timezone antes) con puntito bajo los días que sí
  tienen disponibilidad (un solo fetch de `get_available_slots` a 60 días,
  agrupado en el cliente por fecha), pantalla de éxito con checkmark +
  link real "Agregar al calendario" (URL de Google Calendar generada al
  vuelo, sin backend). Correo y notas del cliente ahora se capturan
  (opcionales).
- `components/blocks/BlockRenderer.tsx` ahora recibe `branding` (colores
  reales del tenant) y lo aplica por `style` inline en el bloque `hero`/
  `features`/botones — nunca por clase de Tailwind, mismo motivo de
  siempre (un color de la base de datos no tiene clase generada en build
  time).
- **`date-fns` sin configurar muestra fechas en inglés** ("August" en vez
  de "agosto") — se corrigió pasando `{ locale: es }` (de
  `date-fns/locale`) en cada `format()` visible al usuario, y
  `locale={es}` al `<DayPicker>`.
- **Bug real encontrado y corregido — regresión de este mismo cambio**:
  la página pública pedía `id`/`name` del tenant en la MISMA consulta que
  las columnas de marca nuevas; con `009` sin aplicar, esa consulta
  entera fallaba y `/reservar` quedaba en blanco (no solo sin marca —
  completamente roto, porque `tenant` mismo salía `null`). Se separó en
  dos queries (datos core vs. marca) para que una columna nueva faltante
  nunca pueda tumbar el dato crítico.
- **Segundo bug real, en la API de reservar**: para no romper reservas
  mientras `010` no esté aplicada, la ruta intenta la llamada con
  correo/notas y si falla reintenta sin ellos — pero el primer intento de
  este fallback comparaba contra el código de error equivocado (`42883`,
  el código de Postgres para "función no existe") cuando PostgREST en
  realidad devuelve **`PGRST202`** para este caso (resuelve el nombre de
  función antes de llegar a Postgres). Confirmado con una llamada directa
  a la función vía script — el mensaje de error real fue la pista.
- **Tercer bug real, en `BookingFlow.tsx`**: al fallar una reserva, el
  código ponía el mensaje de error y LUEGO llamaba a `loadAvailability()`
  para refrescar horarios — pero esa función borra el error al empezar
  (`setError(null)`, para el flujo normal), así que el mensaje se veía
  una fracción de segundo y desaparecía solo. Fix: esperar a que
  `loadAvailability()` termine antes de poner el mensaje de error.
- Verificado en vivo por Claude de punta a punta (no requiere sesión):
  calendario en español con puntos de disponibilidad correctos, horarios,
  formulario con correo/notas, y una reserva real creada exitosamente
  usando el *fallback* (con `010` todavía sin aplicar en ese momento).

**Bug real reportado por Bruno y encontrado (2026-08-18, mismo día)**: el
diseño nuevo de `/reservar` no aparecía para tenants que sí usan una
plantilla real (peluquería/dentista) — causa raíz: `templates` (creada en
`007`) se dejó **sin ninguna policy de RLS**, pensado solo para bloquear
escritura a todo lo que no sea `service_role`. Eso también bloqueaba por
completo la LECTURA desde la página pública (que usa la key `anon`) — la
consulta no daba error, simplemente devolvía cero filas, así que la
página caía en silencio al *fallback* sin que se notara que algo estaba
mal. Confirmado con una llamada directa usando la `anon` key
(`data: null, error: null`). **Fix**: `db/011_templates_public_read.sql`
agrega `templates_select_public` (lectura pública total — el contenido de
una plantilla no es sensible, mismo criterio que `resources`/
`service_types`).

De paso se detectó que `test-salon` tenía `vertical = 'general'` desde
que se recreó para las pruebas del dashboard — nunca había pasado por el
camino real de plantillas. Se cambió a `vertical = 'peluqueria'`
directamente en la base (dato de prueba, no vía UI) para poder probar el
camino completo plantilla → bloques → reserva real.

También se cambió el panel del editor de plantillas: el bloque de
reserva, cuando no hay un tenant real detrás (contexto del editor), ahora
muestra una vista previa con datos de ejemplo (mismos estilos que
`BookingFlow` real) en vez de un cuadro vacío con guiones — antes daba la
impresión de que el diseño nuevo no estaba conectado a las plantillas.

`009`, `010` y `011` aplicadas y confirmadas — `/reservar` de
`test-salon` ya muestra el hero ("Peluquería / Barbería") + la sección de
features de la plantilla real + el flujo de reserva, verificado en vivo
por Claude.

**Editor de plantillas mucho más personalizable (2026-08-18, mismo día)**:
Bruno pidió explícitamente "las tres" — más tipos de bloque, más opciones
dentro de cada uno, y control de estilo por bloque tipo page builder.
- **Sistema de estilo por bloque** (`BlockStyle` en
  `lib/templates/blocks.ts`): cada bloque, sin importar su tipo, ahora
  tiene un `style` independiente de sus `props` — color de fondo
  (hex o "sin fondo"), espaciado (chico/medio/grande), ancho máximo
  (angosto/medio/ancho/completo), bordes redondeados, sombra. Lo aplica
  `BlockBox` dentro de `BlockRenderer.tsx`, un wrapper genérico que
  cualquier tipo de bloque (incluyendo los que se agreguen a futuro)
  hereda gratis.
- **6 tipos de bloque nuevos**: galería de imágenes, ubicación (dirección
  + link a mapa), horario de atención (texto, no en vivo — no está
  ligado a un `resource` real, ver nota abajo), redes sociales
  (Instagram/Facebook/WhatsApp/TikTok), botón de contacto (llamada o
  WhatsApp directo, links reales `tel:`/`wa.me`), separador.
- **Los 4 bloques de contenido existentes ganaron más opciones**: hero
  (imagen de fondo, alineación, botón CTA opcional), texto (alineación,
  tamaño), features (lista o cuadrícula), testimonio (foto, calificación
  con estrellas). El bloque `booking` se queda fijo — es funcional, no
  decorativo.
- **Migración de datos sin tocar la base**: `templates.blocks` ya era
  `jsonb`, así que no hizo falta una migración SQL — los bloques viejos
  (sin `style` ni los campos nuevos de `props`) se normalizan en el
  código (`normalizeBlock` en `lib/templates/blocks.ts`, fusiona sobre un
  bloque por defecto del mismo tipo) tanto al cargarlos en el editor como
  al renderizarlos en `/reservar`. Verificado en vivo: la plantilla vieja
  de peluquería (creada antes de este cambio) se sigue viendo bien.
- Advertencia de ESLint (`no-img-element`) en las imágenes de galería y
  testimonio — es intencional, son URLs arbitrarias que pone el admin,
  `next/image` requeriría configurar cada dominio posible de antemano.

**Crear tenants desde el panel admin (2026-08-18, mismo día)**: Bruno
pidió crear un tenant nuevo a partir de una plantilla — reveló un hueco
real: no existía NINGUNA forma de crear un tenant desde la UI, los
únicos que existen (`test-salon`) se crearon a mano por script. Se
construyó como función real y reutilizable, no solo para esta vez:

- `app/admin/(panel)/tenants/actions.ts` (nuevo archivo, a nivel de
  lista) — `createTenant({name, slug, vertical})`: valida formato de
  slug (mismo regex que el check constraint de la tabla), valida que el
  slug no esté ya en uso, inserta con `status: 'trial'`, `plan:
  'standard'`. Devuelve `{ok: true, tenantId}` o `{ok: false, error}` —
  discriminante `ok` explícito en vez de narrowing con `'error' in
  result`, porque con ambas variantes teniendo la clave `error` (una
  como `string`, otra como `undefined`) TypeScript no lo distingue bien.
- `app/admin/(panel)/tenants/new/` — formulario (`NewTenantForm.tsx`,
  client component): nombre del negocio, slug con auto-generación desde
  el nombre (mientras el usuario no lo edite a mano — `slugify` con
  `normalize('NFD')` para quitar acentos), selector de vertical
  poblado con las plantillas reales que existen. Llama a `createTenant`
  directo (no `<form action>`, mismo patrón que `updateTemplateBlocks`)
  y navega él mismo al detalle del tenant nuevo tras crearlo — mismo
  patrón de siempre para evitar el bug de `redirect()` dentro de un
  Server Action.
- Botón "+ Nuevo tenant" agregado a `/admin/tenants`.
- **A propósito, no crea recursos/servicios/horario de ejemplo** —
  decisión de Bruno: el tenant nuevo queda con branding/vertical nada
  más, listo para que el dueño real (o Bruno) lo configure desde el
  dashboard del negocio.
- Compilado y verificado (`slugify` probado aparte con acentos:
  "Barbería El Punto" → "barberia-el-punto"). No se pudo probar en vivo
  porque está detrás del login del panel admin — le toca a Bruno crear
  el primer tenant real con esto.

**Ya no hace falta el SQL manual para vincular un dueño** (2026-08-18,
mismo día, justo después de lo anterior) — Bruno pidió agregar la
creación del usuario dueño al flujo. Se construyó:

- `createTenantOwner(tenantId, {email, password})` en
  `[tenantId]/actions.ts` — llama a `admin.auth.admin.createUser({email,
  password, email_confirm: true})` (con `service_role`, vía
  `createAdminClient()`) y vincula el resultado en `business_users` con
  `role: 'owner'` (`upsert` con `onConflict: 'tenant_id,user_id'`, así
  no truena si ya estaba vinculado). Si el correo ya existe como usuario
  (pasó varias veces en este proyecto durante pruebas), en vez de fallar
  busca ese usuario con `listUsers()` y lo reutiliza como dueño.
- **Importante — por qué esto no viola la regla de "no manejar
  contraseñas"**: Claude nunca ve ni escribe la contraseña. La escribe
  la persona (Bruno u otro admin) directamente en un `<input
  type="password">` del formulario en su propio navegador; el código
  solo reenvía lo que el formulario mandó a la API de Supabase, igual
  que cualquier formulario de registro de cualquier app. Es
  arquitectónicamente distinto a que Claude reciba una contraseña por
  el chat y la use — eso sigue —y seguirá— prohibido.
- `OwnerCreator.tsx` — sección "Dueño / acceso al dashboard" nueva en
  `/admin/tenants/[tenantId]`, disponible para CUALQUIER tenant
  (incluidos los viejos como `test-salon`, que llevaba rato sin dueño).
- `NewTenantForm.tsx` — campos de correo/contraseña del dueño ahora
  opcionales dentro del formulario de creación: si se llenan los dos,
  crea el tenant y el dueño en la misma acción; si el tenant se crea
  pero falla el paso del dueño, no se pierde el tenant — manda a Bruno a
  su página de detalle, donde puede reintentar con el mismo
  `OwnerCreator`.
- Compilado y verificado. No probado en vivo (login del panel +
  formulario con contraseña real) — le toca a Bruno.

**Rediseño premium UI/UX — Fase 1 (2026-08-18, mismo día)**: Bruno pidió
una "transformación visual completa" de 26 secciones (nivel Linear/
Stripe/Vercel/Framer/Notion/Raycast/Airbnb/Calendly/Ramp), con la regla
explícita de no tocar funcionalidad ("NO ROMPER NADA" — endpoints, APIs,
DB, auth, permisos, lógica de negocio, booking, drag & drop, forms,
validaciones, estados, navegación se conservan; esto es solo estilo/UX/
sistema de diseño/responsive/microinteracciones). Es trabajo de varias
sesiones — se dividió en 5 fases y esta sesión entregó la Fase 1
(fundación + shell del panel admin):

- **`tailwind.config.ts`** — sistema de color semántico ampliado de
  forma aditiva (nada de lo viejo se quitó ni se renombró, así que nada
  que ya usara `primary`/`accent`/`paper`/`ink`/`muted` se rompió):
  `secondary`, `surface`, `elevated`, `border`/`border-strong`, y
  `success`/`warning`/`error`/`info` (cada uno con variante `-soft` para
  fondo claro, ej. `bg-success-soft`). Escala tipográfica con nombre
  (`text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`,
  `text-small`, `text-caption`, `text-label`) y escala de sombra
  graduada (`shadow-xs/sm/card/lg`).
- **`components/ui/Text.tsx`** (nuevo) — empareja cada nivel tipográfico
  con su peso/color correctos, para no depender de acordarse la
  combinación correcta cada vez que se usa.
- **`lucide-react`** instalado — reemplaza emojis/unicode como
  iconografía en los componentes nuevos/actualizados. **Pendiente**:
  todavía hay unicode (✓ en features, ★ en testimonios, ⠿ como drag
  handle) en `BlockRenderer`/`TemplateBuilder` sin migrar — quedó fuera
  del alcance de esta fase.
- **`Card`** — nueva prop `elevation` (`flat`/`raised`/`overlay`) y
  `hoverable`; usa `bg-surface`/`border-border` en vez de `bg-white`/
  `border-black/5` (mismo valor visual, ahora semántico).
- **`Button`** — nuevas variantes `outline` y `success`; nueva prop
  `isLoading` (spinner de lucide + `disabled` + `aria-busy`
  automáticos); anillo de foco real vía `focus-visible`.
- **`components/admin/Sidebar.tsx`** — reconstruido: logo+wordmark,
  íconos consistentes por sección, indicador de página activa (fondo +
  punto de acento), perfil de usuario (iniciales + correo) y botón de
  cerrar sesión anclados abajo (antes vivían en el TopBar).
- **`components/admin/TopBar.tsx`** — ahora es un breadcrumb real,
  derivado automáticamente de la URL (`usePathname`), con detección de
  UUID para mostrar "Detalle" en vez del id crudo.
- **`components/admin/MetricCard.tsx`** — ícono + indicador de
  tendencia. **Importante**: `trend` solo se pasa donde hay un número
  real del periodo anterior para comparar (citas de esta semana vs. la
  pasada, en el detalle del tenant, calculado con `computeTrend()`
  contra `bookings` real) — en la vista general de tenants (MRR, churn)
  no hay tendencia porque no existe histórico real, y no se fabricó una
  falsa.
- **`components/admin/StatusBadge.tsx`** — tokens `success`/`warning`/
  `error` en vez de clases sueltas, más un punto de color.
- **`components/ui/EmptyState.tsx`** (nuevo) — ícono + título +
  descripción + acción opcional. Aplicado en la tabla de tenants cuando
  los filtros no encuentran nada. **Pendiente**: extenderlo a las listas
  vacías del dashboard del tenant (recursos, servicios, horarios,
  calendario) — fuera del alcance de esta fase.
- Todo aplicado a `/admin/tenants` y `/admin/tenants/[tenantId]`.
  **Templates, Configuración, y el dashboard del tenant (`/t/[slug]/
  dashboard/*`) todavía usan el sistema de diseño anterior** — no están
  rotos, la Fase 1 se enfocó en el panel de Tenants como superficie
  insignia antes de extenderlo a todo lo demás.
- Compilado limpio en cada paso. Verificado en vivo lo que se pudo sin
  sesión (`/reservar` público, que usa `Card`/`Button` — sin regresión,
  confirmado por texto de página y por status 200 en las requests más
  recientes). **El panel admin en sí no se pudo ver visualmente esta
  sesión** — solo compilación correcta, no una captura real, porque
  está detrás del login de `platform_admins`. Le toca a Bruno confirmar
  que se ve bien.

**Fases pendientes del pedido de rediseño** (no empezadas):
2. Formularios (estados focus/error/success en `Input`/`Select`), tablas
   con paginación real, modales, más estados vacíos, skeleton loading.
3. Pulido de microinteracciones en el flujo de reserva del tenant +
   auditoría de UX completa (sección 24 del pedido de Bruno).
4. Dark mode con jerarquía de superficies real (no solo invertir
   blanco/negro).
5. Responsive específico por pantalla (sidebar → nav móvil, modales →
   bottom sheets, etc.) — hoy todo "se adapta" pero no está diseñado a
   propósito para mobile.

**Rediseño premium UI/UX — Fase 2 (2026-08-18, mismo día)**: formularios,
tablas con paginación real, modales de confirmación, estados vacíos y
loading states. Entregado:

- **`Input`/`Select`** — nueva prop `error` (booleana, no className):
  borde/ring rojo (`border-error`/`ring-error/20`) + `aria-invalid`
  cuando está activa. Por defecto (`error=false`) el render es
  pixel-idéntico al de antes — verificado en vivo en el formulario de
  "Datos" del booking público, cero regresión.
- **`components/ui/FieldError.tsx`** (nuevo) — mensaje de error de campo
  bajo un Input/Select, mismo token `text-error`.
- **`components/ui/Modal.tsx`** (nuevo, client) — overlay + diálogo
  centrado, cierra con ESC o click en el fondo. Sin librería de portal;
  usa `fixed inset-0` directo.
- **`components/ui/ConfirmForm.tsx`** (nuevo, client) — envuelve un
  `<form action={serverAction}>` para exigir un click de confirmación
  antes de enviarlo. **Importante**: no cambia la server action ni el
  FormData que se manda — el botón pasa de `type="submit"` a
  `type="button"` que abre el Modal, y al confirmar hace
  `formRef.current.requestSubmit()`, que dispara el submit real. Mismo
  patrón `.bind(null, ...)` de siempre, cero cambios de lógica.
- **Aplicado a las acciones destructivas** que antes borraban/suspendían
  al primer click: borrar recurso, borrar servicio, borrar horario (los
  tres en el dashboard del tenant) y suspender cuenta (admin, tenant
  detail). Activar/desactivar/reactivar quedaron sin confirmación a
  propósito — son reversibles con un click, no destructivas.
- **`components/ui/EmptyState`** extendido a recursos/servicios/horarios
  del dashboard del tenant (antes un `<p>Todavía no hay...</p>` plano) y
  a la tabla de tenants del admin cuando una página de paginación queda
  vacía.
- **Paginación real en `/admin/tenants`** — antes cargaba la tabla
  completa sin límite. Ahora `PAGE_SIZE=20` con `.range()` + `{ count:
  'exact' }`, un `page` en la query string que preserva los filtros
  activos, y un nuevo `components/ui/Pagination.tsx` (Anterior/Siguiente
  deshabilitados en los extremos).
- **`components/ui/Skeleton.tsx`** (nuevo) — primitivo `animate-pulse`.
  `loading.tsx` agregado en `/admin/tenants`, `/admin/tenants/[tenantId]`
  y `/t/[slug]/dashboard` (este último cubre también resources/services/
  schedule/calendar por herencia de segmento de Next.js, ya que no tienen
  su propio `loading.tsx`).
- **Bug de caché atrapado durante la verificación**: agregar los
  `loading.tsx` nuevos con el dev server corriendo dejó `.next`
  desincronizado (`Cannot find module './vendor-chunks/next.js'`) — ya
  documentado como patrón conocido en este proyecto. Fix de siempre:
  parar el server, borrar `.next`, reiniciar limpio. Después de eso,
  compiló y sirvió normal.
- Compilado limpio (`npm run build`, solo los warnings de `<img>` ya
  conocidos). Verificado en vivo el flujo público completo (servicio →
  calendario con disponibilidad real → horarios → formulario de datos)
  sin regresión. **Los cambios que solo se ven en el panel admin
  (paginación, confirm-modals, skeletons de `/admin/tenants*`) no se
  pudieron probar en vivo** — están detrás del login de
  `platform_admins`. Le toca a Bruno confirmarlos.

**Rediseño premium UI/UX — Fases 3, 4 y 5 (2026-08-18, mismo día,
pedido explícito de Bruno de terminar las fases restantes "que quede
irreconocible")**:

**Fase 3 — dashboard del tenant + flujo de reserva + limpieza de
iconos**:
- **Dashboard del tenant completamente rediseñado**: el header viejo
  (`bg-primary` con nav en pills) se reemplazó por un sidebar real
  (`app/t/[slug]/dashboard/Sidebar.tsx`), mismo lenguaje visual que el
  panel admin (logo, íconos lucide, estado activo, perfil + cerrar
  sesión abajo), con drawer para mobile incluido desde el principio.
- **"Resumen" dejó de ser un placeholder** ("Elige una sección arriba")
  y ahora es un dashboard real: 3 `MetricCard` con datos reales (citas
  próximas, recursos activos, servicios en catálogo) + lista de las
  próximas 5 citas — mismo principio de "nunca inventar datos" ya
  aplicado en el admin.
- Headers de recursos/servicios/horarios/calendario migrados al
  componente `Text`; calendario del dashboard también recibió
  `ConfirmForm` (cancelar cita) y `EmptyState`.
- **`BookingFlow.tsx` (flujo público de reserva) pulido**: indicador de
  pasos rediseñado (círculos numerados + líneas conectoras + check al
  completar, en vez de solo pills de color), transición de entrada
  (fade+slide) en cada paso vía una animación CSS nueva
  (`.animate-fade-in`/`.animate-pop-in` en `globals.css`, respeta
  `prefers-reduced-motion`), botones con estado `isLoading` real
  (spinner) en vez de texto "...", ícono de éxito animado en la
  confirmación, banner de error retokenizado (`bg-error-soft
  text-error` en vez de rojo hardcodeado).
- **Limpieza de iconografía**: se reemplazó todo el unicode/emoji que
  quedaba pendiente desde la Fase 1 — el ✓ de features y las ★ de
  testimonios en `BlockRenderer.tsx` ahora son íconos lucide reales
  (`Check`, `Star` relleno/vacío), los emojis de redes sociales
  (📷📘💬🎵) se volvieron íconos lucide genéricos (lucide no trae logos
  de marca por licencia, así que se usaron metáforas: `Camera` para
  Instagram, `Users` para Facebook, `MessageCircle` para WhatsApp,
  `Music2` para TikTok), y el drag-handle "⠿" del editor de plantillas
  ahora es `GripVertical`. También se agregaron íconos nuevos a
  bloques que no tenían ninguno (`MapPin` en ubicación, `Clock3` en
  horario, `Phone`/`MessageCircle` en el botón de contacto). Se dejó
  intacta la única excepción real: las ★ dentro de un `<option>` nativo
  del selector de calificación en `TemplateBuilder.tsx`, porque un
  `<option>` HTML solo acepta texto plano, no puede llevar un ícono SVG.
- **Se encontró y borró código muerto**: `components/booking/
  BookingForm.tsx` (la versión vieja del flujo de reserva, reemplazada
  hace tiempo por `BookingFlow.tsx`) ya no lo importaba nadie — se
  confirmó con grep antes de borrar.

**Fase 4 — dark mode real**:
- **Arquitectura**: en vez de agregar `dark:` a cada componente uno por
  uno, los tokens de jerarquía de superficie (`paper`, `surface`,
  `elevated`, `ink`, `muted`, `border`) se movieron a variables CSS
  (`--color-*`, definidas en `:root` para claro y bajo `.dark` para
  oscuro) y `tailwind.config.ts` ahora las referencia vía `rgb(var(--x)
  / <alpha-value>)`. Esto significa que CUALQUIER componente que ya
  usaba `bg-surface`/`text-ink`/`border-border` (que es casi todo el
  sistema de diseño) obtuvo dark mode automáticamente, sin tocarlo. Las
  variantes `-soft` de success/warning/error/info se volvieron overlays
  de alpha (`rgb(21 128 61 / 0.12)`) sobre su propio color, así que
  también se adaptan solas a cualquier fondo.
- **Qué NO se tematizó y por qué**: `primary`/`accent`/`secondary`
  quedaron con sus valores fijos (son colores de marca — verde bosque
  oscuro y lima — que ya se ven bien sobre un fondo oscuro). La única
  excepción real fue `text-primary` usado como texto/link sobre el
  fondo de la página (no como relleno de un bloque), que sí pierde
  contraste en modo oscuro — se le agregó `dark:text-accent` puntual en
  cada uno de esos usos (links en tablas, variante `ghost` de Button,
  tono `default` de Badge, íconos de `MetricCard`/`EmptyState`, etc.)
  en vez de tematizar el token completo.
- **Toggle**: `components/ui/ThemeToggle.tsx` (ícono sol/luna,
  localStorage) agregado al fondo de ambos sidebars (admin y tenant).
  Un script inline en `app/layout.tsx` aplica la clase `.dark` ANTES
  del primer paint (lee localStorage, si no hay nada usa
  `prefers-color-scheme`), para no tener flash del tema equivocado.
  También se agregó `color-scheme: dark` bajo `.dark` para que los
  controles nativos del navegador (selects, inputs de color,
  scrollbars) se vean coherentes sin estilizarlos a mano uno por uno.
- **Alcance deliberado**: el dark mode cubre el panel admin y el
  dashboard del tenant (todo lo "interno"/de staff) y los componentes
  compartidos de `components/ui/`. La página pública de reserva
  (`/t/[slug]/reservar`, `BookingFlow`, `BlockRenderer`) se dejó FUERA
  a propósito — esa página usa los colores de marca que cada tenant
  configura (`primaryColor`/`accentColor` vía `style` inline, no los
  tokens de la plataforma), así que "modo oscuro" ahí significaría
  invertir la marca de cada negocio, que no está definido y no es lo
  que se pidió.
- **Verificado**: se comprobó en vivo (con JS, alternando la clase
  `.dark` en `<html>` sobre la página pública) que el mecanismo de
  variables CSS responde correctamente (fondo y texto cambian a los
  valores oscuros esperados) — es la validación más profunda que se
  pudo hacer sin poder entrar al panel admin ni al dashboard, que es
  donde el dark mode realmente se ve aplicado.

**Fase 5 — responsive**:
- **Sidebar del admin** (`components/admin/Sidebar.tsx`) convertido a
  drawer: en desktop se ve fijo como siempre, en mobile se oculta y se
  abre con un botón de hamburguesa que ahora vive DENTRO de
  `TopBar.tsx` (no flotando encima, para no taparse con el breadcrumb).
  El estado de abierto/cerrado se coordina en un wrapper cliente nuevo,
  `components/admin/AdminShell.tsx`, que ahora es lo que
  `app/admin/(panel)/layout.tsx` renderiza.
- **Sidebar del tenant** ya había nacido con el mismo patrón de drawer
  en la Fase 3 (botón de hamburguesa fijo arriba a la izquierda, ya que
  ahí no hay una topbar con la que pueda chocar).
- Tablas, filtros y grids ya usaban clases responsive (`flex-wrap`,
  `overflow-x-auto`, `grid-cols-2 lg:grid-cols-N`) desde fases
  anteriores — se revisaron y quedaron igual, no hacía falta tocarlos.
- **Verificado en `/reservar` (público) a 375px de ancho vía
  mediciones de DOM** (`scrollWidth`, `getBoundingClientRect`,
  `elementFromPoint` en varios puntos del viewport): sin overflow
  horizontal, el contenido ocupa el ancho completo con los colores de
  marca correctos. La captura de pantalla del navegador mostró un
  artefacto visual raro a este ancho (una franja negra) que las
  mediciones de DOM confirmaron que NO es un bug real — es un problema
  de la herramienta de captura en este entorño, no del layout. El
  sidebar-drawer del admin y del tenant no se pudo probar visualmente
  (gated por login).

---

**Bug real encontrado y corregido en el camino (crítico)**: al terminar
la Fase 5, Bruno reportó "el menú del admin de cada tenant no sirve".
Causa: el nuevo `Sidebar.tsx` del dashboard del tenant armaba los
`href` de navegación como `/t/${slug}/dashboard/...` — pero esa ruta
`/t/{slug}/...` es el DESTINO INTERNO al que `middleware.ts` reescribe
la petición cuando el visitante entra por el subdominio del tenant
(`test-salon.localhost:3000/dashboard` → reescrito por dentro a
`/t/test-salon/dashboard`). Un `<Link>` tiene que apuntar a la ruta
PÚBLICA (`/dashboard/...`), no al destino ya reescrito — si apunta al
destino reescrito, el click navega a
`test-salon.localhost:3000/t/test-salon/dashboard/...`, que el
middleware vuelve a reescribir por encima (`/t/test-salon/t/test-salon/
dashboard/...`, duplicado) y 404 — el patrón correcto ya existía en el
código viejo y en el sidebar del admin (hrefs sin prefijo:
`/tenants`, `/templates`, no `/admin/tenants`), pero no lo repliqué al
escribir el sidebar del tenant desde cero. Corregido: hrefs del sidebar
del tenant y el link "Ver todas" de Resumen vueltos a rutas públicas
sin prefijo (`/dashboard`, `/dashboard/resources`, etc. — igual que el
código original). Se aprovechó para quitar la prop `slug` de `Sidebar`,
que había quedado sin usar tras el fix. Confirmado con `tsc --noEmit` +
`npm run build` limpios y grep de todo el árbol (`app/`) para
descartar el mismo error en cualquier otro `href`/`router.push`.
**Lección para cualquier trabajo futuro en rutas de este proyecto**:
cualquier `<Link>`/`router.push` dentro de `/t/[slug]/...` o
`/admin/...` debe usar la ruta pública tal como se ve en el navegador
(sin el prefijo `/t/{slug}` o `/admin`), nunca la ruta de archivo real
— el prefijo solo existe del lado del servidor, después del rewrite de
`middleware.ts`. `revalidatePath()` es la única excepción: ese sí
necesita la ruta de archivo real (`/t/{slug}/dashboard/resources`),
porque opera sobre el árbol de rutas de Next, no sobre lo que ve el
navegador.

**Siguiente paso cuando se retome**: que Bruno confirme en vivo que el
menú del dashboard del tenant ya funciona (el bug que reportó), y de
paso revise el resto de lo nuevo: el sidebar del tenant completo, el
toggle de dark mode (en ambos paneles), el drawer mobile del admin, y
el flujo de reserva pulido. Nada del alcance original de las 26
secciones quedó sin tocar, pero dos cosas se dejaron fuera a propósito
y vale la pena que Bruno decida si quiere que se hagan después: (1) dark
mode en la página pública de reserva (hoy excluida porque usa la marca
de cada tenant, no los tokens de la plataforma), (2) un sistema de
toasts para feedback de acciones (hoy el feedback es implícito vía
`revalidatePath` refrescando la lista). Aparte, sigue pendiente desde
antes: probar el flujo completo de crear un tenant nuevo con dueño
incluido desde `/admin/tenants/new`; horario de atención en vivo ligado
a `resource_schedules` real; subida de imágenes vía Supabase Storage en
vez de URLs pegadas a mano; preview responsivo mobile/tablet/desktop
dentro del editor de plantillas. Paso 7 (pagos) sigue pausado.

**Pivote de identidad visual — "liquid glass" premium (2026-08-19,
mismo día)**: Bruno rechazó el resultado anterior ("no está cerca de
las referencias") y mandó dos imágenes de referencia (glassmorphism
premium tipo Apple/Linear/Raycast — superficies de vidrio translúcido
flotantes, fondo atmosférico dominante, profundidad física real) más
una especificación de 26 puntos exigiendo un benchmark visual directo,
no una interpretación genérica de "blur + transparencia". Pidió
explícitamente usar los skills nuevos instalados (`ui-ux-pro-max`,
`ui-styling`, `design-system`) para fundamentar las decisiones.

- **Investigación con `ui-ux-pro-max`** (`search.py --domain style
  "glassmorphism dashboard"`, `--domain color "indigo violet blue SaaS
  dashboard"`, `--domain typography`): confirmó glassmorphism como
  estilo correcto para "SaaS financiero premium", dio paletas reales
  indigo/violeta de productos SaaS existentes (sintetizadas, no
  copiadas literalmente), y confirmó que Inter (ya en uso) encaja con
  el brief de "premium sans" — se decidió NO cambiar de fuente.
- **Pivote de paleta completo**: `primary` pasó de verde bosque
  (#0E3B2C) a índigo (#4F46E5), `secondary` a violeta (#7C3AED),
  `accent` de lima (#8FE24A) a cian (#22D3EE) — mismos nombres de
  token, solo cambiaron los valores, así que todo lo que ya usaba
  `bg-primary`/`text-accent`/etc. se retiñó automáticamente sin tocar
  cada archivo. `paper`/`surface`/`elevated`/`ink`/`muted`/`border`
  (los tokens CSS-var de dark mode) se retonaron hacia neutros
  fríos/índigo en vez de neutros puros.
- **Sistema de "material" glass real, no `rgba(255,255,255,.1)` y
  ya**: nuevo token `glass` (CSS var `--color-glass-base`) + tres
  clases `.glass-1/.glass-2/.glass-3` (`globals.css`) que combinan
  translucidez + blur + un **highlight interior** (`inset box-shadow`
  simulando luz agarrando el borde superior del vidrio) + sombra de
  elevación — todo en una sola declaración de `box-shadow` a mano,
  porque `@apply shadow-card` después de un inset highlight
  *reemplaza* el shadow en vez de sumarlo (`box-shadow` es una sola
  propiedad). `Card`, `Table`, `Modal`, `Dropdown` (nuevo componente),
  `Input`/`Select` migrados a este sistema.
- **Fondo ambiental rediseñado dos veces**: la primera versión (blobs
  tenues en las esquinas) seguía leyéndose "oscuro plano con un
  glow lejano" — no cumplía el estándar de "campo de luz dominante"
  de las referencias. Se rehizo con blobs mucho más grandes/saturados,
  reposicionados para que uno quede directamente detrás de la esquina
  superior del sidebar (para que el vidrio tenga algo de color real
  que refractar), y con opacidad ajustada por separado en dark mode
  (el mismo alpha sobre casi-negro se ve mucho más apagado que sobre
  casi-blanco, así que dark necesita más opacidad para leerse igual).
- **Sidebar reconstruido como panel de vidrio flotante** (admin y
  tenant): antes era un panel sólido a todo el alto/ancho pegado al
  borde; ahora es `fixed inset-y-4 left-4 ... rounded-[28px]` (o
  `lg:my-4 lg:ml-4` en desktop dentro del flex layout), con margen
  visible en tres lados, esquinas grandes, y translucidez real —
  coincide con el lenguaje de "panel de vidrio separado del fondo" de
  la segunda referencia.
- **`components/ui/Dropdown.tsx`** (nuevo) — menú contextual real
  (`Dropdown` + `DropdownItem` + `DropdownSeparator`), glass nivel 3,
  cierra con click-fuera/Escape, aplicado en `/admin/tenants` (columna
  de acciones nueva: ver detalle + copiar enlace de reserva del
  tenant al portapapeles vía `NEXT_PUBLIC_ROOT_DOMAIN`).
- **Dos bugs reales encontrados y corregidos durante la verificación**
  (no hipotéticos — confirmados inspeccionando el CSS compilado):
  1. **Tailwind JIT no genera `from-primary/92`/`via-primary/88`**
     (stops de gradiente con modificador de opacidad sobre un color
     custom anidado en `DEFAULT`), aunque la clase esté literal en un
     archivo escaneado — confirmado grepeando el CSS compilado
     (`.from-primary\/92` simplemente no existía). El sidebar se
     quedaba sin gradiente (fondo transparente). Fix: gradiente escrito
     a mano como `style={{ background: 'linear-gradient(...)' }}` en
     vez de clases Tailwind, documentado en el propio componente para
     no repetir la investigación después. `@apply bg-glass/55` dentro
     de `globals.css` tuvo el mismo problema por la misma razón raíz
     (JIT no ve la clase dentro de un archivo CSS) — mismo fix,
     `background-color` a mano.
  2. **Regresión real que yo mismo introduje**: el nuevo `Button`
     variante `primary` usa `bg-gradient-to-r` (`background-image`).
     En `BookingFlow.tsx`, los botones "Seleccionar"/"Confirmar cita"
     pasan `style={{ backgroundColor: accentColor }}` para mostrar el
     color de marca del tenant — pero `background-image` y
     `background-color` son propiedades CSS distintas, así que el
     inline style técnicamente "ganaba" en `background-color` pero el
     gradiente de la clase se pintaba ENCIMA igual, tapando el color
     real del tenant con el gradiente índigo/violeta de la
     plataforma. Fix: esos dos botones ahora también fijan
     `backgroundImage: 'none'` y `boxShadow: 'none'` inline. Grepeado
     todo el árbol (`style={{ backgroundColor:`) para confirmar que
     era el único punto afectado — el resto de branding en
     `BlockRenderer.tsx` usa `<a>`/`<span>` planos, no `Button`, así
     que no tenían este riesgo.
  3. **Bug menor conocido, no arreglado**: los botones `variant="ghost"`
     usan `dark:text-accent` — pero `.force-light` (el mecanismo que
     protege la página pública del tenant del dark mode de la
     plataforma) solo repinta variables CSS, no puede neutralizar
     clases `dark:` de Tailwind (esas dependen solo de si `.dark` está
     en algún ancestro, no de variables CSS). Si el navegador de
     quien visita `/reservar` tiene dark mode activo, los botones
     ghost ("Agregar al calendario"/"Volver al inicio" en la
     confirmación) salen en cian de la plataforma en vez de un tono
     neutro — sigue siendo legible, no rompe nada, pero es una
     inconsistencia cosmética real, pendiente de decidir si vale la
     pena resolver (requeriría que esos botones específicos no
     dependan de `dark:` en absoluto).
- **Verificación**: `npm run build` limpio. Flujo público completo
  probado en vivo de punta a punta (servicio → calendario → hora →
  datos → confirmación real con referencia de booking) en modo claro Y
  oscuro, confirmando que `.force-light` protege el texto y que el
  fix de branding-vs-gradiente funciona. El shell de admin (sidebar
  flotante + fondo ambiental + Dropdown) se verificó visualmente
  creando una ruta temporal (`app/qa-preview-tmp/`) que renderiza
  `AdminShell` con datos falsos — el ÚNICO modo de verlo, ya que vive
  detrás del login — comparado en vivo contra las dos referencias en
  claro y oscuro, y borrada al terminar. No es lo mismo que ver la
  página real, pero el componente usado es idéntico al de producción.
- **No tocado esta vuelta** (fuera de alcance por tiempo, no por
  descuido): la composición "editorial/asimétrica" del dashboard que
  pide la sección 8/19 del brief (hoy sigue siendo una fila de KPIs +
  grid de cards, no un layout con jerarquía de tamaños deliberada);
  reducir la sensación de "card dentro de card" en las pantallas más
  densas (recursos/servicios/horarios). Vale la pena una pasada
  dedicada a esto si Bruno quiere seguir subiendo el nivel.

**Incidente post-entrega**: corrí `npm run build` (verificación final)
sin detener antes el dev server que ya estaba corriendo — los dos
escriben en `.next` con formatos incompatibles (dev vs producción), lo
corrompieron, y Bruno vio el panel admin real sin ningún CSS aplicado
(`Cannot find module './vendor-chunks/...'` en los logs del server).
Arreglado con el fix de siempre: parar el server, `rm -rf .next`,
reiniciar. **Regla reforzada — ya no es solo "no borrar `.next` con el
server corriendo", es "nunca correr `npm run build` con el dev server
activo, punto."** Si hace falta un build de producción para verificar
algo, `preview_stop` primero, correr el build, y recién después
reiniciar el dev server.

**Sidebar menos saturado + rediseño real del sistema de plantillas
públicas (2026-08-19, mismo día)**: dos pedidos de ajuste seguidos.

- Bruno pidió que el sidebar (admin y tenant) fuera "transparentoso,
  no morado" — el gradiente inline (`SIDEBAR_GRADIENT` en ambos
  `Sidebar.tsx`) bajó de 0.92/0.88/0.8 de opacidad a 0.42/0.36/0.3, y
  el blur subió a `backdrop-blur-3xl`. Luego el modo claro en general
  se sintió "sobresaturado, brilloso, molesto" — los blobs del fondo
  ambiental (`.ambient-glow` en `globals.css`) bajaron de opacidad dos
  veces (0.6/0.52/0.4 → 0.32/0.26/0.2 → 0.18/0.15/0.1), solo en el
  modo claro — el oscuro no se tocó, Bruno no se quejó de ese.
- Bruno señaló que el "rediseño" de la página pública de reserva
  (turno anterior) fue en realidad un ajuste puntual a los bloques, no
  un rediseño real — pidió que **los tenants nuevos tengan una
  estética moderna que sorprenda al cliente final, y que siga siendo
  personalizable**. Esta vez sí se tocó la página completa
  (`app/t/[slug]/reservar/page.tsx` + `BlockRenderer.tsx`), no solo
  ajustes internos de cada bloque:
  - **Fondo ambiental por tenant** — mismo concepto que el fondo
    atmosférico de la plataforma, pero construido con los colores
    propios de CADA tenant (`branding.primaryColor`/`accentColor` +
    sufijo de alpha en hex, ej. `${color}26`), no los índigo/violeta
    de la plataforma. Así cada negocio se ve "premium" con su propia
    paleta, nunca genérico ni idéntico a otro tenant.
  - **Superficies de vidrio reales** (no solo cards blancas planas):
    testimonio, ubicación, horario, features en grid, y el contenedor
    completo del flujo de reserva pasaron de `bg-white` sólido a
    `bg-white/70-85 backdrop-blur-xl` — ahora el fondo ambiental se
    nota A TRAVÉS de las tarjetas, dando la misma sensación de
    profundidad que el panel admin, pero en la superficie que ven los
    clientes finales de cada negocio.
  - **Hero con gradiente real**: color plano → gradiente diagonal
    construido con un helper `darkenHex()` (oscurece el color de marca
    del tenant un monto fijo por canal) en vez de un color fijo — se
    adapta a cualquier paleta que elija un tenant. Más un glow
    decorativo sutil en la esquina con el accent color.
  - **Bloque de texto**: tipografía más grande/fuerte (antes se sentía
    como texto suelto sin jerarquía).
  - **Preview del editor de plantillas** (`BookingFlowMockPreview`)
    actualizado al mismo lenguaje visual — sigue siendo cierto que "lo
    que ves en el editor es lo que se publica", ya que ambos usan el
    mismo `BlockRenderer`.
  - Nada de esto quita personalización — todo sigue leyendo
    `branding.primaryColor`/`accentColor` y respetando
    `block.style` (fondo/padding/ancho/redondeado/sombra) configurado
    desde el editor por tenant. Un tenant nuevo creado desde cualquier
    plantilla hereda esto automáticamente.
- Verificado en vivo contra `test-salon` (build de producción NO
  corrido esta vez, a propósito, para no repetir el incidente de
  arriba mientras el dev server seguía activo — solo `tsc --noEmit` +
  verificación visual en el navegador). Sin errores de consola.

**Bug real: el rediseño de arriba no cubría el camino "sin plantilla"**
(mismo día, inmediatamente después): Bruno dijo "no cambiaste nada" —
sonaba a que no había pasado nada, pero sí había cambios reales
verificados. La causa real: había creado un tenant de prueba
("spa") con vertical `general`, y **nunca existió una plantilla para
`general`** (solo `dentista`/`padel`/`peluqueria` tienen fila en
`templates`) — el formulario de creación (`NewTenantForm.tsx`) incluso
ofrece la opción literalmente como "General (sin plantilla)". Ese
camino cae en el `else` de `reservar/page.tsx` (sin `BlockRenderer`,
solo `BookingFlow` a secas), que nunca se tocó en el rediseño — se veía
exactamente como antes de cualquier cambio, lo cual explica el
"no cambiaste nada" al pie de la letra. Confirmado consultando
`tenants`/`templates` directo por script antes de arreglar, no
adivinado. Fix: el fallback ahora tiene el mismo header con gradiente +
tarjeta de vidrio para el `BookingFlow` que los tenants con plantilla
real — se movió el helper `darkenHex()` a
`lib/branding/colors.ts` (antes vivía solo dentro de
`BlockRenderer.tsx`) para poder compartirlo entre ambos archivos.
Verificado en vivo contra el tenant real `spa` que Bruno había creado
para probar — confirmado visualmente, ya no es una página en blanco.
**Lección**: cuando alguien dice "no cambió nada" después de cambios
reales y verificados, la explicación casi nunca es que el trabajo no
sirvió — es que está mirando una ruta/estado que el cambio no cubrió.
Vale la pena verificar contra los datos reales (qué tenant, qué
vertical, qué filas existen) antes de asumir que hay que repetir el
mismo trabajo.

**Rediseño visual "solo estética" — logins + calendario (2026-08-19,
mismo día)**: Bruno mandó un spec de 20 puntos, esta vez con la regla
explícita de NO tocar funcionalidad, solo la piel visual de "el
tenant" (interpretado como el login + el calendario de disponibilidad,
dado que el spec menciona auth/dropdowns/modal/calendario/servicios
y explícitamente prohíbe agregar hero/testimonios — cosas que ya
existen a propósito en la página pública de bloques, así que esto no
podía ser sobre esa página).

- **`app/t/[slug]/login/page.tsx`** y **`app/admin/login/page.tsx`**:
  de fondo sólido plano (`bg-paper`/`bg-primary`) + card blanca simple,
  a fondo atmosférico (`.ambient-glow` + `.ambient-glow-accent`, mismo
  mecanismo que ya usan los shells) + tarjeta de vidrio flotante
  (`Card elevation="overlay"` + `rounded-[28px]`) + animación de
  entrada. El login del admin cambió de fondo oscuro sólido a
  atmosférico claro/oscuro (según el tema), con el badge "Panel
  interno" ajustado de `tone="inverse"` a `tone="default"` para que
  siga siendo legible sobre el nuevo fondo. Ningún campo, ninguna
  acción, ningún componente funcional cambió — solo el wrapper visual.
- **Bug real encontrado en el calendario** (`AvailabilityCalendar.tsx`):
  el color de acento del tenant nunca se aplicaba al día de "hoy" ni
  al highlight — se veía azul (el default de la librería), no el
  color de marca. Causa: las variables CSS (`--rdp-accent-color`) se
  ponían en un `<div>` envolvente vía `style`, pero
  `react-day-picker` define esa misma variable directamente en su
  propio elemento raíz (`.rdp-root { --rdp-accent-color: blue; ... }`
  en su stylesheet) — una declaración DIRECTA en un elemento le gana
  a un valor heredado de un ancestro, sin importar dónde se haya
  puesto ese valor heredado. Fix: mover las variables al prop `style`
  de `<DayPicker>` (sí lo reenvía a `.rdp-root`), no a un div
  envolvente. Verificado en vivo: el anillo de "hoy" pasó de azul a
  verde (el accent real de test-salon).
- Mejoras visuales adicionales al calendario (globals.css): hover con
  fondo suave + leve escala en los días, día seleccionado con relleno
  sólido + sombra (antes solo un borde delgado), anillo sutil en "hoy",
  encabezados de día (lu/ma/mi...) con más peso, botones de
  navegación (‹ ›) circulares con hover. Nada de esto toca
  disabled/selección/lógica de disponibilidad.
- Verificado en vivo: ambos logins (accesibles sin sesión), y el
  calendario completo dentro del flujo de reserva de test-salon
  (selección de fecha → hora → avanza correctamente). `tsc --noEmit`
  limpio, sin `npm run build` (dev server seguía activo).

**Unificación literal con el sistema del dashboard (mismo día,
inmediatamente después)**: Bruno pidió explícitamente reusar el mismo
"estilo" del dashboard en los tenants, no solo un lenguaje visual
parecido construido aparte. Antes, `BlockRenderer.tsx` tenía sus
propias superficies de vidrio escritas a mano (`bg-white/70
backdrop-blur-xl border-white/60 shadow-sm`, repetido en cada bloque) —
visualmente similar a `.glass-1/2/3` pero NO el mismo código, así que
cualquier ajuste futuro al sistema de vidrio de la plataforma no se
reflejaría aquí. Se reemplazaron todos esos hand-rolled styles por las
clases compartidas reales:

- Features en grid, botones de redes sociales → `.glass-1`.
- Testimonio, ubicación, horario → `.glass-2`.
- Contenedor del flujo de reserva (el más importante, "máxima
  separación del fondo" según el spec) → `.glass-3`, igual que
  Modal/Dropdown en el panel admin.
- Como `--color-glass-base` ya resuelve a blanco en la página del
  tenant (por `.force-light`), reusar estas clases no rompe nada —
  simplemente ahora comparten literalmente el mismo CSS que ya usa el
  dashboard, en vez de una reimplementación paralela.

También los botones principales (CTA del hero, botón de contacto,
"Seleccionar"/"Confirmar cita" en `BookingFlow.tsx`) pasaron de un
relleno plano a un gradiente de dos tonos + sombra de color — el mismo
patrón "gradiente + glow" que usa el `Button` primario de la
plataforma, pero construido con el color de acento propio de cada
tenant (`accentColor → darkenHex(accentColor, 25)`) en vez de
índigo/violeta fijo. `BookingFlow.tsx` antes neutralizaba a propósito
el gradiente de la plataforma en estos dos botones
(`backgroundImage:'none'`) para no tapar el color del tenant — ahora
en su lugar tienen su PROPIO gradiente vía un `ctaStyle` calculado una
vez arriba del componente y reutilizado en ambos botones.

Verificado en vivo contra test-salon: el botón "Seleccionar" ahora
muestra un degradado sutil verde con resplandor debajo, en vez de un
verde plano — mismo lenguaje que los botones del panel, con la paleta
del tenant. `tsc --noEmit` limpio.

**Pivote — página pública deja de usar el color de marca del tenant,
usa la paleta de la plataforma (mismo día, inmediatamente después)**:
Bruno pidió explícitamente reusar los colores y el glassmorphism del
MODO CLARO del dashboard para la estética de los tenants — no solo el
sistema de vidrio (eso ya se había unificado), sino los colores mismos.
Esto es un cambio de dirección real respecto a lo que se construyó
hace varios turnos (`branding.primaryColor`/`accentColor` leídos de
`tenants.primary_color`/`accent_color`, personalizados por tenant) —
documentado aquí para que quede claro que fue intencional, no una
regresión.

- **`lib/branding/colors.ts`**: nuevas constantes
  `PLATFORM_PRIMARY` (#4F46E5, índigo), `PLATFORM_SECONDARY` (#7C3AED,
  violeta), `PLATFORM_ACCENT` (#22D3EE, cian) y `PLATFORM_GRADIENT` —
  deben mantenerse sincronizadas a mano con `tailwind.config.ts`
  (`primary`/`secondary`/`accent`), no hay una fuente única compartida
  entre el config de Tailwind y estos hex planos que necesita el
  código que pinta color por `style` inline.
- **`app/t/[slug]/reservar/page.tsx`**: el objeto `branding` que se le
  pasa a `BlockRenderer`/`BookingFlow` ya NO lee
  `primary_color`/`accent_color` de la tabla `tenants` — usa
  `PLATFORM_PRIMARY`/`PLATFORM_ACCENT` fijos. El fondo ambiental pasó
  de blobs calculados con el color del tenant a las clases
  compartidas literales `.ambient-glow`/`.ambient-glow-accent` (las
  mismas que usa `AdminShell`), así que la página pública ahora pinta
  el mismo `--color-paper` de la plataforma encima del
  `background_color` que el tenant configuró — ese campo (y
  `text_color`) siguen existiendo en la DB y en `BrandEditor` pero ya
  no tienen efecto visible aquí. `font_heading`/`font_body` SÍ se
  siguen respetando (la tipografía no era parte de este pedido).
- **`BlockRenderer.tsx`**: el hero pasó de un gradiente calculado
  (`primaryColor → darkenHex(primaryColor,45)`) a `PLATFORM_GRADIENT`
  fijo. El CTA del hero y `contact_button` pasaron de un gradiente
  inline construido con `accentColor` a las clases literales de
  Tailwind `bg-gradient-to-r from-[#2563EB] via-primary to-secondary
  text-white shadow-glow-primary` — el mismo string de clases que ya
  usa `Button` variante `primary` en `components/ui/Button.tsx`,
  copiado a mano porque estos dos son `<a>` planas, no el componente
  `Button`. `DEFAULT_BRANDING` (usado por el preview del editor de
  plantillas, que no pasa `branding` explícito) también apunta a los
  colores de la plataforma ahora, así que el editor y la página real
  coinciden.
- **`BookingFlow.tsx`**: se eliminó por completo el `ctaStyle`
  calculado a mano (gradiente + glow desde `accentColor`) de los
  botones "Seleccionar"/"Confirmar cita" — ya no llevan ningún
  `style` propio, así que renderizan con la variante `primary` de
  `Button` tal cual (el gradiente azul→índigo→violeta real de la
  plataforma), cero código duplicado. Los checkmarks/badges de
  ícono/estrellas de reseña siguen leyendo
  `branding.primaryColor`/`accentColor` sin cambios de código — ya
  heredan los colores de la plataforma automáticamente porque
  cambiaron en el origen (`reservar/page.tsx`).
- Verificado en vivo contra test-salon: hero índigo→violeta (idéntico
  al gradiente del Sidebar), fondo ambiental lavanda/violeta como el
  dashboard en claro, botón "Seleccionar" con el gradiente
  azul→índigo→violeta + texto blanco, anillo de "hoy" en el
  calendario en cian. Flujo completo probado hasta la selección de
  horario, sigue funcionando. `tsc --noEmit` limpio, sin `npm run
  build` (dev server activo).

**Corrección: el hero sólido morado se veía mal (mismo día,
inmediatamente después)**: Bruno dijo directamente que el bloque
morado sólido "se ve horrible" — tenía razón, era el único elemento de
la página que rompía el lenguaje de vidrio (todo lo demás es glass
translúcido, el hero era un slab de color plano). Fix en
`BlockRenderer.tsx` y en el header de respaldo de `reservar/page.tsx`:
el hero ahora es `.glass-3` (vidrio claro, el mismo que el contenedor
del flujo de reserva) con texto oscuro, en vez de
`background: PLATFORM_GRADIENT` con texto blanco — **solo para el
caso por defecto**. Si el tenant tiene una imagen de fondo en el hero,
o si el editor le puso un `backgroundColor` explícito, ese caso sigue
igual que antes (overlay oscuro + texto blanco), porque ahí sí hay una
razón real para texto claro. El glow decorativo (accent color) y el
botón CTA con gradiente se quedan igual — ya se veían bien sobre
cualquier fondo. `PLATFORM_GRADIENT` quedó sin uso en estos dos
archivos tras el cambio (ya no queda ningún bloque sólido de color en
la página pública) — se quitó el import pero la constante sigue
existiendo en `lib/branding/colors.ts` por si hace falta en otro lado.
Verificado en vivo contra test-salon y spa (el tenant sin plantilla):
ambos heroes ahora son vidrio claro con el fondo ambiental
lavanda/violeta visible a través, texto oscuro legible.

**Bug real: el hero de test-salon no tenía las esquinas redondeadas**
(mismo día, inmediatamente después). Causa: `BlockBox` solo agrega
`rounded-3xl` cuando `block.style.rounded` es `true` — un toggle por
bloque que se guarda en la DB desde el editor, apagado por defecto.
El hero de `spa` se veía bien porque ese caso usa el header de
respaldo en `reservar/page.tsx`, que tiene `rounded-[32px]` escrito a
mano sin depender de ningún toggle; el de `test-salon` pasa por
`BlockRenderer.tsx`'s caso `hero`, cuyo bloque real en la DB tenía
`rounded: false` (guardado antes de este rediseño). Fix: para el caso
`isGlass`, se le pasa a `BlockBox` un `style` con `rounded: true` y
`shadow: false` forzados — el vidrio ahora siempre se ve como un panel
flotante sin importar cómo haya quedado guardado el bloque
específico de cada tenant. `shadow: false` es a propósito también:
`.glass-3` ya trae su propio box-shadow con highlight interior
horneado en la clase; si `style.shadow` hubiera sido `true`, el
`shadow-card` del editor lo habría reemplazado en vez de sumarse
(`box-shadow` es una sola propiedad CSS). Verificado en vivo:
test-salon ahora coincide con spa. `tsc --noEmit` limpio.

**Logo del negocio en el hero (mismo día, inmediatamente después)**:
`tenants.logo_url` ya existía como campo editable en `BrandEditor.tsx`
desde antes (fase de rebranding), pero nunca se usaba en ningún lado
de la página pública — se guardaba y no pasaba nada. Ahora sí se
renderiza:

- `Branding` (en `BlockRenderer.tsx`) ganó un campo opcional
  `logoUrl?: string | null`. `DEFAULT_BRANDING` lo deja en `null`
  (el preview genérico del editor no tiene un tenant real detrás).
- `reservar/page.tsx` agrega `logo_url` a la query de branding y lo
  pasa como `branding.logoUrl` tanto al `BlockRenderer` (bloques
  reales) como al header de respaldo ("sin plantilla").
- El bloque `hero` (y el header de respaldo) muestran el logo como
  una imagen 64×64 redondeada arriba del título, centrada si
  `block.props.align === 'center'`. Tratamiento distinto según el
  fondo: sobre el hero de vidrio claro (`isGlass`) lleva solo un
  anillo sutil; sobre un hero con imagen de fondo o color custom
  (fondo potencialmente oscuro) lleva una placa blanca detrás
  (`bg-white/95 p-1.5`) para que el logo se siga leyendo sin importar
  qué haya detrás.
- Verificado en vivo con un logo de prueba (Dicebear, un placeholder
  público) puesto y quitado directo en la DB vía script — se veía
  bien centrado, con sombra y esquinas redondeadas, y no rompió nada
  del resto del hero. `logo_url` de test-salon quedó en `null` otra
  vez al terminar — el logo real hay que ponerlo desde `/admin/
  tenants/[id]` → sección Marca, como cualquier otro campo de
  `BrandEditor`.

**Fix inmediato: el logo se veía recortado** (mismo día). Bruno subió
el logo real de un tenant (un wordmark horizontal, "SARANG Beautycare
& SPA") y el tratamiento `h-16 w-16 object-cover` — pensado para un
ícono cuadrado — le recortaba los lados. Cambiado a `object-contain`
sin ancho fijo (`h-16 w-auto max-w-full`, contenedor `max-w-[240px]`)
en `BlockRenderer.tsx` y en el header de respaldo de
`reservar/page.tsx`, así que ahora se ve el logo completo sea cual sea
su proporción (cuadrado, horizontal, lo que suban). Verificado en
vivo contra `spa` con su logo real.

**Segundo pivote — vuelta a colores por tenant, pero ahora "todo" de
verdad (mismo día, inmediatamente después)**: con un logo real subido
(SARANG, verde olivo/dorado) quedó obvio que el azul/violeta fijo de
la plataforma no combinaba — Bruno lo pidió de vuelta: los colores del
panel admin (`primary_color`/`accent_color` de cada tenant) deben
manejar el fondo del glass, los botones, y todo, no solo un acento
suelto aquí y allá. Esto revierte el pivote de hace algunos turnos,
pero conservando toda la estructura (formas de vidrio, radios,
sombras, jerarquía de niveles) construida durante ese pivote — solo
cambió de dónde sale el COLOR.

- **`lib/branding/colors.ts`**: `withAlpha(hex, alpha)` reemplaza el
  patrón fragil `` `${hex}NN` `` (string-concat que producía basura
  silenciosa si `hex` no era ya un hex de 6 dígitos limpio) en TODOS
  los lugares que lo usaban, incluido uno que quedó suelto en
  `AvailabilityCalendar.tsx`. Dos helpers nuevos, pensados para
  reusarse en cualquier archivo que necesite pintar con el color de un
  tenant: `tenantGlassBackground(primaryColor, accentColor, level)` —
  un fondo blanco (mantiene el texto legible sin importar qué tan
  oscuro/claro sea el color del tenant) con un lavado diagonal sutil
  del color de marca encima; `level` (1/2/3) espeja la escala
  `.glass-1/2/3` de la plataforma — más opacidad/lavado en los niveles
  más "separados del fondo" (el panel de reserva es nivel 3). Y
  `tenantCtaStyle(primaryColor, accentColor)` — el gradiente + glow de
  los botones principales, construido desde `accentColor` en vez de un
  hue fijo.
- **`reservar/page.tsx`**: `branding` vuelve a leer
  `primary_color`/`accent_color` de la tabla `tenants` (con
  `PLATFORM_PRIMARY`/`PLATFORM_ACCENT` como fallback solo si el tenant
  no tiene colores propios configurados). El fondo ambiental volvió a
  ser blobs con el color del tenant (ya no las clases compartidas
  `.ambient-glow`, que están pintadas en el CSS con colores fijos de
  la plataforma y no pueden tomar un color en tiempo de ejecución). El
  header y la tarjeta de reserva del camino "sin plantilla" usan
  `tenantGlassBackground(...)` en vez de la clase `.glass-3`.
- **`BlockRenderer.tsx`**: hero, features en grid, testimonio,
  ubicación, horario, redes sociales, y el contenedor del flujo de
  reserva — todos pasaron de las clases compartidas `.glass-1/2/3`
  (neutras, color de la plataforma) a `tenantGlassBackground(...)`
  inline con el nivel correspondiente. CTA del hero, botón de
  contacto, y el botón "Seleccionar" del preview del editor pasaron
  de la clase de gradiente fija de la plataforma a
  `tenantCtaStyle(...)`. `DEFAULT_BRANDING` se queda en los colores de
  la plataforma a propósito — es lo que ve el editor cuando no hay un
  tenant real detrás.
- **`BookingFlow.tsx`**: el `ctaStyle` que se había eliminado en el
  pivote anterior volvió, ahora construido con `tenantCtaStyle(...)`
  en vez de a mano.
- **Lo que SÍ se queda con los colores de la plataforma a propósito**:
  los logins (`/t/[slug]/login`, `/admin/login`) — son herramienta
  interna (equipo/dueño iniciando sesión), no la cara pública del
  negocio, así que no tiene sentido que cambien de color por tenant.
- Verificado en vivo: `spa` (verde olivo/dorado, combina con el logo
  SARANG) y `test-salon` (verde bosque/lima, sin regresión) — cada uno
  con su propia paleta consistente en fondo, vidrio, botones y
  calendario. `tsc --noEmit` limpio.

**El dashboard del tenant también se marca con su logo/colores (mismo
día, inmediatamente después)**: Bruno pidió esto para TODOS los
tenants, usando `spa` solo como ejemplo. Hasta ahora el dashboard
(`/t/[slug]/dashboard/*`) era intencionalmente neutro — decisión
tomada hace varios turnos ("es la herramienta del operador, no la cara
pública") — pero ya no: el dueño del negocio ahora ve SU marca al
entrar a administrar sus citas, igual que en su página pública.

- **Mecanismo clave — variables CSS en vez de tocar cada botón**: en
  vez de pasarle `style` a mano a cada `<Button>` en
  `resources/services/schedule/calendar` (docenas de usos), la
  variante `primary` de `components/ui/Button.tsx` ahora es una clase
  nueva, `.btn-primary-gradient` (`globals.css`), que lee variables CSS
  (`--tenant-cta-from/mid/to/text/glow`) con los colores actuales de
  la plataforma como fallback. El layout del dashboard
  (`app/t/[slug]/dashboard/layout.tsx`) define esas variables una sola
  vez en su `<div>` raíz vía `tenantCtaCssVars(primaryColor,
  accentColor)` (nuevo helper en `lib/branding/colors.ts`) — y CADA
  botón "primary" debajo de ese punto en el árbol se retiñe solo, sin
  tocar ninguna página del dashboard. El panel admin nunca define esas
  variables, así que sus botones se quedan exactamente igual
  (verificado en vivo: `/admin/login` sigue con el gradiente
  azul→índigo→violeta de siempre).
- **`tenant-dash/Sidebar.tsx`**: gana props `primaryColor`,
  `accentColor`, `logoUrl`. El gradiente del panel
  (`tenantSidebarGradient()`, mismo helper que ya existía para el
  header de la página pública) ahora usa los colores del tenant en vez
  de índigo/violeta fijo. El logo del tenant reemplaza el ícono
  genérico "Sparkles" cuando existe (badge blanco redondeado,
  `object-contain` para no recortar un logo no cuadrado — mismo fix
  que se hizo para el hero). El indicador de item activo (barra
  lateral + punto + color de ícono), antes con las clases estáticas
  `bg-accent`/`text-accent` (cian de la plataforma), ahora usa
  `accentColor` vía `style` inline.
- **Fondo ambiental** del layout del dashboard: mismos dos blobs
  desenfocados que ya tenía, pero repintados con
  `withAlpha(primaryColor/accentColor, ...)` en vez de las clases
  `.ambient-glow` (que están fijas en el CSS con los colores de la
  plataforma y no pueden tomar un color en tiempo de ejecución — mismo
  patrón ya aplicado en `reservar/page.tsx`).
- **Qué se quedó SIN tocar, a propósito**: MetricCard, StatusBadge, y
  otros acentos pequeños dentro de las páginas del dashboard todavía
  usan los tokens estáticos `primary`/`accent` de Tailwind (índigo/cian
  de la plataforma) en vez de las variables CSS — cubrir esos también
  requeriría una pasada más larga tocando cada uno individualmente. Lo
  más visible (sidebar completo, logo, y CUALQUIER botón "primary" en
  cualquier página del dashboard) ya está cubierto; el resto queda
  pendiente si Bruno quiere una cobertura del 100%.
- Verificado con una ruta de prueba temporal (mismo método de
  siempre, borrada al terminar) simulando los colores reales de
  `spa` (verde olivo `#4A5D23` / dorado `#C9A84C`): sidebar con
  gradiente correcto, logo en badge blanco, y el botón "Agregar" de un
  `Card` de ejemplo — que solo usa `<Button>` sin ningún `style`
  propio — ya salió con el gradiente dorado del tenant, confirmando
  que el mecanismo de variables CSS funciona sin tocar código de
  página. `tsc --noEmit` limpio. Verificado también que
  `/reservar` (página pública) y `/admin/login` no cambiaron.

**"0 colores fijos" + contraste del sidebar (mismo día, mensaje
siguiente)**: Bruno reportó dos problemas sobre lo anterior: (1) el
punto pendiente de arriba — MetricCard/StatusBadge/etc. todavía en
índigo/cian fijo — ya no era aceptable, quería CERO colores
hardcodeados en el dashboard del tenant; (2) con colores ahora
dinámicos, el texto fijo `text-white` del sidebar se volvía ilegible
si un tenant elegía un color de marca claro (crema, dorado pálido).

- **Se subió la solución de "variable CSS en un botón" a "variable CSS
  en el token de color"**: en vez de que `tenantCtaCssVars()` sólo
  alimentara la clase `.btn-primary-gradient` de `Button`, ahora
  `primary`/`secondary`/`accent` en `tailwind.config.ts` son ellos
  mismos tokens respaldados por variables CSS
  (`rgb(var(--color-x) / <alpha-value>)`), exactamente el mismo patrón
  que ya usaban `paper`/`surface`/`ink` para dark mode. Se borró
  `.btn-primary-gradient` y `tenantCtaCssVars()`; en su lugar,
  `tenantColorCssVars(primaryColor, secondaryColor, accentColor)`
  (`lib/branding/colors.ts`) devuelve los seis `--color-primary(-dark)
  /-secondary(-soft)/-accent(-soft)`, y el layout del dashboard
  (`app/t/[slug]/dashboard/layout.tsx`) los define una sola vez en su
  `<div>` raíz. Resultado: CUALQUIER componente compartido que ya use
  `bg-primary`, `text-accent`, `shadow-glow-primary`, etc. —
  MetricCard, StatusBadge, EmptyState, Dropdown, Card, el propio
  `Button` — se retiñe solo dentro del dashboard, sin tocar ese
  componente. El panel admin nunca redefine estas variables, así que
  sigue mostrando el índigo/violeta/cian fijo de la plataforma.
- **Bug real encontrado**: tras cambiar `tailwind.config.ts` (no solo
  usar una clase nueva, sino redefinir qué es `primary`/`secondary`
  /`accent`), el servidor de desarrollo siguió sirviendo CSS
  compilado con los colores viejos — Next/Tailwind no recompila su
  paleta de colores vía HMR normal cuando el cambio es estructural en
  `theme.extend.colors`, solo cuando cambian las clases *usadas* en un
  archivo. Hubo que reiniciar el dev server (`preview_stop` +
  `preview_start`, no `npm run build`) para que tomara la nueva
  paleta. Si un cambio futuro en `tailwind.config.ts` no parece
  aplicarse pese a que el archivo se guardó bien, reiniciar el dev
  server antes de sospechar del código.
- **Contraste del sidebar**: nuevo helper `readableFgRgb(hex)` en
  `lib/branding/colors.ts` — luminancia relativa (fórmula sRGB
  estándar) con umbral simple en 0.5, devuelve `"17 24 21"` (casi
  negro) o `"255 255 255"` según haga falta para leerse sobre `hex`.
  `Sidebar.tsx` calcula `sidebarFg = readableFgRgb(primaryColor)` y lo
  expone como variable `--sidebar-fg` en el `<aside>`; TODAS las
  clases que antes eran `text-white`/`border-white/NN`/`bg-white/NN`
  fijas ahora son `text-[rgb(var(--sidebar-fg))]` con el mismo patrón
  de alpha (`/0.4`, `/0.6`, etc.) que el resto del sistema de tokens.
  El botón hamburguesa móvil (fondo sólido `primaryColor`, fuera del
  `<aside>` así que no hereda la variable) usa el mismo cálculo
  directo por `style`.
- **Mismo problema existía en el CTA principal**: el botón
  `variant="primary"` de `components/ui/Button.tsx` tenía `text-white`
  fijo sobre un gradiente `from-primary to-secondary` — con un tenant
  de marca clara, texto blanco sobre fondo claro. Mismo arreglo: nueva
  variable `--color-cta-fg` (default `255 255 255` en `globals.css`,
  igual que antes ya que el gradiente de la plataforma siempre es
  oscuro), calculada por tenant dentro de `tenantColorCssVars()` vía
  `readableFgRgb(primaryColor)`. `Button.tsx` ahora usa
  `text-[rgb(var(--color-cta-fg))]`.
- Los tokens semánticos de estado (`success`/`warning`/`error`/`info`)
  se dejaron fijos a propósito — son colores de estado tipo semáforo,
  no identidad de marca, y no deberían cambiar por tenant.
- Verificado con dos rutas de prueba temporales (borradas al
  terminar): (1) colores claros inventados (`#F5E9C8`/`#D8C08A`
  /`#B08D57`, crema/dorado) — confirmé por JS (`getComputedStyle`) que
  tanto el texto del sidebar como el del botón "Agregar recurso"
  resuelven a `rgb(17, 24, 21)` (casi negro), y visualmente el Badge y
  el EmptyState de ejemplo (sin ningún cambio de código) ya salieron
  en tono dorado/crema del tenant en vez de índigo/violeta — prueba de
  que el "0 colores fijos" funciona a nivel de componente compartido.
  (2) Colores reales de `spa` en la base de datos
  (`primary #ead4ae` / `secondary #000000` / `accent #445407` — el
  secundario real de este tenant es negro puro) para confirmar que el
  nuevo tercer color del degradado del sidebar (antes
  `accentColor`, ahora `secondaryColor`) no se ve raro con un negro
  real: se ve bien, solo agrega profundidad al degradado. `tsc
  --noEmit` limpio. `/admin/login` verificado sin cambios (índigo
  /violeta/cian fijo de siempre).

**Botón de horario sólido, sin gradiente (mismo día, mensaje
siguiente)**: Bruno notó que algunos botones se veían "raros" — planos,
sin el gradiente que sí tienen los demás CTAs, y coincidiendo con el
tono más oscuro que el tenant asignó. Encontrado en
`components/booking/BookingFlow.tsx`: el botón de horario
seleccionado (paso "Hora" del flujo público de reserva) pintaba
`backgroundColor: primaryColor` sólido — y `primaryColor` suele ser
justo el color más oscuro del tenant (p. ej. verde bosque `#0E3B2C`
en `test-salon`), mientras "Seleccionar" y "Confirmar cita" ya usaban
el gradiente vibrante `ctaStyle` (`tenantCtaStyle()`,
`accentColor → oscurecido`). Cambiado a `{ ...ctaStyle, borderColor:
'transparent' }` para que los tres CTAs del flujo se vean
consistentes. Nota: como `onSelect` del horario avanza el paso
inmediatamente, este estado sólo se ve de forma persistente si el
usuario vuelve atrás con "Cambiar hora" — así se verificó en vivo
contra `test-salon`: el pill de la hora elegida ahora muestra el
gradiente lima (`rgb(143,226,74) → rgb(118,201,49)`) con texto verde
oscuro, en vez del bloque plano anterior. `tsc --noEmit` limpio.

**Corrección — Bruno aclaró que era el dashboard, no la reserva
pública (mismo día, mensaje siguiente)**: el arreglo de arriba
(BookingFlow) no era al que se refería. El problema real estaba en
`app/t/[slug]/dashboard/Sidebar.tsx` y `lib/branding/colors.ts`.

- **Botón sólido real**: el botón hamburguesa móvil del sidebar
  pintaba `backgroundColor: primaryColor` sólido (plano, sin
  gradiente) — cambiado a las mismas clases que usa el `Button`
  "primary" del dashboard: `bg-gradient-to-r from-primary to-secondary
  text-[rgb(var(--color-cta-fg))]`.
- **El problema más grande — "el fondo del modo oscuro es el color
  más oscuro"**: al probar con los colores reales de `test-salon`
  (`primary #0E3B2C` / `secondary #0A2E22`, un verde bosque casi
  negro) y activar el modo oscuro del dashboard (`ThemeToggle`), el
  panel lateral completo (antes construido con
  `tenantSidebarGradient()` — un alpha-blend puro de los colores del
  tenant sobre lo que sea que esté detrás) prácticamente desaparecía
  contra el fondo oscuro de la app: dos oscuros superpuestos (el color
  ya oscuro del tenant + el `--color-paper` oscuro de `.dark`)
  colapsan a casi negro sólido — exactamente lo que Bruno describió.
  Esto no pasaba con el sidebar del panel admin porque ese usa
  índigo/violeta de la plataforma, colores intrínsecamente vívidos —
  el bug solo aparece con un tenant que eligió colores de marca ya
  oscuros (bastante común: verde bosque, azul marino, negro).
  **Arreglo**: `tenantSidebarGradient()` ahora es un fondo de dos
  capas (mismo truco que ya usaba `tenantGlassBackground()` para la
  página pública) — el gradiente de color del tenant por encima, una
  base blanca semitransparente por debajo — así el panel se lee
  siempre como vidrio esmerilado con el tinte del tenant, sin importar
  qué tan oscuro sea ese color ni si el modo oscuro de la app está
  activo o no. Nuevo helper `tenantSidebarFg()` acompaña este cambio:
  antes el color de texto del sidebar se calculaba con
  `readableFgRgb(primaryColor)` directo (la luminancia CRUDA del
  color del tenant), pero ahora que el fondo real siempre se aclara
  con la base blanca, ese cálculo podía elegir mal — `tenantSidebarFg()`
  mezcla primero `primaryColor` hacia blanco (mismo peso aproximado
  que la capa de gradiente) y recién ahí calcula la luminancia, sobre
  el color compuesto real en vez del crudo.
- Verificado en vivo con una ruta de prueba temporal (colores reales
  de `test-salon`, borrada al terminar): en modo claro el sidebar se
  ve como vidrio verde-salvia legible (antes era un bloque verde
  bosque plano); alternando `document.documentElement.classList.add
  ('dark')` por JS, el mismo panel se mantiene con el mismo tono
  verde-salvia claro — ya NO colapsa a negro. `tsc --noEmit` limpio.

**"el azul marino cambialo por el color más oscuro de la selección"
(mismo día, mensaje siguiente, con captura real)**: Bruno mandó una
captura real del dashboard de `spa` en modo oscuro — el sidebar ya se
veía bien (arreglo anterior), pero el fondo del contenido principal
seguía siendo el azul marino fijo de la plataforma (`--color-paper` de
`.dark`, `rgb(10,11,20)`, con un dejo índigo). Pidió que ese fondo use
en cambio el color más oscuro de los que el tenant tiene asignados
(`primary_color`/`secondary_color`/`accent_color`) — en el caso de
`spa`, eso es `secondary_color = #000000` (negro puro).

- Nuevo `darkestOf()` (privado) en `lib/branding/colors.ts` compara la
  luminancia relativa de los tres colores del tenant y devuelve el más
  oscuro. Nuevo `tenantDarkModeCssVars()` lo usa para construir
  `--tenant-dark-paper/-surface/-elevated` (el color más oscuro tal
  cual para "paper", y dos variantes aclaradas con `lightenHex()` para
  "surface"/"elevated" — mantiene la sensación de profundidad por
  capas que ya tenía `.dark`, solo que ahora ancladas al tono del
  tenant en vez de a un gris/navy fijo).
- Estas tres variables por sí solas no hacen nada — las consume una
  regla nueva en `globals.css`: `.dark .tenant-shell { --color-paper:
  var(--tenant-dark-paper, ...); ... }`. Solo se activa bajo `.dark`
  (modo claro no se toca) y solo dentro de un elemento con la clase
  `tenant-shell` (el admin nunca la lleva, así que su modo oscuro
  sigue con el navy fijo de siempre). El `<div>` raíz de
  `app/t/[slug]/dashboard/layout.tsx` ahora lleva esa clase y mezcla
  `tenantDarkModeCssVars(...)` junto con `tenantColorCssVars(...)` en
  su `style`.
- Verificado en vivo con una ruta de prueba temporal (colores reales
  de `spa`, borrada al terminar): con `.dark` activado por JS, el
  fondo del panel (`.tenant-shell` y el div de ambiente que ya usaban
  `bg-paper`) computa a `rgb(0, 0, 0)` — negro puro real, no el navy
  índigo anterior — confirmado tanto por `getComputedStyle` como
  visualmente. `tsc --noEmit` limpio.

**"que también sea el fondo de las tarjetas y que sea el más oscuro
excepto negro" (mismo día, mensaje siguiente)**: dos pedidos más sobre
lo mismo. (1) Las tarjetas (`Card`, elevación por defecto `raised` →
clase `.glass-2`) no cambiaron con el fix anterior porque leen una
variable CSS DISTINTA (`--color-glass-base`), no `--color-surface`
/`--color-elevated` — se me había pasado. (2) Para `spa`, "el color más
oscuro" resultó ser exactamente `secondary_color = #000000` (negro
puro) — un fondo negro plano no tiene ningún matiz de marca, así que
Bruno pidió excluirlo y usar el siguiente más oscuro.

- `darkestOf()` ahora descarta cualquier color casi-negro
  (`relativeLuminance > 0.005`) antes de elegir el más oscuro del
  resto — con fallback a la lista completa si los tres colores del
  tenant fueran casi-negros (para no romperse en ese caso límite). Para
  `spa` esto cambia el color ancla de `#000000` (secundario) a
  `#445407` (acento, olivo oscuro).
- `tenantDarkModeCssVars()` gana una cuarta variable,
  `--tenant-dark-glass`, aclarada un paso más que `elevated`
  (`lightenHex(base, 32)`) ya que el glass de una `Card` necesita
  despegarse visiblemente de la página detrás. `globals.css` la
  conecta igual que las otras tres: `.dark .tenant-shell { ...
  --color-glass-base: var(--tenant-dark-glass, ...) }`.
- **Bug real encontrado mientras verificaba**: `darkenHex()`/
  `lightenHex()` devuelven strings `rgb(r, g, b)`, pero
  `toRgbTriplet()` — y por lo tanto todo lo que lo usa — esperaba un
  hex de `parseHex()`, que no sabía interpretar ese formato y caía
  silenciosamente al gris de respaldo `128 128 128` sin ningún error.
  Esto no era nuevo de hoy: ya afectaba a `--color-primary-dark`
  /`--color-secondary-soft`/`--color-accent-soft` desde el cambio de
  "0 colores fijos", solo que nunca se había verificado ese valor en
  concreto hasta ahora. Arreglado en la raíz: `parseHex()` ahora
  entiende tanto `#RRGGBB`/`#RGB` como `rgb(r, g, b)`/`rgba(...)`, así
  que cualquier función que encadene `toRgbTriplet(darkenHex(...))` (o
  lo que sea) funciona sin necesidad de tocar cada sitio donde se usa.
- Verificado en vivo con una ruta de prueba temporal (colores reales de
  `spa`, borrada al terminar), tras el fix de `parseHex`:
  `--color-paper` = `68 84 7` (exactamente `#445407`, el acento — NO el
  negro), `--color-surface`/`-elevated`/`-glass-base` progresivamente
  más claros, y el fondo real de la `Card` (`getComputedStyle`) =
  `rgba(100, 116, 39, 0.55)` — tono olivo real, ya no el gris `128 128
  128` de respaldo. `--color-primary-dark`/`-secondary-soft` también
  verificados con valores reales (antes también caían en el gris).
  `tsc --noEmit` limpio.

**Bug real y grave: BrandEditor "guardaba" pero al volver mostraba los
defaults (mismo día, captura del editor de marca)**: Bruno mandó una
captura del editor de marca de un tenant mostrando exactamente los
colores por defecto del preset "Modern" (que también son los defaults
de la columna en la base) y dijo: edité los colores, salí, volví a
entrar, y estaban en default otra vez.

- Primero até cabos sueltos ya sospechosos: `updateTenantBranding()`
  (`actions.ts`) llamaba `.update(branding)` sin revisar `{ error }` —
  si Supabase fallaba, quedaba en silencio y `BrandEditor` igual
  mostraba "Guardado ✓". Arreglado: ahora lanza si hay error, y
  `BrandEditor.handleSave()` lo atrapa y muestra el mensaje en vez de
  fingir éxito.
- Pero probando en vivo (sin poder loguearme como admin — no tengo
  credenciales, así que monté una ruta de prueba temporal que renderiza
  el `BrandEditor` REAL apuntando a `updateTenantBranding` REAL contra
  `test-salon`, sin pasar por `/admin/login`, ya que esa acción no
  depende de sesión, solo de `service_role`) encontré el verdadero
  bug, más grave: **guardar SÍ escribía en la base** (confirmado con un
  script de Node aparte, fuera de Next, leyendo directo de Supabase)
  pero una recarga completa de la página — incluso con URL con
  cache-busting nueva cada vez — seguía mostrando el valor VIEJO.
  `export const dynamic = 'force-dynamic'` (que ya había agregado
  antes por las dudas) no lo arregló. La causa real: el Data Cache de
  fetch() de Next.js cachea las llamadas HTTP que hace `supabase-js`
  por debajo, y eso es una capa DISTINTA del cacheo a nivel de ruta —
  marcar la ruta como dinámica no basta para desactivarlo cuando el
  propio cliente no pide explícitamente `no-store`.
- **Arreglo real**: `lib/supabase/admin.ts` y `lib/supabase/server.ts`
  ahora pasan `global: { fetch: (input, init) => fetch(input, {
  ...init, cache: 'no-store' }) }` al crear el cliente — fuerza que
  TODAS las lecturas de Supabase de ambos clientes sean siempre en
  vivo, nunca cacheadas por Next. Esto no es solo el editor de marca:
  cualquier página que lea con `createAdminClient()` o el `createClient()`
  de cookies (dashboard del tenant, panel admin completo) podía estar
  sujeta al mismo problema — guardar algo y no verlo reflejado hasta
  quién sabe cuándo. Se arregló en la raíz (los dos factory functions),
  no por página.
- Verificado en vivo, paso a paso, contra los datos reales de
  `test-salon` (con snapshot y restauración exacta al terminar para no
  dejar cambios): cambié `primary_color` a un valor de prueba, guardé,
  confirmé por script de Node aparte que la base ya tenía el nuevo
  valor, recargué la página con una URL nunca antes visitada —
  ANTES del fix seguía mostrando el valor viejo, DESPUÉS del fix (con
  el `no-store` en `admin.ts`) mostró correctamente el valor nuevo.
  Colores de `test-salon` restaurados a los que tenía antes de probar.
  `tsc --noEmit` limpio. No pude probar el flujo de login real del
  panel admin (no tengo credenciales) — si algo se sigue viendo raro
  ahí específicamente, avisame.

**Modo claro/oscuro para la página pública de reserva, decidido desde
el panel de admin (mismo día)**: Bruno pidió que `/t/[slug]/reservar`
tenga modo oscuro igual que el dashboard, pero decidido por el equipo
en el admin, no por el visitante (nada de toggle ni de seguir el
`prefers-color-scheme` del navegador).

- **`db/012_tenant_theme_mode.sql`** (⚠️ pendiente de aplicar
  manualmente en el SQL Editor de Supabase, igual que las migraciones
  anteriores — el código de abajo ya asume que existe): columna
  `theme_mode text not null default 'light' check (in ('light',
  'dark'))`.
- **`BrandEditor.tsx`**: nuevo selector "Claro/Oscuro" arriba de los
  color pickers, escribe `form.theme_mode`. `TenantBranding`
  (`actions.ts`) gana el campo.
- **`reservar/page.tsx`**: `theme_mode` se consulta en un `.select()`
  APARTE del resto del branding (mismo motivo ya documentado en este
  archivo para separar columnas nuevas de las viejas: si `theme_mode`
  todavía no existe en un ambiente, que se pierda solo el modo —
  vuelve a 'light', el comportamiento de siempre — no todos los demás
  colores). Cuando `theme_mode === 'dark'`, el `<main>` lleva las
  clases `dark tenant-shell bg-paper text-ink` puestas DIRECTAMENTE
  ahí (no heredadas de `<html>` — el modo es un ajuste del admin, no
  debe depender de si un visitante o un miembro del equipo tiene su
  navegador en modo oscuro) y el mismo par `tenantColorCssVars()` +
  `tenantDarkModeCssVars()` ya construido para el dashboard — cero
  mecanismo nuevo, mismo ancla al color más oscuro de la marca
  (excepto negro). En modo claro sigue exactamente igual que antes
  (`force-light` + `background_color`/`text_color` del tenant).
- **`BookingFlow.tsx` tenía varios colores hardcodeados en blanco/negro**
  que se hubieran visto rotos en oscuro (nunca se habían tocado porque
  la página siempre fue clara hasta hoy): los pills de "¿Con quién?"
  (`border-black/10 bg-white`), los pills de horario sin seleccionar
  (`backgroundColor: 'white', color: '#1A1A1A'` inline), el textarea de
  notas (`bg-white`), y los círculos/línea del indicador de pasos para
  el estado inactivo (`rgba(0,0,0,0.06)` etc — invisible sobre fondo
  oscuro). Todos migrados a los tokens `border-border`/`bg-surface`
  /`bg-glass`/`text-ink`/`bg-ink/NN`, que ya se retiñen solos con
  `.dark`. El día a día de `AvailabilityCalendar` (react-day-picker) no
  se tocó — no tiene colores propios hardcodeados en este código, así
  que probablemente herede bien vía `currentColor`, pero no se verificó
  a fondo (necesita datos de disponibilidad reales para llegar a ese
  paso, y las pruebas de hoy usaron datos falsos).
- Verificado en vivo con una ruta de prueba temporal (los colores
  reales de `test-salon`, borrada al terminar — no pude probar el
  flujo real con `theme_mode` porque la columna todavía no existe en
  la base): fondo y card ancladas al verde bosque del tenant, botón
  "Seleccionar" con el gradiente lima de siempre, los pills "¿Con
  quién?" ahora legibles (antes hubieran sido blanco invisible sobre
  fondo oscuro), indicador de pasos legible. `tsc --noEmit` limpio.
- **Pendiente de vos**: correr `db/012_tenant_theme_mode.sql` en el SQL
  Editor de Supabase — sin eso, el selector Claro/Oscuro del
  `BrandEditor` no tiene dónde guardar el valor.

**Bug de seguimiento: las tarjetas del hero/booking seguían blancas en
modo oscuro (mismo día, captura real de `test-salon` ya con
`theme_mode` funcionando)**: Bruno ya había corrido la migración y
activado modo oscuro — el FONDO de la página sí cambió (correcto), pero
el hero ("Peluquería / Barbería") y la tarjeta de reserva seguían un
rosa/lavanda claro, muy fuera de lugar contra el fondo morado oscuro.
Comparó contra el "Resumen" del dashboard, donde las tarjetas sí se ven
oscuras y coherentes, y pidió que acá pase lo mismo.

- **Causa**: `tenantGlassBackground()` (`lib/branding/colors.ts`) —
  usada por CADA superficie de vidrio en `BlockRenderer.tsx` (hero,
  features en grid, testimonio, ubicación, horarios, redes sociales,
  tarjeta de reserva — 7 sitios) — siempre mezclaba hacia blanco como
  base, sin im importar el tema. Tenía sentido cuando la página era
  siempre clara, pero con modo oscuro ahora activable, cada tarjeta
  seguía forzando blanco encima de un fondo ya oscuro.
- **Arreglo**: `tenantGlassBackground()` gana un cuarto parámetro
  opcional `darkBase` (un hex) — si se pasa, lo usa como base en vez de
  blanco. Nuevo `tenantDarkBase(primaryColor, secondaryColor,
  accentColor)` expone (como hex, no como triplete de variable CSS) el
  mismo color "elevated" que ya calculaba `tenantDarkModeCssVars()`
  para el fondo del dashboard — mismo ancla, sin duplicar la lógica de
  "el más oscuro, excepto negro".
- **`BlockRenderer.tsx`**: el tipo `Branding` gana `isDark`/`darkBase`
  (opcionales — todo lo que no los pase, como el editor de plantillas,
  sigue exactamente igual que antes). Nuevo helper interno `glassBg()`
  centraliza el `branding.isDark ? branding.darkBase : undefined` para
  no repetirlo en los 7 sitios. Los bordes `border-white/60` de esas
  mismas 7 tarjetas también pasan a `border-border` (token, ya
  theme-aware) cuando `isDark`, en vez de un borde blanco brillante que
  no pega con un panel oscuro.
- **`reservar/page.tsx`**: calcula `darkBase` una sola vez (solo cuando
  `isDark`) y lo mete en el objeto `branding` que ya se pasaba a
  `BlockRenderer` — cero cambios adicionales de plomería. La tarjeta de
  respaldo "sin plantilla" (dos usos directos de
  `tenantGlassBackground`) recibe el mismo tratamiento.
- Verificado en vivo con una ruta de prueba temporal (los colores
  reales de `test-salon` de la captura — morado `#300e3a`/`#2c0a2e`,
  acento magenta `#df4be2` — con bloques hero + features + booking
  reales pasando por `BlockRenderer`, borrada al terminar): las tres
  tarjetas ahora anclan al mismo morado oscuro del fondo en vez de
  blanco/lavanda, coherente con el dashboard. `tsc --noEmit` limpio.

**Auditoría técnica de producción + plan de corrección (mismo día,
sesión larga)**: Bruno pidió una auditoría exhaustiva ("¿está listo
para producción?") y luego "haz todo lo necesario para mandar a
producción". Se hizo la auditoría completa primero (ver el mensaje de
esa conversación para el reporte entero — no se repite aquí), y
después se ejecutó el plan de corrección real, con dos decisiones que
Bruno tomó explícitamente: actualizar Next.js YA (no dejarlo pendiente)
y hostear en Vercel.

- **Patrón de error silenciado, arreglado en las 9 Server Actions que
  quedaban** (`resources`, `services`, `schedule`, `calendar`,
  `templates` admin) — mismo arreglo que ya se había hecho en
  `BrandEditor` antes en la sesión: revisar `{ error }` y lanzar en vez
  de fallar en silencio. `createService` también gana validación real
  de `duration_minutes`/`price_mxn` (antes `Number()` podía dar `NaN`
  y reventar contra el `check` de la base sin mensaje claro).
- **Defensa en profundidad multi-tenant**: cada mutation por ID
  (`deleteResource`, `cancelBooking`, etc.) ahora también filtra por
  `tenant_id`, no solo confía en RLS. Y `createScheduleSlot` verifica
  que `resource_id` realmente pertenezca al tenant antes de insertar —
  hueco que el propio `db/README.md` ya tenía documentado como
  "pendiente / no resuelto".
- **`error.tsx`/`not-found.tsx`/`global-error.tsx`** en la raíz,
  `/admin/(panel)`, y `/t/[slug]/dashboard` — antes CERO boundaries en
  toda la app; cualquier excepción no capturada mostraba la página de
  error genérica de Next sin ninguna posibilidad de recuperación.
- **`app/api/reservar/route.ts`**: validación real de tipos/longitud/
  formato de email/fechas (antes solo chequeos de "existe"), un rate
  limiter en memoria por IP (documentado como stopgap — en Vercel
  serverless no es 100% confiable entre instancias; lo real es prender
  Vercel Firewall en el dashboard), y `console.error` en el catch de
  `create_booking` (antes el error de Postgres se perdía sin dejar
  rastro).
- **`safeHref()`** (nuevo, `lib/branding/safeHref.ts`) sanea `ctaLink`
  /`mapUrl`/`link.url` en `BlockRenderer.tsx` contra `javascript:`/
  `data:` — un admin (o una cuenta de admin comprometida) podía meter
  un URI ejecutable en un campo de plantilla que afecta a TODOS los
  tenants de esa plantilla y a sus visitantes reales.
- **Cabeceras de seguridad** (`next.config.mjs`): X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Se dejó
  CSP afuera a propósito — el script inline del theme-init en
  `app/layout.tsx` necesitaría nonces para no romperse, y no valía el
  riesgo en esta pasada.
- **`.env.example`** nuevo — las 4 variables nunca habían estado
  documentadas en ningún lado del repo salvo `.env.local` (ignorado por
  git).
- **Contraseña mínima subida de 6 a 10 caracteres** para crear un dueño
  de tenant (`createTenantOwner`).
- **Rendimiento**: `/admin/tenants` cambió de traer la tabla `tenants`
  completa a memoria para contar en JS a tres `count: 'exact', head:
  true` separados. `/admin/tenants/[tenantId]` cambió 4 queries
  secuenciales (cada una esperando a la anterior) a un solo
  `Promise.all`.
- **`db/013_input_length_constraints.sql`** (⚠️ pendiente de aplicar
  manualmente, igual que las anteriores) — límites de longitud en
  `customers.name/email/phone`, `bookings.notes`, `tenants.description`
  — nada los limitaba antes, y el flujo público de reserva es
  alcanzable sin autenticación.
- **Primer commit de git** — el repo tenía meses de trabajo y CERO
  commits. Ahora tiene historial real, y un segundo commit con toda la
  infraestructura de tests/CI (ver abajo), y un tercero/cuarto con el
  upgrade de Next.js.
- **Tests automatizados, de cero a algo real**: Vitest instalado.
  Unitarios para `lib/branding/colors.ts` (incluye un test de
  regresión específico para el bug de `darkenHex`/`lightenHex` →
  `toRgbTriplet` encontrado antes en la sesión) y `safeHref`. Dos
  suites de integración contra la base REAL de Supabase (no mocks):
  atomicidad de `create_booking` (incluye el caso de dos reservas
  simultáneas encimadas, y que no quede un `customer` huérfano si la
  segunda falla) y el límite de RLS visto desde la clave `anon` (sin
  crear ninguna cuenta — confirma que `customers`/`bookings`
  /`business_users`/`payments`/`platform_admins` son ilegibles para un
  visitante anónimo, y que el catálogo público sí es legible). Ambas
  suites crean su propio tenant de prueba y lo borran al final
  (cascada desde `tenants`), verificado que no queda nada suelto.
- **CI de GitHub Actions** (`.github/workflows/ci.yml`): type-check +
  lint + test en cada push/PR. No despliega nada — eso lo hace la
  integración de Vercel con GitHub directamente; esto es solo un
  gate para que un build roto se vea ANTES de llegar a Vercel.
- **Upgrade de Next.js 14.2.5 → 16.3.3 (+ React 18 → 19, ESLint 8 → 10)**:
  resolvía ~15 CVEs de severidad alta confirmados por `npm audit`
  (ahora en 0 vulnerabilidades). El cambio real de fondo: `params`/
  `searchParams`/`cookies()` pasaron a ser async desde Next 15 — hubo
  que tocar los 11 archivos que desestructuran `params`/`searchParams`
  sincrónicamente y los 14 que llaman `createClient()` de
  `lib/supabase/server.ts` (ahora async). TypeScript NO marcó estos
  errores en la mayoría de los casos (los tipos de `params` eran
  anotaciones manuales, no los generados por Next), así que se
  encontraron corriendo el dev server de verdad contra `/reservar` y
  viendo el error real en los logs — lección: después de un upgrade de
  Next.js, `tsc --noEmit` limpio NO es suficiente prueba, hay que
  probar en el navegador. También se corrió el codemod oficial
  `middleware-to-proxy` (`middleware.ts` → `proxy.ts`, nueva
  convención de Next 16).
- **Verificado de punta a punta después del upgrade**: `npm run build`
  completo (18 rutas, todas compilan/prerenderizan), los 34 tests en
  verde, y una reserva REAL creada a través del flujo público completo
  (servicio → fecha → hora → datos → confirmar → `/api/reservar` →
  200 OK) contra `test-salon`, luego borrada. Rutas de admin
  (`/admin/login`, subdominio) verificadas sin poder loguearme (no
  tengo credenciales) — el build de producción compilando esas rutas
  sin error es la evidencia disponible para esa parte.
- **Pendiente de vos, no lo pude hacer yo**:
  - Correr `db/013_input_length_constraints.sql` (y el `012` si
    todavía no lo corriste) en el SQL Editor de Supabase.
  - Crear el repo en GitHub, agregarlo como remoto, y hacer push —
    no tengo `gh` instalado ni una cuenta para crear uno.
  - Conectar ese repo a un proyecto de Vercel (deploy automático) y
    cargar las 4 variables de entorno ahí.
  - Agregar los 3 secrets de Supabase a GitHub Actions (Settings →
    Secrets) para que las pruebas de integración corran en CI — sin
    esto simplemente se saltan (no fallan).
  - Prender Vercel Firewall (rate limiting) en el dashboard del
    proyecto una vez desplegado — el limiter en memoria del endpoint
    público es un stopgap, no el arreglo real en serverless.
  - Confirmar/probar el plan de backups de Supabase (esto es
    configuración del dashboard de Supabase, no código).
  - Todo lo de "post-producción" del plan original (pagos, confirmación
    por email/WhatsApp, recuperación de contraseña) sigue pendiente,
    sin tocar en esta pasada — son features nuevas, no arreglos de
    lanzamiento.

**Deploy a Vercel + recuperación de contraseña (mismo día, después)**:

- **Deploy real**: `vercel login` encontró una sesión ya guardada en la
  máquina (cuenta `brb6754`, confirmado con Bruno que es la suya).
  Proyecto creado y desplegado vía CLI directo (sin GitHub todavía) en
  **https://reservas-saas-sigma.vercel.app**. Las 3 variables de
  Supabase cargadas en Vercel para production/preview/development
  (`SUPABASE_SERVICE_ROLE_KEY` como tipo Secret). `NEXT_PUBLIC_ROOT_
  DOMAIN` apuntado al alias real de producción. Verificado en vivo: la
  home carga sin errores; `admin.reservas-saas-sigma.vercel.app` NO
  resuelve (esperado — un dominio compartido `.vercel.app` no permite
  wildcard de subdominios propios, así que admin/dashboard de tenant
  no van a andar hasta que haya un dominio real con `*.dominio` en
  Vercel). Bruno decidió NO comprar dominio todavía.
- **Recuperación de contraseña** (`/admin/login` y `/t/[slug]/login`):
  Supabase Auth ya lo soportaba, solo faltaba la UI y el intercambio
  de código PKCE. Nuevo toggle "¿Olvidaste tu contraseña?" en ambos
  `LoginForm`, `requestPasswordReset()` (Server Action, mismo patrón
  que `signIn`/`signOut`), `/auth/callback` (Route Handler — el
  intercambio de código por sesión tiene que pasar por ahí porque un
  Server Component no puede setear la cookie de sesión resultante,
  solo un Route Handler o Server Action puede) y `/reset-password`
  (página con el formulario de nueva contraseña, llama
  `auth.updateUser()` desde el cliente browser).
  - Verificado en vivo: el toggle y el mensaje genérico "si ese correo
    tiene cuenta..." (mismo mensaje exista o no el correo, para no
    filtrar qué emails están registrados) en ambos logins; y el
    mensaje de error correcto al visitar `/reset-password` sin una
    sesión de recuperación válida ("el enlace ya venció o ya se usó").
  - **No verificado**: el camino feliz completo (clic real en el
    email → `/auth/callback` → `/reset-password` → contraseña
    cambiada). Hacerlo hubiera requerido crear una cuenta de prueba
    nueva (ya bloqueado una vez esta sesión por el clasificador de
    permisos) o resetear la contraseña de una cuenta real de Bruno —
    ninguna de las dos me pareció correcta para hacer sin pedir
    permiso primero. Si Bruno quiere probar ese tramo, tiene que
    hacerlo él mismo con su propio correo.
