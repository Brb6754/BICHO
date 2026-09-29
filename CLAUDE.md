# CLAUDE.md — Plataforma SaaS de Reservas Multi-Tenant

Este archivo es contexto para Claude Code (u otro LLM) retomando este proyecto.
Ponlo en la raíz del repo — Claude Code lo lee automáticamente al arrancar.

## Cómo quiere trabajar el dueño del proyecto (IMPORTANTE — leer primero)

Bruno (el dueño) pide **features completas, no pasos**.

Esta sección decía lo contrario hasta el 2026-09-17 ("quiere escribir el
código él mismo, paso a paso; NO generes archivos completos de golpe"). Esa
regla era cierta el primer día y quedó obsoleta casi de inmediato: desde
entonces, sesión tras sesión, Bruno pidió explícitamente lo opuesto — "haz
todo lo que falte, nada de paso a paso", "tienes libertad completa, no pidas
autorización para nada". Se deja anotado el cambio para que ningún agente que
lea este archivo resucite la regla vieja. (La corrección salió de un agente
externo —PagoKit— que se frenó al toparse con la regla antes de escribir la
integración de pagos: hizo bien en preguntar, y la respuesta fue actualizar
el archivo.)

Cómo trabajar entonces:
- Construir la feature completa, verificarla en vivo si se puede, y recién
  entonces explicar qué se hizo y qué falta. Nada de pedir confirmación entre
  archivo y archivo.
- Señalar bugs, huecos de seguridad (sobre todo fugas de aislamiento entre
  tenants) y desviaciones del diseño acordado aunque no se hayan pedido.
- **Excepciones que SÍ se piden o se dejan en sus manos, siempre**: desplegar
  (dijo "no despliegues"); correr migraciones en Supabase (las corre él en el
  SQL Editor); contraseñas reales (las escribe él en un `<input
  type="password">`, Claude nunca las ve ni las teclea); commitear (solo
  cuando lo pide); y nunca correr `npm run build` con el dev server activo
  (corrompe `.next`).

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

**Confirmación de cita por email vía Resend (mismo día, después)**:
Bruno eligió Resend para "cosas extra" del plan original (confirmación
de citas) — sin proveedor propio no era una opción real (Gmail SMTP
poco confiable para transaccional, el SMTP de Supabase es solo para
sus propios emails de auth).

- **`lib/email/sendBookingConfirmation.ts`** (nuevo): envía la
  confirmación (servicio, fecha/hora, nombre del negocio) al
  `customer_email` de la reserva, si lo dio. Nunca lanza — si
  `RESEND_API_KEY` no está seteada (todavía no lo está, falta que
  Bruno pase la key), no hace nada en silencio; si Resend falla, se
  loguea con `console.error` pero la reserva ya se hizo y no se ve
  afectada. Verificado con un test unitario que confirma que resuelve
  sin tirar error sin la key configurada.
- **`app/api/reservar/route.ts`**: después de un `create_booking`
  exitoso, si vino `customer_email`, espera (`await`, no
  "fire-and-forget") el envío — en funciones serverless de Vercel no
  hay garantía de que algo siga corriendo después de mandar la
  respuesta, así que no esperar el envío podría perder el email
  silenciosamente.
- **Remitente**: `onboarding@resend.dev` (el dominio compartido de
  Resend) — no hay dominio propio todavía. Sirve para probar, pero es
  más confiable para la bandeja del dueño de la cuenta que para
  clientes reales; cuando haya un dominio, verificarlo en el dashboard
  de Resend y cambiar el remitente a algo como `reservas@tudominio.com`.
- **Pendiente de vos**: pasar la `RESEND_API_KEY` (de
  resend.com/api-keys) para que esto realmente empiece a mandar
  correos — sin ella, las reservas siguen funcionando exactamente
  igual, solo que sin el email de confirmación.

**Autoservicio del cliente: ver/cambiar/cancelar su cita (mismo día,
después)**: Bruno pidió que el email tenga un botón "Ver mi cita" con
los detalles y la opción de cambiarla o cancelarla — el hueco de UX
que ya habíamos identificado ("qué le falta a esto para ser perfecto
para el usuario").

- **`app/t/[slug]/reservar/cita/[bookingId]/`** (nuevo): página pública
  sin login — el UUID de la reserva hace de autenticación, mismo
  modelo de confianza que ya usa `/api/reservar` para crear. Cada
  lectura/escritura filtra por `tenant_id` Y `bookingId` juntos, así
  que un ID de una reserva de otro tenant nunca puede tocar nada acá
  aunque alguien lo adivinara. Usa `service_role` porque `anon` no
  tiene ninguna policy de RLS sobre `bookings` (por diseño).
  - `page.tsx`: muestra servicio, fecha/hora, recurso, y el estado
    (Confirmada/Cancelada/Completada), con el mismo sistema de marca
    (`tenantGlassBackground`, modo oscuro) que el resto de la página
    pública.
  - `actions.ts`: `cancelPublicBooking` y `reschedulePublicBooking` —
    ambas exigen `status = 'confirmed'` antes de tocar la fila (no se
    puede "cancelar" o "cambiar" algo ya cancelado). El reagendado pasa
    por el mismo constraint de exclusión de Postgres que ya previene
    doble-booking en toda la app — si el horario nuevo choca con otra
    cita, Postgres lo rechaza solo (código `23P01`), no hay lógica
    nueva de validación de disponibilidad que mantener.
  - `RescheduleForm.tsx`: reusa `AvailabilityCalendar` y el mismo
    patrón de `get_available_slots` que `BookingFlow.tsx` — nada de
    código de disponibilidad duplicado o reescrito.
  - `BookingActions.tsx`: `ConfirmForm` para cancelar (mismo componente
    que ya usa el dashboard del staff), toggle a `RescheduleForm` para
    cambiar.
- **Email**: `sendBookingConfirmation()` gana un botón "Ver mi cita"
  con el color de acento del tenant, y de paso se agregó
  `escapeHtml()` sobre todo el texto interpolado (nombre del cliente,
  nombre del negocio, nombre del servicio) — no había ningún escape
  antes, aunque el riesgo real era bajo.
- **Nota importante**: el link del email (`https://{slug}.{ROOT_
  DOMAIN}/reservar/cita/{id}`) todavía no es alcanzable en producción
  — mismo problema del dominio ya documentado arriba (sin wildcard
  DNS, los subdominios de tenant no resuelven en `*.vercel.app`). El
  botón se genera bien, simplemente no anda hasta que haya un dominio
  real.
- Verificado en vivo de punta a punta contra una reserva real de
  prueba en `test-salon` (creada directo por script, no por la UI, para
  ir más rápido): entré a `/reservar/cita/{id}`, vi los detalles
  correctos, cambié la cita a un horario distinto (confirmado en la
  base que `starts_at` realmente cambió), y después la cancelé
  (confirmado que el estado pasa a "Cancelada" y desaparecen los
  botones de acción). Reserva y cliente de prueba borrados al
  terminar. `tsc --noEmit` limpio, 35 tests en verde.

**Rediseño: de glassmorphism a tarjetas opacas + sombra suave (mismo
día, después)**: Bruno no estaba conforme con el estilo visual (no los
colores por tenant, esos quedan igual — el blur/glass en sí). Pidió
referencias, mandó tres landing pages (SaaS, viajes, productividad)
con un patrón común clarísimo: tarjetas opacas, sombra suave en capas
para dar profundidad, botones pastilla, el color como acento puntual
en vez de baño ambiental. Se usó la skill `brainstorming` para esto —
clasificado como arquitectónico (toca el sistema de diseño completo,
y ya hubo varios cambios de dirección sobre esto mismo en la sesión),
2 approaches propuestos (piloto en dashboard primero vs. todo de una),
Bruno eligió todo de una.

- **`globals.css`**: `.glass-1/2/3` redefinidas — de translúcido+blur a
  opaco (`--color-glass-base`, que ya era theme/tenant-aware) + sombra
  en capas + borde fino neutro. Como Card/Dropdown/Table/Modal ya
  consumían estas tres clases por nombre, el cambio se propaga solo.
  `.ambient-glow` con la opacidad de los blobs a la mitad aprox (se
  mantiene, más sutil, como pidió Bruno).
- **`lib/branding/colors.ts`**: `tenantGlassBackground()` ahora mezcla
  un tinte sutil y plano del tenant en una base opaca (nuevo helper
  `mixHex`) en vez de un degradado translúcido — misma firma, ningún
  call site tuvo que cambiar su forma de llamarla. `tenantSidebarGradient()`
  pasa a ser un degradado opaco de dos paradas, sin translucidez.
  `tenantSidebarFg()` ahora recibe primary+secondary (antes solo
  primary) — sin la capa blanca de base ya no hacía falta compensar
  aclarando el color antes de medir luminancia.
- Los dos `Sidebar.tsx` (admin y tenant), los 7 usos de glass en
  `BlockRenderer.tsx`, y las dos páginas públicas de reserva perdieron
  `backdrop-blur`/`border-white/60` y sus blobs de ambiente también
  bajaron de opacidad. `Input`/`Select` pasaron de `bg-glass/55` +
  blur a `bg-surface` opaco.
- **Bug ambiental descubierto en el camino (no relacionado al
  rediseño)**: al verificar, `nslookup` reveló que
  `xdxjiqnvpfiujosmtxlf.supabase.co` (y `api.supabase.co`) no
  resuelven DNS en esta máquina ahora mismo, aunque `supabase.co` y el
  resto de internet sí — un problema de red local puntual, no del
  proyecto ni de este cambio. Esto tumbó las pruebas de integración
  reales (7 fallos, todos timeout) y bloqueó probar contra datos
  reales en el navegador. Se armó una ruta de prueba temporal con
  datos 100% estáticos (sin ninguna llamada a Supabase) para poder
  verificar el cambio visual igual — capturas de Card/Button/Badge
  /Input, el hero+features de BlockRenderer en claro Y oscuro, y el
  Sidebar del tenant abierto en mobile: todo opaco, con sombra, sin
  blur. Si esto se repite, revisar la conexión de red antes que el
  código.
- `tsc --noEmit` limpio. 27/34 tests en verde (los 7 que fallan son
  las pruebas de integración reales contra Supabase, bloqueadas por lo
  de arriba — no una regresión de este cambio). 2 tests unitarios de
  `tenantGlassBackground` actualizados para el nuevo formato de salida
  (antes esperaban `rgba(...)`/gradiente, ahora es un solo `rgb(...)`
  opaco).

**Rediseño del sistema de plantillas — auditoría + rearquitectura + 6
plantillas (2026-09-10)**: Bruno pidió un rediseño total del website
builder porque "todas las plantillas se sienten iguales y cambiar
colores/imágenes no lo soluciona". Se auditó primero (el brief lo
exigía) y la causa resultó **arquitectónica, no de CSS**:

1. **La página no tenía sistema de layout.** `BlockBox` era `mx-auto` +
   `MAX_WIDTH_CLASS` con valores `max-w-sm/md/2xl` — el default `md`
   renderizaba a **448px en una pantalla de 1440px** (medido en vivo, no
   estimado). Hero full-bleed, split 50/50 y composiciones asimétricas
   no estaban mal diseñadas: eran **inalcanzables**.
2. **Los bloques no tenían variantes** — un tipo = un render. Toda la
   variación disponible era `hero.align` y `features.layout`.
3. **El vocabulario era ciego a la industria** — 11 tipos genéricos, y
   `features` era un array de strings, así que ninguna plantilla podía
   expresar "servicio con precio y duración".
4. **Una plantilla no cargaba lenguaje de diseño** — y su `accent_color`
   ni siquiera se usaba en la página pública (BlockRenderer recibe los
   colores del *tenant*), así que la única diferencia se borraba en
   cuanto el negocio configuraba su marca.

**Principio que ordena todo el rediseño**: la diferenciación vive en la
**composición**, nunca en el color — el color es exactamente lo que el
tenant sobreescribe.

Cambios:
- **`MAX_WIDTH_CLASS` remapeado** a `max-w-2xl/4xl/6xl/a sangre`. Las
  CLAVES guardadas no cambiaron (cero migración de datos), solo lo que
  significan. Verificado: 448px → 896px.
- **`variant` en cada bloque** + `BLOCK_VARIANTS`/`DEFAULT_VARIANT`.
  `normalizeBlock` lo rellena, así que ningún bloque viejo se rompió.
- **Tipos nuevos**: `services` (nombre/precio/duración/descripción),
  `team`, `split`, `faq`, `cta`.
- **`TemplateDesign`** (`db/014_template_design.sql`, ya aplicada):
  typeScale / rhythm / shape / imageTreatment / headingFont /
  upperHeadings. Se aplica como variables CSS `--tpl-*` en la raíz vía
  `templateDesignCssVars()`, así que ningún bloque necesita saber en qué
  plantilla está. Se consulta en un `.select()` aparte de `blocks` —
  mismo patrón defensivo que `theme_mode`.
- **`components/blocks/Sections.tsx`** (nuevo): Hero ×5 composiciones,
  Services ×4, Split ×3, Team ×2, FAQ (`<details>` nativo, accesible sin
  JS) y CTA. Con empty states e `ImagePlaceholder` — una plantilla se ve
  deliberada antes de que suban una sola foto.
- **`db/seed-templates.mjs`** (idempotente, upsert por `vertical`):
  las 6 plantillas — peluquería (editorial/serif/sharp), spa
  (cinematic/arch), pádel (condensed/UPPER, **booking en el primer
  tercio** porque para una pista la disponibilidad ES el producto),
  dentista (rounded/grotesque), doctor (humanist/circle, hero minimal),
  gimnasio (Arial Black/UPPER/compact). Contenido demo real en español
  mexicano, cero lorem ipsum. Verticales nuevas: `spa`, `doctor`,
  `gimnasio`.
- **Editor** (`TemplateBuilder.tsx`): selector de variante ("Composición")
  arriba de los campos, y formularios para los 5 tipos nuevos. Los ítems
  repetidos (servicios/equipo/FAQ) se editan como una línea por entrada
  con campos separados por `|`, misma convención que features/gallery/
  social — compacto y permite pegar una lista de precios desde un
  documento.
- **El filtro de verticales de `/admin/tenants` ya no está hardcodeado**
  — se consulta de `templates`. El array había derivado: listaba 4
  verticales cuando existían 6, así que dos eran infiltrables.

**Bug propio encontrado y corregido en la verificación**: el hero
`overlay` exigía imagen para tomar su rama, así que sin foto caía hasta
el default editorial — una plantilla cambiaba de composición según si
alguien había subido una imagen. Ahora `fullscreen` y `overlay` siempre
toman esa rama; el caso sin imagen pinta el color de marca.

Verificado en vivo con una ruta QA temporal que renderizaba las 6 vía
el `BlockRenderer` real (borrada al terminar): a 1440px y a 440px cero
overflow horizontal, y las 6 miden distinto de verdad — h1 de 52 a 88px,
seis familias tipográficas, tres con hero oscuro y tres claro, y el
`menu` de servicios con sus guías de puntos. `test-salon` (peluquería)
ya sirve la plantilla nueva completa con el flujo de reserva intacto.
`tsc --noEmit` limpio, 30/30 tests.

**Pendiente**: preview responsive (desktop/tablet/mobile) dentro del
editor, subida real de imágenes (hoy siguen siendo URLs pegadas), y
drag & drop de secciones ya existe pero no reordena variantes.

**Editor de plantillas → canvas de manipulación directa (2026-09-10,
mismo día)**: Bruno pidió "un canva de páginas web". El editor era una
columna de tarjetas-formulario junto a un preview pasivo: para cambiar
una sección buscabas su tarjeta en la lista, y el preview era algo que
mirabas. Eso es un CMS, no un page builder — **lo que estabas diseñando
nunca era lo que tocabas**.

Ahora el preview ES la superficie de edición. Layout de tres paneles:
riel de capas (izq) · canvas (centro, dominante) · inspector contextual
(der), con una toolbar arriba.

Tres decisiones que lo hacen comportarse como canvas y no como un
preview que además es clickeable:
- **El bloque renderizado es `pointer-events-none`** — un clic sobre un
  botón o link dentro de la sección la SELECCIONA en vez de navegar
  fuera del editor. Sin esto, tocar el CTA del hero te sacaba.
- **Rieles "+" ENTRE secciones**, no solo agregar al final. Insertar en
  un punto concreto es lo que hace que componer se sienta directo.
  `insertBlock(type, index)`, no `push`.
- **Todo pasa por `commit()`** — undo/redo y el estado "sin guardar"
  caen solos de ahí en vez de que cada mutación tenga que acordarse de
  registrarse.

Lo demás: selección con clic (y teclado), toolbar flotante sobre la
sección seleccionada (subir/bajar/duplicar/ocultar/borrar), switch de
dispositivo real (escritorio/tablet 768/móvil 390 — el canvas cambia de
ancho de verdad), picker visual de secciones con esquemas dibujados en
CSS en vez de una lista de etiquetas, y el inspector agrupado en
Composición / Contenido / Estilo para que el selector de variante no
quede sepultado bajo ocho campos de servicios.

- **`hidden` nuevo en `BlockBase`** (no en `BlockStyle`, porque no es
  estilo): `BlockRenderer` las filtra en la página pública, el editor
  las sigue mostrando en gris para poder restaurarlas. `normalizeBlock`
  lo rellena, cero migración.
- **El preview usa el `accent_color` de la plantilla**, no el índigo de
  la plataforma — antes un gimnasio se previsualizaba como un dashboard
  SaaS justo en el lugar donde estás juzgando cómo se ve.
- El riel de capas conserva el drag & drop de `@dnd-kit`; arrastrar una
  fila de 32px es viable, arrastrar una sección de alto completo sobre
  una página con scroll no.

**Bug real encontrado y corregido**: mismatch de hidratación de
`@dnd-kit` — sin un `id` explícito en `DndContext`, la librería deriva
uno autoincremental que difiere entre el render del servidor y el del
cliente, y React se quejaba en cada `aria-describedby`. Fix:
`<DndContext id="template-layers">`. Verificado en el DOM: ahora es el
mismo id en ambos renders.

**Nota de verificación**: el buffer de `read_console_messages` NO se
limpia al navegar en esta herramienta — mostró errores viejos
(`PADDING_CLASS`, ya resuelto reiniciando el dev server) durante toda la
sesión. Si un error de consola parece imposible, contrastarlo contra
`preview_logs` del servidor y contra el DOM antes de perseguirlo.

Verificado en vivo (ruta QA temporal contra plantillas reales, borrada
al terminar): 8 secciones seleccionables, cambiar la variante de
"Servicios" de Menú a Tarjetas recompone el canvas al instante (6 guías
de puntos → 0), deshacer lo revierte (→ 6), ocultar pinta el badge
"Oculta", y el switch a móvil lleva el canvas a 390px exactos.
`tsc --noEmit` limpio, 30/30 tests.

**Sigue pendiente**: edición de texto in-situ sobre el canvas
(contentEditable), subida real de imágenes (siguen siendo URLs pegadas
— el límite práctico más grande hoy), y presets de estilo por plantilla
(Minimal/Luxury/Bold) expuestos en la UI; `TemplateDesign` ya existe en
el schema pero solo se edita por seed, no desde el panel.

**Editor: drag & drop real + edición en el lienzo (2026-09-10, mismo
día, dos iteraciones seguidas)**: Bruno rechazó la primera versión del
canvas ("quiero un drag and drop real") y después pidió más
intuitividad. Lo que faltaba en cada caso:

**Iteración 1 — drag real en los dos sentidos.** El drag vivía solo en
el riel de capas (filas de 32px), que es reordenar una lista, no
construir una página. Ahora:
- **Reordenar sobre el lienzo**: cada sección tiene un asa que aparece
  al hover; las demás se corren para hacer lugar mientras arrastras.
- **Insertar desde la paleta**: los 15 tipos de sección son chips
  arrastrables; al empezar a arrastrar, los huecos entre secciones se
  convierten en zonas de drop visibles.
- Un solo `DndContext` cubre paleta y lienzo. Los ids de la paleta
  llevan prefijo `new:` y `onDragEnd` ramifica por ahí.
- **Las `DropSlot` están `disabled` salvo que haya un chip en vuelo** —
  activas siempre competían con las secciones sortables por la misma
  posición del cursor y el reordenamiento se atoraba entre dos targets.
- **Asa en vez de arrastrar toda la sección**: el cuerpo tiene que
  seguir siendo clickeable para seleccionar; si todo fuera arrastrable
  cada clic sería un posible drag de 5px.

**Iteración 2 — intuitividad.**
- **Edición de texto en el lienzo**: el renderer marca sus propios
  nodos con `data-edit="<propKey>"` (`Sections.tsx`), y el editor
  recorre el DOM de la sección SELECCIONADA y los vuelve
  `contenteditable`. No hay mapa paralelo de "qué texto vive dónde" —
  lo declara quien lo renderiza. **Se commitea en `blur`, nunca en
  keystroke**: escribir a estado en cada tecla re-renderiza el subárbol
  desde React con el caret adentro y lo manda a la posición 0 en cada
  letra (el bug clásico de contentEditable). Con blur-only, el DOM es
  dueño del texto mientras escribes y React el resto del tiempo.
  Los estilos viven en `.tpl-editable` (globals.css) y solo se aplican
  con la sección seleccionada, así que una página publicada nunca los
  lleva.
- **Atajos**: Ctrl/Cmd+Z / Shift+Z, Ctrl+S, Ctrl+D duplicar, Supr
  borrar, Esc deseleccionar. **Inertes mientras el caret está en un
  campo o en un nodo editable** — si no, Backspace borraba la sección
  entera que estabas escribiendo.
- **"Sin guardar" comparando contra un snapshot** (`savedSnapshot`), no
  un flag: un flag seguiría diciendo "sin guardar" después de deshacer
  hasta el estado guardado. Más `beforeunload` mientras haya cambios.
- **Sidebar del admin colapsable** (`AdminShell` dueño del estado,
  toggle en `TopBar`): el lienzo gana 272px medidos.

**Bug real corregido**: el logo no aparecía en el sidebar. `BichoLogo`
es `block` y deriva su ancho del `aspect-ratio`, pero como hijo de un
flex se estiraba al 100% y el recorte a píxel quedaba fuera de cuadro.
Fix: `items-start` en el contenedor. Verificado: 77×24, la proporción
exacta del mark.

**Incidente**: un `replace` de Python sobre una cadena vacía insertó
texto entre CADA carácter de `TemplateBuilder.tsx` (215k líneas de
basura). No se restauró desde git (habría perdido la sesión entera); se
reconstruyó cortando cabecera limpia + cola intacta y re-insertando el
shell. **Lección**: al calcular un slice con dos `index()`, verificar
que el segundo sea mayor que el primero antes de usarlo como patrón de
`replace` — un slice invertido da `''`, y `s.replace('', x)` inserta en
cada posición.

Verificado en vivo con eventos de puntero reales (no clics
sintéticos): reordenar arrastrando cambia el orden; arrastrar de la
paleta arma 9 zonas de drop e inserta en la posición apuntada (8→9
secciones); escribir en el lienzo commitea al soltar el foco y el
inspector lo refleja; Ctrl+Z revierte la edición de texto y Shift+Z la
rehace; Ctrl+D duplica; Esc deselecciona. `tsc` limpio, 30/30 tests.

**Sigue pendiente (el hueco más grande)**: subida real de imágenes.
Todas las plantillas tienen sus slots con el placeholder "Imagen de la
sección" hasta que alguien pegue una URL a mano. Necesita Supabase
Storage.

**Corrección de rumbo: es una página de CITAS, no un sitio sobre el
negocio (2026-09-10, mismo día)**: Bruno corrigió el enfoque. **Es la
segunda vez que hace esta misma corrección** — ya la había hecho el
2026-08-18 ("el Tenant no es un sitio web tipo Wix, es una experiencia
de reservas enfocada"). El proyecto volvió a derivar hacia
website-builder porque el propio brief de esta sesión pedía
explícitamente un clon de Wix/Squarespace/Framer con seis sitios de
marketing completos. Se construyó eso, y apuntaba al producto
equivocado.

**Criterio que ahora ordena la página pública** (dejarlo escrito para
que no vuelva a derivar): alguien llega a `/t/{slug}/reservar` para
RESERVAR. De ahí sale todo:
- La reserva va en **posición 2**, debajo de un encabezado de identidad
  compacto. Nunca debajo de un hero-póster, una galería o un ensayo.
- Cualquier otro bloque tiene que ganarse su lugar respondiendo una de
  dos preguntas: *"¿es aquí y puedo confiar?"* o *"¿cuánto cuesta y
  cuándo puedo ir?"*.
- Lo que solo responde *"qué bonito este negocio"* — mosaicos
  editoriales, prosa de filosofía, spreads de equipo, marketing de
  membresías, slabs de CTA que apuntan a la reserva que YA está en la
  página — es ruido entre el visitante y lo que vino a hacer. Estaba
  ahí en la pasada anterior y se cortó a propósito.

Cambios:
- **Variante de hero `header`** (nuevo default de `hero`): banda de
  identidad compacta — logo, nombre, una línea. 158px de alto medidos,
  contra un hero de 68vh. Las variantes póster (editorial/fullscreen/
  split/overlay) siguen existiendo para quien las quiera, ya no son el
  default.
- **Las 6 plantillas resembradas** con esa estructura: identidad →
  reserva → precios de referencia → lo práctico (horario, ubicación,
  FAQ corta). De 8-9 bloques a 6-8, y la reserva pasó de posición 6-8 a
  posición 2 en las seis.
- La diferenciación entre industrias ya NO es dirección de arte: es qué
  necesita una página de reservas de esa industria (¿el cliente elige
  persona? ¿pista? ¿clase? ¿la primera visita difiere del seguimiento?)
  más el lenguaje de diseño, que sigue costando cero.

Verificado en vivo contra `test-salon`: header 158px, la tarjeta de
reserva arranca en y=158 y el primer botón accionable en y=356 — muy
por encima del fold de 800px. La página pasó de 4176px a 2159px de
alto. En móvil (375px): sin overflow, botón accionable a y=359.
`tsc` limpio, 30/30 tests.

**Un tenant ahora tiene su PROPIA página; la plantilla es punto de
partida (2026-09-10, mismo día)**: Bruno pidió poder arrancar el alta
de un negocio desde una plantilla ya modificada. El pedido destapó un
problema de arquitectura serio que existía desde `db/008`:

**Un tenant no tenía página propia.** `/t/{slug}/reservar` buscaba en
`templates` por el `vertical` del tenant y renderizaba esa fila
compartida. Consecuencias, las dos malas:
1. Editar una plantilla **reescribía en silencio la página EN VIVO** de
   todos los negocios de esa vertical. Corriges una errata para un
   salón y republicas los otros cuarenta.
2. Un negocio nunca podía diferir de su plantilla — sus propios
   servicios, su propia redacción, su propio orden de secciones eran
   imposibles porque no había dónde guardarlos.

- **`db/015_tenant_page.sql`** (⚠️ pendiente de aplicar): agrega
  `tenants.page_blocks` y `tenants.page_design` (nullable), más un
  backfill que le da a cada tenant existente una copia de lo que ya
  está renderizando — comportamiento idéntico hoy, pero ningún tenant
  queda expuesto a una edición futura de su plantilla.
- **`createTenant`** copia `blocks` + `design` de la plantilla al
  tenant al crearlo. Si `db/015` no está aplicada, **reintenta el
  insert sin esas columnas** en vez de fallar (mismo patrón de
  fallback que ya usa `app/api/reservar/route.ts` para las columnas
  opcionales de booking), así el alta funciona antes y después de la
  migración.
- **`reservar/page.tsx`** prefiere `page_blocks` del tenant y cae a la
  plantilla compartida solo si es null (tenants pre-015, o verticales
  sin plantilla). Consulta separada, mismo motivo defensivo de siempre.
- **Flujo pedido**: botón "Crear negocio con esta plantilla" en el
  editor de plantillas → `/tenants/new?vertical=X` con la vertical ya
  seleccionada. `NewTenantForm` solo honra el `?vertical=` si esa
  plantilla existe de verdad — un valor viejo o escrito a mano cae al
  default en vez de crear un tenant apuntando a nada.

Verificado en vivo **con la migración todavía sin aplicar** (que es el
caso frágil): `/t/test-salon/reservar` sigue renderizando por el
camino de respaldo sin cambios; `?vertical=gimnasio` preselecciona
correctamente; y se creó un tenant real de prueba por el formulario
(el reintento sin columnas funcionó) y se borró al terminar. `tsc`
limpio, 30/30 tests.

**`db/015` aplicada + editor de página por negocio (2026-09-10, mismo
día)**: Bruno corrió la migración. Backfill verificado: `barber` y
`test-salon` (peluquería) recibieron cada uno su copia de 6 bloques;
`spa` (vertical `general`, sin plantilla) quedó en `null` y sigue por
el camino de respaldo, que es lo correcto.

Con la página ya siendo propiedad del tenant, se construyó lo que eso
habilita:

- **`updateTenantPage(tenantId, blocks)`** (`[tenantId]/actions.ts`) —
  escribe en `tenants.page_blocks`, **nunca** en `templates.blocks`.
  Revisa `{ error }` y lanza (el bug de guardado silencioso que este
  proyecto ya sufrió con `BrandEditor`). Revalida el detalle del admin
  Y la página pública del tenant — esta última con la ruta de archivo
  real `/t/{slug}/reservar`, no la URL pública, según la nota de
  `revalidatePath` ya documentada arriba.
- **Sección "Página de reservas de este negocio"** en
  `/admin/tenants/[tenantId]`: el MISMO `TemplateBuilder` (canvas, drag
  & drop, edición en línea) que usa la galería de plantillas, pero
  guardando en el tenant. Un solo editor, dos destinos.
- **Orden de arranque del editor**: la copia propia del negocio → la
  plantilla de su vertical → una página mínima (`hero` + `booking`).
  El último caso es real (un tenant en una vertical sin plantilla, como
  `general`) y necesita exactamente un bloque `booking`, que es lo que
  hace que la página funcione.
- La sección dice explícitamente si el negocio ya tiene copia propia o
  sigue mostrando la plantilla compartida — el estado importa y antes
  era invisible.

**Verificación del aislamiento** (lo que realmente había que probar):
se editó el título del hero de `test-salon` a "Agenda en Salón de
Prueba" desde el canvas y se guardó. Después:
- tenant `test-salon` → "Agenda en Salón de Prueba"
- tenant `barber` (misma vertical) → "Reserva tu cita", **sin tocar**
- plantilla `peluqueria` → "Reserva tu cita", **sin tocar**
- `/t/test-salon/reservar` sirve el título nuevo, con la reserva
  todavía a 356px del tope y sin overflow.

Nota: `test-salon` quedó con ese título de prueba a propósito, como
evidencia visible de que la personalización por negocio funciona.
`tsc` limpio, 30/30 tests.

**Pasada estética de la página del tenant — neutra (2026-09-10, mismo
día)**: Bruno pidió que la página pública se viera muy bien pero
neutra. Importante: "neutro" NO podía significar imponer una paleta
fija — eso revertiría su pivote explícito de "0 colores fijos, los
colores del panel manejan todo". Significa que el color de marca deja
de bañar la página y pasa a ser un acento preciso.

- **Se eliminaron TODAS las cuñas decorativas con `clip-path`** (dos
  en el fondo ambiental de `reservar/page.tsx` + una en el header de
  respaldo). Cortaban una diagonal dura que se leía como artefacto de
  render, no como diseño, y repartían color de marca por toda la
  página. `grep clipPath` en esa ruta y en `BlockRenderer` ahora da 0.
- **`tenantGlassBackground` de 0.05/0.07/0.09 → 0.012/0.02/0.028.** Una
  superficie con 9% de color de marca EN TODAS PARTES se lee como una
  página coloreada, no como una diseñada. Queda una traza mínima, la
  suficiente para que una tarjeta blanca no se sienta desconectada de
  la paleta del negocio.
- **Una sola medida para toda la página**: el `COLUMN` del seed
  (`maxWidth: 'sm'` → `max-w-2xl`) para todos los bloques de apoyo, y
  la tarjeta de reserva subió de `max-w-lg` a `max-w-2xl`. Antes los
  bloques iban a 1152px junto a una tarjeta de 512px y la página se
  leía como secciones inconexas. Los tenants ya existentes se
  actualizaron con un script que **solo toca `style.maxWidth`** — los
  `props` que un negocio ya editó quedaron intactos, porque una
  pasada cosmética nunca debe reescribir en silencio el texto de
  alguien.
- **Una sola elevación**: la tarjeta de reserva es el único elemento
  con sombra real (dos capas, suave); todo lo demás va plano sobre el
  fondo con hairlines. En una página con un solo objetivo, una sola
  superficie debe verse elevada.
- El eyebrow del header pasó de color de marca a `text-muted`: el
  acento tiene que significar "esto se presiona".

**Bug propio**: metí un `{/* comentario */}` como primer hijo dentro de
un `{cond && (...)}`, lo que da dos hijos en un slot que admite una
expresión — build error `Expected '</', got 'ident'`. Lo detecté
porque **corrí `grep` en vez de `tsc` después de ese edit**. Regla:
`tsc --noEmit` después de CADA edición de JSX, sin excepción.

Verificado: `test-salon` (con plantilla) y `spa` (camino de respaldo,
con logo real) — sin diagonales, sin overflow a 375px ni en desktop,
reserva accionable a 363px del tope en móvil. `tsc` limpio, 30/30
tests.

**Segunda pasada de diseño del tenant — "se ve genérico" (2026-09-10,
mismo día)**: Bruno rechazó la pasada neutra anterior. Tenía razón: lo
que entregué era *limpio*, y limpio se deslizó a *default* — tarjeta
blanca con sombra suave, indicador de pasos con círculos numerados,
divisores hairline. El kit de Tailwind/SaaS que la propia skill
`frontend-design` marca como el tell principal.

**La causa raíz que no había atacado**: el lenguaje de diseño de cada
plantilla **se detenía justo antes del formulario de reserva**. La
parte que todo el mundo mira era Inter idéntico en las seis
plantillas, sin importar su `typeScale`, su `headingFont` ni nada. Por
eso seis plantillas distintas se sentían la misma página.

- **Los prompts del flujo son ahora encabezados en la tipografía de la
  plantilla** (`--tpl-heading-font` / `--tpl-heading-tracking`), y
  dejaron de ser `<p className="text-sm text-muted">`. Verificado: en
  `test-salon` (peluquería) "¿Qué te hacemos?" resuelve a **Georgia**,
  no a Inter.
- **Se eliminó el indicador ①—②—③—④—⑤.** Era el elemento más genérico
  de la página y además informaba lo que al cliente no le importa
  ("vas en el paso 2 de 5") mientras ocultaba lo que sí ("qué llevo
  elegido"). Lo reemplaza un **rastro de selección**: `Corte · 14 de
  septiembre · 10:00`, donde cada valor es clickeable para volver a
  ese paso. Menos cromo, más información.
- **Consecuencia del rastro: se borraron los tres botones "Cambiar
  servicio / Cambiar fecha / Cambiar hora"** y la tarjeta que repetía
  la selección en el paso de datos. Dos caminos de vuelta en la misma
  vista es desorden, no generosidad.
- **Servicios: de N tarjetas con N botones a filas donde la fila ES el
  botón.** El kit de "una card por ítem con su propio CTA" obligaba al
  cliente a apuntarle a un botón chico cuando la fila entera ya era el
  objetivo. Ahora: 80px de alto de objetivo táctil, precio alineado en
  columna con cifras tabulares, y la flecha de affordance aparece solo
  en hover/focus.
- **Horarios: de pills con `flex-wrap` a una rejilla real** (3 col
  móvil / 4 desktop) en formato 24h. Un set de opciones equivalentes
  se escanea en columnas; el wrapping irregular hace trabajar al ojo
  sin motivo y ningún scheduler real lo hace.

Verificado recorriendo el flujo completo en vivo: servicio → día →
hora → datos, con el rastro construyéndose (`Corte · 14 de septiembre
· 10:00`) y navegando de vuelta al hacer clic en un valor. En móvil
(375px): sin overflow, fila de servicio de 80px, 18 horarios en
rejilla con objetivo táctil de 92×42px. `tsc` limpio, 30/30 tests.

**Dashboard del negocio + páginas públicas: pasada de pulido y
corrección de zona horaria (2026-09-15)**: Bruno pidió "más dedicación
al frontend de los tenants y dashboards de los clientes, que sea
perfecto". Dos mitades: rediseño del dashboard, y una auditoría de las
páginas que ve el cliente final que encontró bugs reales, no solo
cosmética.

**Bug grave de producción — la hora de las citas salía 6 horas
corrida.** Todo código de servidor (Server Components, API routes,
Server Actions) formatea fechas en la zona del PROCESO: en la máquina
de Bruno es America/Mexico_City (todo se veía bien), en Vercel es UTC.
Afectaba a:
- el dashboard (`toLocaleString` en Resumen/Agenda),
- **"Ver mi cita"** (`date-fns format()` en un Server Component),
- **el correo de confirmación y el de reagendado**
  (`toLocaleString` sin `timeZone`): un cliente con cita a las 17:30
  habría leído "23:30".
Y del lado del cliente, `BookingFlow` y `RescheduleForm` agrupaban y
mostraban horarios con el reloj del NAVEGADOR, así que un visitante con
el teléfono en otra zona veía horas que no existen en el negocio.
- **`lib/dates/tenantTime.ts`** (nuevo, con tests que corren bajo
  `TZ=UTC`): `formatTime`, `dayKey`, `addDaysKey`, `dayLabel`
  ("Hoy"/"Mañana"/"miércoles 23 de septiembre"), `longDate` (nunca
  relativo — para correos y "Ver mi cita"), `appointmentWhen`
  ("Miércoles 23 de septiembre, 17:30"), `groupByDay`. Todo contra
  `tenants.timezone`.
- **Regla**: ninguna fecha visible se formatea sin `tenants.timezone`.
  Ni `toLocaleString`, ni `date-fns format()` sobre un instante. La
  única excepción válida es `format(selectedDate, 'yyyy-MM-dd')` sobre
  la fecha que el visitante tocó en el calendario (es una fecha de
  calendario, no un instante).
- `get_available_slots` interpreta `p_from/p_to` como fechas en la
  zona del tenant (db/004), así que "hoy" también se calcula con
  `dayKey(new Date(), timezone)`.
- **Pendiente fuera de alcance**: `toLocaleDateString` en el panel
  admin (`app/admin/(panel)/tenants/page.tsx` y `[tenantId]/page.tsx`)
  — son fechas de alta, no citas, pero es la misma clase de bug.

**Dashboard del negocio rediseñado**: componentes compartidos en
`components/tenant-dash/` (`PageHeader`, `SectionHeading`, `AgendaList`
agrupada por día local con columna de hora, `ItemList`/`ItemRow`/
`ActiveSwitch`/`AddBar`). Resumen muestra checklist de configuración
solo si falta algo, "Hoy" y "Próximos días". Horario ahora es una
semana por recurso empezando en lunes, con "Cerrado" en los días sin
rango. Barra superior móvil real en vez de hamburguesa flotante.
Neutros hue-neutral en claro (`html:not(.dark) .tenant-dash`).

**Página pública y "Ver mi cita"**:
- **"Ver mi cita" rediseñada** con la misma piel que la página de
  reservas (header de identidad, tipografía de la plantilla, una sola
  tarjeta elevada) en vez de la tarjeta de vidrio centrada con cuña
  diagonal. Estados: Confirmada / Cancelada / Ya pasó / no encontrada,
  cada uno con su siguiente paso. `robots: noindex` (la URL da acceso a
  la cita de alguien).
- **Citas pasadas ya no se pueden cambiar ni cancelar** — ni en la UI
  ni en las Server Actions (`.gt('starts_at', now)`).
- **Reagendar reportaba éxito sin cambiar nada**: un `update` cuyos
  filtros no matchean ninguna fila no es error para PostgREST, así que
  una cita cancelada "se reagendaba" y mandaba correo de "tu cita se
  movió". Ahora `.select('id')` y se revisa que haya fila.
- El modal de cancelar decía "Cancelar" junto a "Cancelar cita" — la
  opción segura y la destructiva se leían igual. `ConfirmForm` ganó
  `dismissLabel` ("No, conservarla").
- **Pantalla de confirmación de `BookingFlow`**: ya no es una Card
  dentro de la tarjeta; resume servicio/cuándo/quién y ofrece "Ver o
  cambiar mi cita" (antes, quien no daba correo no tenía ninguna forma
  de cambiar o cancelar) y "Agregar a Google Calendar" como `<a>` real
  (antes `<a><Button/></a>`, HTML inválido). Labels ligados a inputs
  (`htmlFor`) + `autoComplete` para que el teléfono autocomplete.
- **Tenants sin plantilla** (`general`) ya no tienen un layout aparte y
  más viejo: se les arma `[hero header, booking]` y pasan por el mismo
  `BlockRenderer`.
- `<title>` por negocio ("Salón · Reserva tu cita"); antes todas las
  páginas públicas decían "Reservas SaaS".
- La vista previa del bloque de reserva en el editor mostraba el riel
  de pasos numerado y tarjetas con "Seleccionar" que el flujo real ya
  no tiene — ahora refleja el primer paso real.

**Contraste — colores de marca usados sin revisar**:
- **`.dark .tenant-shell` nunca aplicaba en la página pública**: ahí
  `dark` y `tenant-shell` van en el MISMO `<main>`, y el selector era
  de descendiente. El modo oscuro público pintaba el navy de la
  plataforma, no el oscuro del negocio. Selector ahora es
  `.dark .tenant-shell, .dark.tenant-shell`.
- `readableFgRgb` usaba un umbral de luminancia 0.5 que ponía texto
  blanco sobre tonos medios (magenta: 3.5:1). Ahora elige por ratio de
  contraste real (`contrastRatio`, cruce ≈ 0.2).
- `tenantCtaStyle` usaba `primaryColor` como texto del botón siempre;
  con dos colores oscuros el texto no se leía. Ahora solo si pasa 4.5:1
  contra ambos extremos del degradado.
- `legibleBrandText(primary, accent, ground)`: precios, eyebrows,
  números e íconos de FAQ usaban `primaryColor` como texto — invisible
  con un primario crema en claro o café en oscuro. Día seleccionado del
  calendario tenía texto blanco fijo (invisible sobre lima/dorado).

Verificado en vivo: "Ver mi cita" de una cita real de `spa` a las
23:30 UTC muestra 17:30; reagendar y cancelar de punta a punta con una
cita de prueba en `test-salon` (DB confirmada: 16:00 UTC = 10:00 local),
confirmación del flujo público, modo oscuro con `theme_mode` activado y
revertido. Datos de prueba borrados. `tsc` limpio, 48 tests de `lib/`
en verde (también con `TZ=UTC`).

**Encontrado, no arreglado**: `npm run lint` está roto desde el upgrade
a Next 16 (`next lint` ya no existe y ESLint 10 no lee
`.eslintrc.json`), así que el paso de lint del CI no puede pasar.

**Pasada estética de una hora — teléfono primero (2026-09-15)**: Bruno
dio una hora con libertad total para lo que "de verdad se note", y a
media pasada recordó que **la página de reserva se hace para
teléfono**. Criterio aplicado: arreglar lo que un cliente o un dueño
ve primero y usa más.

**Página de reserva en teléfono** (verificado a 320, 375 y 800px):
- **La tarjeta de reserva es una hoja de ancho completo en teléfono**
  (desde `sm` vuelve a flotar). Antes: 20px de margen de página + 20px
  de padding de tarjeta por lado → el calendario quedaba en ~295px a
  375px y **se salía de su marco a 320px**. Ahora todo arranca en el
  mismo borde de 20px que el header (`MAX_WIDTH_CLASS` pasó a
  `px-5 sm:px-6` por la misma razón; los headings medían 20/24/49px).
- **Día y hora lado a lado desde `sm`** (calendario + panel de horas);
  en teléfono las horas quedan debajo y hacen scroll a la vista. Antes
  eran dos pantallas: elegir día hacía desaparecer el calendario.
  Horas agrupadas en Mañana / Tarde / Noche (hora local del negocio).
- **Calendario rediseñado** (`.booking-calendar` en `globals.css`,
  scoped): celdas que se reparten el ancho (discos de hasta 44px que se
  encogen en pantallas chicas), día reservable = disco suave del acento
  (antes solo negrita + un punto que desalineaba el número), hoy = punto
  pequeño (antes anillo de acento, lo más ruidoso de la cuadrícula),
  flechas en tinta (en acento claro desaparecían). `required` en
  `DayPicker`: volver a tocar el día elegido ya no lo deselecciona.
- **Inputs a 16px en teléfono** (`Input`/`Select`/textarea, `text-base
  sm:text-sm`): iOS Safari hace zoom a cualquier campo con texto
  menor a 16px al enfocarlo. Botones de hora 48px de alto en teléfono.
- Al elegir hora, el flujo vuelve a la vista si quedó arriba del
  viewport (el formulario aparecía fuera de pantalla).
- **Filas de servicio**: chevron siempre visible (antes solo en hover,
  que no existe en touch, y su espacio vacío desalineaba precios),
  precio "$300 MXN" en una línea.
- **Horario y Ubicación** (`HoursSection`/`LocationSection` en
  `Sections.tsx`): de tarjetas centradas con medallón y sombra (el
  último resto del lenguaje glass) a filas planas alineadas a la
  izquierda. "Cómo llegar" arma un link de Google Maps con la dirección
  si no hay `mapUrl`.
- **Espaciado fluido** (`RHYTHM_SPACE` con `clamp()`): el mismo hueco
  de 112px entre secciones en teléfono que en escritorio.
- `generateViewport` → `themeColor` del fondo del negocio (claro u
  oscuro): la barra del navegador del teléfono deja de ser gris.
- Eyebrow del header sigue la caja de la plantilla
  (`--tpl-heading-transform` + nuevo `--tpl-label-tracking`) en vez de
  mayúsculas espaciadas siempre.

**La raíz del negocio (`{slug}.dominio/`) mostraba "Pendiente:
dashboard y página de reserva"**. Ahora `app/t/[slug]/page.tsx`
re-exporta la página de reserva (con su metadata/viewport).

**Login y "elige contraseña" del dueño** (`components/tenant-dash/
AuthShell.tsx`): antes índigo de la plataforma, blobs, vidrio y un
"Iniciar sesión" sin decir de qué negocio. Ahora logo o monograma
(`BusinessMark`) + nombre, colores del negocio en el botón, ojo para
mostrar contraseña, `autoComplete` correcto, errores de Supabase
traducidos (`authErrorMessage` en `app/t/[slug]/actions.ts`; antes se
mostraba "Invalid login credentials"), y el `?error=` que manda el
layout del dashboard por fin se muestra. Voseo corregido.

**Dashboard del dueño**:
- **Sidebar**: de panel de vidrio flotante (radio 28px, sombra índigo,
  degradado de marca, barra con glow) a superficie tranquila pegada al
  borde. La marca sigue ahí: monograma/logo + nombre arriba y barra en
  `bg-primary` en la sección activa. Etiquetas iguales a los títulos de
  cada página (decía "Recursos"/"Calendario" para "Quién
  atiende"/"Agenda") y ordenadas por uso. Rol en español, "Ver mi
  página de reservas", Escape cierra el drawer y bloquea el scroll
  detrás. `SignOutButton` usaba `ghost-inverse` (texto blanco).
- **Agenda**: línea roja "Ahora" entre lo que ya pasó y lo que sigue
  (solo si hay citas a ambos lados), citas pasadas atenuadas, estado
  como ícono en teléfono (las pills truncaban "Corte y pein…"), y el
  Resumen ya no repite "Hoy · 3 citas" bajo "Hoy 3 citas".
- **"Copiar enlace de reservas"** (`CopyLinkButton`) en el Resumen: lo
  que un dueño hace con su página es pegarla en WhatsApp.

`not-found` del negocio: `<Link><Button>` anidado reemplazado.

Verificado con ruta QA temporal del dashboard (datos falsos, borrada)
en claro y oscuro, y la reserva real de `test-salon` a 320/375/800px
(sin overflow, bordes alineados, tap targets medidos). `tsc` limpio,
59 tests en verde con `TZ=UTC`. **Nota de herramienta**: las capturas
del panel a anchos de escritorio salen recortadas o viejas; a 375px sí
son confiables — para escritorio, medir con el DOM.

**Modo oscuro del dashboard: de color sólido a oscuro con tinte + luz
(2026-09-15)**: Bruno: "no me gusta el color sólido del modo oscuro del
dashboard". El oscuro pintaba toda la página con el color más oscuro
de la marca tal cual (olivo plano, café plano): un color saturado a
escala de pantalla completa pesa y compite con todo lo de encima.
Esto reemplaza la dirección de "el más oscuro de la selección" de
agosto; la regla "nunca negro, solo colores del negocio" se mantiene.

- **`tenantDarkPalette()`** (`lib/branding/colors.ts`, reemplaza
  `darkestOf`/`floorDarkness`): la marca aporta el TONO, no el relleno.
  Fondo = casi neutro con el matiz del **primario** a saturación ≤14%
  (L 8.5%); tarjetas (`surface` = `glass`) L 13%; `elevated` L 16.5%.
  Verde → carbón verdoso, café → carbón cálido. Si el primario es gris,
  toma el color más saturado de los otros.
- **`--tenant-dark-glow`**: el **acento** (el color con el que la marca
  resalta) vuelve como luz, no como pintura: dos `radial-gradient`
  suaves en `.dark .tenant-shell` (arriba-izquierda 17%, esquina opuesta
  7%), `background-attachment: fixed`. El sidebar en `lg` pasó a
  `lg:bg-transparent` para que la luz corra detrás; la barra activa usa
  el glow en oscuro (el primario café desaparecía sobre el fondo).
- Ink y muted neutros bajo `.dark .tenant-shell` (los de la plataforma
  tiraban a lavanda). Como el mismo par de variables alimenta la página
  pública en `theme_mode = 'dark'` y "Ver mi cita", también cambiaron.

Verificado con ruta QA temporal (borrada) con los colores reales de
`test-salon` (fondo `rgb(25,24,19)`, luz dorada) y `spa` (fondo
`rgb(19,25,19)`, luz dorada). Tests de dark reescritos (no es el color
de marca, conserva temperatura, nunca negro, jerarquía por luminosidad,
luz del acento). `tsc` limpio, suite completa en verde con `TZ=UTC`.

**Red de vendedores: panel propio + visibilidad en el admin
(2026-09-17)**: Bruno pidió que los vendedores autorizados tengan su
propio dashboard para crear páginas/negocios, y que toda su información
se vea desde el panel interno. Tres decisiones suyas antes de construir:
alcance **alta completa** (el vendedor crea el negocio, edita su página
y crea el acceso del dueño), panel en **vendedores.{dominio}**, y
comisión de **monto fijo en pesos por negocio activo**.

**Hueco de seguridad encontrado al empezar (esto existía desde antes)**:
NINGUNA Server Action del panel admin verificaba quién la llamaba —
corrían con `service_role` sin más. Una Server Action es un endpoint
POST real: cualquier usuario con sesión (el dueño de un negocio, o
alguien que se registró) podía invocar `setTenantStatus(idAjeno,
'cancelled')` o `createTenantOwner(idAjeno, …)` si conocía el id de la
acción. Agregar vendedores (que legítimamente administran ALGUNOS
tenants) lo volvió imposible de dejar pasar.
- **`lib/auth/access.ts`** (nuevo): `getActor()` resuelve la sesión a
  `admin` | `reseller` | null vía `service_role` (ambas tablas son
  service_role-only por diseño). `requireAdmin()`, `requireReseller()`
  y `requireTenantManager(tenantId)` (el equipo interno, o el vendedor
  DUEÑO de ese negocio — nunca uno metiéndose en el de otro).
- Aplicado: `setTenantStatus`/`setTenantPlan` y las 3 acciones de
  plantillas → solo admin; `updateTenantBranding`/`updateTenantPage`/
  `createTenantOwner` → admin o su vendedor; `createTenant` → cualquiera
  de los dos, y **un vendedor siempre queda acreditado con lo que crea**
  (no puede atribuirlo a otro).

**`db/016_resellers.sql`** (⚠️ pendiente de correr): tabla `resellers`
(`user_id` nullable para registrar a alguien antes de que tenga cuenta,
`commission_mxn` entero en pesos, `active`, `zone`, `notes`) con RLS sin
policies (service_role only, mismo patrón que `platform_admins`), y
`tenants.reseller_id` con `on delete set null` — borrar un vendedor
jamás debe arrastrar negocios reales.

**Panel del vendedor** (`vendedores.{dominio}` → `/vendedor/*` vía
`proxy.ts`): login propio con la paleta bicho, Resumen (negocios
traídos, activos, comisión mensual estimada + lista con estado y enlace
a su página), "Dar de alta un negocio" y el detalle de cada negocio con
**las mismas tres herramientas del panel interno**: editor de página
(`TemplateBuilder`), marca (`BrandEditor`) y acceso del dueño
(`OwnerCreator`). Lo que NO ve: estado/plan, citas, clientes y pagos —
eso es la relación de bicho con el negocio, no la venta.

**Panel interno**: sección **Vendedores** nueva (lista con negocios,
activos y comisión por vendedor + totales de la red; detalle con sus
negocios, edición de datos/comisión, alta/baja con confirmación, y
creación de su acceso), columna **Vendedor** en la lista de negocios, y
selector de vendedor en el detalle de cada negocio (para acreditar o
mover uno que llegó directo).

**`components/tenant-setup/NewBusinessForm.tsx`**: el formulario de alta
es ahora uno solo para los dos paneles (antes `NewTenantForm` vivía en
admin). El interno además puede elegir vendedor; el del vendedor no
muestra ese campo a propósito.

**Bug real encontrado en el camino (afectaba a TODOS los subdominios)**:
`proxy.ts` reescribía también los archivos de `public/`, así que
`vendedores.dominio/logo.png` iba a `/vendedor/logo.png` → 404 y el
wordmark de bicho salía como una placa vacía (el login del admin tenía
el mismo problema). Confirmado en el navegador (`naturalWidth === 0`).
Fix: no reescribir rutas con extensión de archivo.

**Tolerancia a la migración sin correr** (mismo patrón defensivo de
`theme_mode`/`page_blocks`): `/admin/vendedores` muestra "falta correr
db/016" en vez de tronar, la columna Vendedor de la lista de negocios
solo aparece si la consulta de atribución funciona (un `reseller_id`
inexistente da 42703, no 42P01 — por eso la condición es "sin error", no
"tabla ausente"), y `createTenant` reintenta el insert sin
`reseller_id`. Verificado en vivo con la migración TODAVÍA sin aplicar:
la lista de negocios sigue igual y sin columna, y `/admin/vendedores`
explica qué falta.

Verificado también: `vendedores.localhost:3000` sirve el login (rewrite
del subdominio), entrar a `/` sin sesión rebota al login, y el logo
vuelve a cargar tras el fix del proxy. `tsc` limpio, 66 tests en verde
(6 nuevos de comisiones en `lib/resellers.test.ts`).

**Pendiente de vos**:
1. Correr `db/016_resellers.sql` en el SQL Editor de Supabase.
2. Registrar al primer vendedor en `/admin/vendedores` y crearle su
   acceso (la contraseña la escribes tú, no yo).
3. Probar el flujo completo entrando como ese vendedor — yo no puedo,
   no tengo credenciales.

**Corrección del modelo de negocio de la red de vendedores (2026-09-17,
mismo día)**: lo construido en la mañana asumía que bicho le PAGA una
comisión al vendedor. Bruno aclaró que es al revés y es un modelo
mayorista:
- El vendedor le pone **su propio precio a cada negocio** y le cobra
  directo, por fuera de la plataforma (efectivo, transferencia, lo que
  sea). bicho nunca le cobra al negocio.
- bicho le cobra **al vendedor** un precio fijo por negocio ACTIVO, un
  día del mes. La ganancia del vendedor es la diferencia.

Cambios:
- **`db/016_resellers.sql` reescrita** (si todavía no la corriste, usa
  solo esta): `commission_mxn` → `wholesale_price_mxn`, más
  `default_retail_price_mxn` (solo para prellenar el formulario del
  vendedor) y `billing_day` (1-28, para que el día exista todos los
  meses). `tenants` gana `retail_price_mxn` — el precio que ESE vendedor
  le puso a ESE negocio, null si el negocio llegó directo.
- **`db/017_reseller_pricing.sql`** (nueva): la misma migración pero
  idempotente, para el caso de que ya hubieras corrido la versión vieja
  de 016. Renombra la columna solo si existe y agrega el resto con
  `if not exists`.
- **`lib/resellers.ts`**: `monthlyCommission` → `monthlyDue` (lo que el
  vendedor te paga), `monthlyRetail` (lo que él cobra) y `monthlyMargin`
  (lo que le queda, que puede ser NEGATIVO y se muestra en rojo si
  vendió por debajo del mayoreo — esconderlo sería esconder justo el
  número que más le importa). Solo cuentan los negocios en estado
  `active`: uno en prueba no te cuesta ni te paga.
- **Panel del vendedor**: el Resumen ahora dice "Cobras a tus negocios /
  Le pagas a bicho / Te queda", marca cuántos negocios activos no tienen
  precio puesto, y cada negocio muestra su precio. En el detalle hay una
  tarjeta para fijar el precio (`RetailPriceCard`) que enseña el margen
  antes de guardar. El alta pide el precio de entrada, prellenado con su
  precio sugerido.
- **Panel interno**: la lista de vendedores pasó de "Comisiones al mes"
  (un costo) a "Te pagan al mes" (un ingreso), con columnas "Te paga /
  mes" y "Él cobra / mes"; el detalle muestra el día de corte y el
  margen del vendedor; el formulario pide precio mayorista, día de cobro
  y precio de venta sugerido. En el detalle de un negocio se ve cuánto
  le cobra su vendedor.
- `setTenantRetailPrice` (nueva Server Action) pasa por
  `requireTenantManager`, así que un vendedor solo puede ponerle precio
  a sus propios negocios.

`tsc` limpio, 70 tests en verde (10 de precios/márgenes en
`lib/resellers.test.ts`, incluido el caso de margen negativo).

**Decisiones de Bruno para la parte de pagos** (todavía sin construir):
1. El negocio le paga al vendedor **por fuera**; la plataforma no cobra
   ni reparte. Nada de Stripe Connect ni marketplace por ahora.
2. bicho le cobra al vendedor con **suscripción automática por
   cantidad**: tarjeta guardada, y el día de corte se cobra
   `negocios activos × precio mayorista`. Stripe lo hace nativo con
   cantidad variable; Mercado Pago queda como alternativa local
   (tarjeta, OXXO, SPEI).

**Landing de bicho: blanco + morado, y un hero nuevo (2026-09-17, mismo
día)**: Bruno pidió "unos tonos moraditos, deja el blanco como color
principal", y a media pasada mandó una segunda referencia (un sitio
editorial de cripto: campo de color saturado, titular gigantesco y
centrado, tarjetas y flechas verdes rompiendo su borde, sello circular)
diciendo "me encantó ese estilo, tienes libertad creativa". Después:
"ese calendario morado de la primera parte no se ve bien".

Lo importante de esta pasada es que **invirtió la página, no la
recoloreó**. La paleta anterior era teal-dominante: 7 de 11 secciones
eran una plancha oscura. Cambiar teal por morado habría dado una página
morada — exactamente lo contrario de lo que pidió. Ahora el blanco es el
suelo, el morado es el color estructural (CTAs, chips, el hero, dos
bloques oscuros de puntuación) y el lime se queda tal cual: es el color
literal del logo, se gasta como chispa y nunca como campo.

- **`components/marketing/tokens.ts`** documenta la paleta nueva
  (`violet #5B34E8`, `violetInk #1B1040`, `mist #F5F3FC`, `ink #140F2E`,
  el lime intacto). Sigue sin estar conectada a `tailwind.config.ts` por
  la misma razón de siempre: esos tokens son de los dashboards.
- **Regla de contraste que ordenó medio cambio**: el lime NUNCA es texto
  sobre blanco (~1.4:1). Donde era texto — la palabra acentuada del
  titular, el nombre del plan, los checks de precios — pasó a morado
  (6.7:1). Sobre blanco el lime solo existe como relleno con texto
  oscuro encima. Y el morado necesita DOS grises claros distintos para
  texto secundario: `#B9B1E6` sobre `violetInk` (8.8:1) pero solo 3.5:1
  sobre el morado vivo, que por eso usa `#E3DEFA`.
- **El logo era invisible**: `public/logo.png` son píxeles BLANCOS sobre
  transparente (verificado muestreando el archivo, no supuesto), así que
  sobre blanco no se veía nada. `BichoLogo` ganó `tone="ink"`, que lo
  invierte con un filtro en vez de meter un segundo archivo.
- **Hero reconstruido** (`Hero.tsx` + `HeroCards.tsx` + `Flourishes.tsx`):
  campo morado con rejilla tenue, titular en `clamp(2.6rem, 11.5vw,
  8.5rem)` uppercase, dos tarjetas de producto rotadas rompiendo el
  borde del texto, dos flechas lime que anotan esas tarjetas, y un sello
  circular giratorio ("PRUEBA 15 DÍAS · SIN TARJETA"). La sección de
  abajo lo tapa con una hoja blanca de esquinas redondeadas y margen
  negativo — eso es lo que hace que el blanco lea como la página y el
  morado como su apertura.
- **Se borró `HeroVisual.tsx`**, el mock de producto que llenaba la
  mitad derecha. Era el "calendario morado" que Bruno señaló: a escala
  de hero no se podía leer, y obligaba al layout estándar de "copy a la
  izquierda, screenshot a la derecha". El producto sigue ahí, reducido a
  dos tarjetas de una línea cada una.
- **Regla de composición aprendida en el camino**: una tarjeta puede
  romper el borde del titular, nunca tapar una letra. La primera versión
  puso una encima de la A y la línea decía "GENDAR POR". Como el texto
  va centrado, el espacio libre está en los márgenes exteriores junto a
  las líneas CORTAS (la 1 arriba, la 3 abajo) — ahí van.
- Títulos de sección a uppercase pesado con `clamp()`, igual que el
  hero; la primera tarjeta de Funciones pasó de mist a blanca (estaba a
  6 puntos de su propio fondo y no leía como tarjeta); `MarketingNav`
  ganó `tone` porque ahora vive sobre morado (home) y sobre blanco
  (legales), con el par de colores resuelto arriba en vez de
  condicionales sueltos por el JSX.
- **NO se pusieron flechas entre las tres tarjetas de Funciones**, que
  es lo que hace la referencia: ahí las tarjetas son una secuencia
  ("subscribe → choose → stake") y las de bicho son tres cosas
  paralelas. Una flecha habría afirmado un orden que no existe.
- Verificado en vivo a 1280px y a 375px: sin overflow horizontal
  (`scrollWidth === clientWidth`), titular legible completo, menú móvil
  blanco sobre el morado, y las tres bandas de color revisadas sección
  por sección. `tsc` limpio, 97 tests en verde.

**Ajustes del hero pedidos sobre la marcha (mismo día)**: cuatro
correcciones de Bruno viendo la página ya montada, todas sobre el hero.

- **"Sube los botones de CTA y quita el texto que está hasta abajo"**: el
  párrafo de apoyo bajo el titular se eliminó y los CTAs subieron. En un
  monitor ancho ese párrafo empujaba los botones fuera de la primera
  pantalla — el titular ya dice qué es esto, y la sección de abajo existe
  para explicarlo. Medido a 1440×900: los botones quedan en y=605 y el
  hero completo mide 771px, así que titular + CTAs + sello caben en una
  pantalla. El `pb` del hero bajó de `28/32/40` a `20/24/28`.
- **"Un poco de glass se ve bien"**: las dos tarjetas del hero pasaron de
  blanco sólido a `bg-white/70 + backdrop-blur-xl + ring-white/60`. El
  70% es deliberado: el compuesto sobre el morado deja el texto oscuro
  cerca de 10:1, mientras que un vidrio de verdad transparente lo tira
  debajo de AA — y estas dos tarjetas llevan información real, no son
  decoración.
- **"Quita la línea verde de hasta arriba"**: `TopBar` (la franja lime con
  el correo) eliminada de la home y de las páginas legales, y el archivo
  borrado junto con `focusRingOnLime`, que solo existía para su link.
  Nada de su contenido se perdió: el correo sigue en el hero y en el
  footer, y "para peluquerías, spas, consultorios y gimnasios" ya lo dice
  `TrustSection`. Ahora el morado arranca en el borde superior de la
  página, con el nav encima, que es como se comporta la referencia.
- **"Pon algunos elementos cool junto con el texto"**: dos glifos lime en
  `Flourishes.tsx` — `Sparkle` (estrella de cuatro puntas con lados
  cóncavos; un rombo de cuatro puntas recto se lee como un signo de más
  en tamaño chico) y `AsteriskMark`. Van en las esquinas que las tarjetas
  NO usan, y son la única decoración que sobrevive en teléfono, donde las
  tarjetas y las flechas desaparecen. Verificado que no tocan el titular:
  a 1440px el asterisco arranca en x=1194 contra una línea 2 que termina
  en 1132, y la chispa termina en x=214 contra una línea 3 que arranca en
  388.
- **Mini calendario lime** (`MiniCalendar` en `HeroCards.tsx`), pedido
  después: decoración que resulta ser cierta — esto es un producto de
  reservas, así que el adorno del hero es un mes con días ya ocupados. Sin
  nombre de mes ni fechas reales a propósito: un "Septiembre" hardcodeado
  está mal once meses al año, y a ese tamaño no se lee un número de todas
  formas; la fila de días de la semana es lo que lo hace legible como
  calendario. **Tres vueltas de color** hasta quedar en celdas lime fuerte
  sobre tarjeta violeta oscura: negro sobre lime no le gustó, blanco sobre
  lime es 1.27:1 (se borraban), y lime sobre lime es invisible. Lime sobre
  `#1B1040` da ~14:1 y además habla el mismo idioma que los mocks oscuros
  del resto de la página.
- **"WhatsApp" volvió a ser lime** en el titular. Esto solo es posible
  porque el hero ya es morado: lime sobre `#5B34E8` es 5.3:1, pero sobre
  blanco era 1.4:1 — que es justo por lo que esa palabra se había pasado a
  morado cuando la página se volvió blanca.
- **La tarjeta derecha se corrigió por el breakpoint más apretado, no por
  el más holgado**: a 1024px exactos pisaba la P final de WHATSAPP. El par
  de tarjetas ahora cuelga por debajo del bloque de tipografía
  (`-bottom-6`) y en `lg` la derecha se empuja fuera del contenedor
  (`-right-10`, la sección la recorta). Verificado numéricamente a 1024 y
  1440: la tarjeta arranca después de donde termina la línea.
- **La flecha derecha se quedó huérfana** al mover esa tarjeta: seguía
  apuntando al hueco viejo y terminó encima de las letras de POR. Ahora
  solo existe desde `xl` (`right-[6rem] top-[9rem]`, volteada): entre
  1024 y 1279 no hay banda que libre el final de la línea 2 Y alcance la
  tarjeta al mismo tiempo, y una anotación que aterriza sobre la palabra
  que quería señalar es peor que ninguna anotación.
- Esa esquina llegó a tener un aro lime (`Ring`) acompañando al
  calendario; Bruno lo quitó en cuanto existió el bicho — dos objetos
  redondos juntos y uno de ellos genérico. El componente se borró con él
  en vez de quedar como código muerto: el bicho es el único redondo que
  se queda ahí.
- **Menú central en cápsula de vidrio** (`MarketingNav`): `bg-white/10` +
  `backdrop-blur-xl` + radio completo, con cada link como su propia
  pastilla — dentro de una cápsula tintada un hover que solo cambia el
  color del texto casi no se nota. Su par para las páginas legales es un
  susurro de morado, porque blanco sobre blanco desaparece. El header
  pasó de `justify-between` a un grid `1fr auto 1fr`: con un logo
  angosto de un lado y un botón ancho del otro, el elemento de en medio
  quedaba 61px fuera del centro, cosa que nadie nota en links sueltos y
  todos notan en una cápsula.
- **`BichoBug`**: el bicho del wordmark (`public/o-bicho.png`, renombrado
  de "o bicho.png" para no arrastrar un `%20` en las URLs) repetido tres
  veces alrededor del titular, cada copia con una rotación distinta —
  tres copias en el mismo ángulo se leen como un asset repetido, en
  ángulos distintos como objetos dispersos. Es la única decoración del
  hero que es de bicho (el asterisco, la chispa y el aro son formas que
  podría usar cualquiera), y por eso es la única que se gana repetirse.
  Dos de las tres solo existen desde `xl`: a 1024 la izquierda caería
  sobre la A de AGENDAR y la derecha sobre POR.

**Página de demo real, en vez de un `mailto:` (2026-09-17, mismo día)**:
Bruno pidió "una página para el botón de agendar una demo". Todos los
CTA de la landing eran `mailto:` — que en un teléfono abre una app que
mucha gente no tiene configurada, entrega un mensaje en blanco que el
visitante tiene que redactar, y deja la bandeja de Bruno como CRM.

- **`app/demo/`**: `page.tsx` (encabezado morado con la misma hoja blanca
  que lapa sobre él que la home, "Qué pasa después" y el formulario),
  `DemoForm.tsx` (cliente) y `actions.ts`. En teléfono el formulario va
  PRIMERO y los tres pasos debajo: son contexto, no una puerta.
- **`db/019_demo_requests.sql`** (⚠️ pendiente de correr): tabla
  `demo_requests` con RLS activo y CERO policies — mismo patrón que
  `platform_admins` y `resellers`, porque estas filas tienen nombre,
  teléfono y correo de una persona real. Los límites de longitud viven en
  la base además de en el formulario: una Server Action es un POST real
  al que se puede llamar sin cargar nunca la página.
- **Diseño de la entrega, y la parte que importa**: la acción inserta en
  la tabla Y manda correo (`lib/email/sendDemoRequestNotice.ts`). El
  correo **reporta si entregó** (a diferencia de
  `sendBookingConfirmation`, que nunca falla hacia afuera), porque si la
  migración no está corrida es lo único que separa a un lead del
  silencio. Si el insert falla pero el correo salió, el formulario dice
  que sí — el lead no se perdió y no tiene sentido hacer que la persona
  reescriba todo. Si fallan los dos, muestra el correo de contacto.
  **Verificado en vivo exactamente en ese caso**: con la tabla ausente
  (`PGRST205`) el envío terminó en éxito porque `RESEND_API_KEY` ya está
  configurada — llegó un correo de prueba real a la bandeja de Bruno.
- **Honeypot** (`website`) en vez de captcha: fuera de pantalla y no
  `display:none`, porque hay bots que se saltan los campos ocultos. Si
  viene lleno, la acción devuelve éxito y no guarda nada — decirle al bot
  qué lo delató solo le ayuda a pasar la próxima vez.
- **Todos los CTA de demo ahora van a `/demo`**; los de Precios llevan el
  plan que el visitante estaba viendo (`/demo?plan=…`, validado contra la
  lista real — lo que venga en el query string y no exista se ignora en
  vez de reflejarse en la página y en el lead). Siguen siendo `mailto:`
  a propósito los que dicen "escríbenos" y el de vendedores, que es otra
  intención.
- `PillLink` ahora usa `next/link` cuando el href empieza con `/`: un
  `<a>` a una ruta interna cuesta una carga completa del documento en
  cada CTA.
- Verificado a 1280 y 375: sin overflow, campos a 16px (iOS hace zoom
  debajo de eso), botón de 48px, y la marca del hero reubicada porque
  dentro del bloque de texto aterrizaba sobre la palabra CON.

**Vista de solicitudes en el panel (mismo día)**: `/admin/solicitudes`
(`app/admin/(panel)/solicitudes/`), entrada nueva en el sidebar del
admin. Lista de leads pensada para actuar, no para admirar: teléfono
como link `tel:` (en un teléfono marca), correo como `mailto:` con
asunto ya puesto, el mensaje de la persona, y botones de estado que
dependen del estado actual — ofrecer las cuatro transiciones en cada
fila convierte la lista en un muro de controles. Borrar sí pide
confirmación, cambiar de estado no (es reversible de un clic, misma
regla del resto del panel). Ambas Server Actions pasan por
`requireAdmin()`: un vendedor no tiene por qué leer estos datos.

- **Bug propio, encontrado por verificar y no por compilar**: `actions.ts`
  exportaba `DEMO_STATUSES` como constante. En un módulo `'use server'`
  **todo export tiene que ser una función async**, así que reventaba en
  "module evaluation" al renderizar — `tsc` pasaba limpio. Las
  constantes y el tipo viven ahora en `statuses.ts`.
- Se separó `DemoRequestList.tsx` de la página para poder renderizarla
  contra fixtures desde una ruta QA temporal (el panel está detrás de un
  login que Claude no puede pasar). Verificados los tres estados, las
  fechas en hora local y los botones por estado; ruta borrada al
  terminar.

`db/019_demo_requests.sql` **ya está aplicada**. Tardó dos intentos: la
primera vez PostgREST sirvió la tabla para una sola consulta y después
respondió `PGRST205` de forma consistente. Si vuelve a pasar con otra
migración, `notify pgrst, 'reload schema';` en el SQL Editor fuerza la
relectura del esquema.

**Probado de punta a punta con la tabla ya viva**: se llenó el formulario
real de `/demo?plan=Profesional`, la fila aterrizó en `demo_requests` con
todos los campos (incluido el plan que venía en el query string), y
`/admin/solicitudes` la mostró con sus contadores en 1/0/0 y la fecha en
hora local. Fila de prueba borrada al terminar; la tabla quedó en cero.

**Flujo de reserva reconstruido como proceso guiado de 5 pasos
(2026-09-17, mismo día)**: Bruno mandó un brief largo de Product/UX
pidiendo replantear la arquitectura completa del flujo del tenant, con
una condición explícita: **plantilla reutilizable, sin identidad visual**
— solo tokens neutros, porque la marca de cada negocio llega después
como tema.

**Bloqueo que había que resolver antes de escribir una línea**: en modo
CLARO la página pública no definía `tenantColorCssVars`, solo en oscuro.
Por eso el flujo viejo pintaba la marca con estilos inline. Ahora las
variables se ligan en ambos modos (`reservar/page.tsx`), y por eso el
flujo nuevo **no nombra un solo color**: todo es `primary` / `surface` /
`paper` / `ink` / `muted` / `border` / `success` / `error`, y cada
negocio lo retiñe sin tocar un archivo.

Arquitectura (`components/booking/`, un archivo por familia de
componentes: `types` · `chrome` · `cards` · `dates` · `review` ·
`states` + el orquestador `BookingFlow`):
- **5 pasos** (servicio → recurso → fecha → hora → datos) con encabezado
  fijo, barra de progreso segmentada en móvil y con nombres en
  escritorio, y "Paso X de N". **El paso de recurso desaparece** cuando
  el negocio tiene uno solo: preguntar entre una opción es una pregunta
  sin información. Verificado: `spa` (2 camas) muestra 5 pasos,
  `test-salon` (1 silla) muestra 4.
- **Resumen editable bajo el encabezado**: chips con lo ya decidido, cada
  una abre su paso. Cambiar una decisión conserva las posteriores que
  siguen siendo válidas — cambiar de servicio sí tira los horarios
  (cambia la duración), cambiar de recurso conserva el día.
- **La disponibilidad se carga para TODOS los recursos en paralelo**, no
  para uno. Es lo que hace posible "cualquiera disponible": muestra la
  unión de horarios libres, deduplicada por hora de inicio, y al
  confirmar elige un recurso que de verdad tenga ese hueco. Antes el
  flujo pedía los slots de un solo recurso, que es la razón por la que
  esa opción no existía. Además cada recurso muestra su próxima
  disponibilidad REAL (“Libre desde el miércoles 23 de septiembre”),
  calculada de los datos, no inventada.
- **Fecha**: franja de 14 días con disponibilidad por día, y el calendario
  mensual pasó a ser un bottom sheet opcional con botón “Hoy”.
- **Hora**: agrupada en “Más pronto” / Mañana / Tarde / Noche, tope de 9
  visibles y “Ver N horarios más”. **No se llama “Recomendados”**: no
  hay datos de ranking detrás y el rótulo afirmaría algo que el producto
  no puede respaldar.
- **Paso final partido en dos**: tarjeta “Tu reserva” (con Editar por
  fila) y luego los datos. El formulario valida en vivo pero no muestra
  errores antes de que toques el campo, el correo dice que es opcional y
  explica para qué sirve, y las notas van tras un disclosure.
- **Nada de política de cancelación inventada**: el negocio no tiene una
  definida (está en los pendientes de este archivo), así que la tarjeta
  dice lo que SÍ es cierto: que el enlace de la confirmación permite
  cambiar o cancelar.
- **Barra de acción fija** en móvil respetando `safe-area-inset-bottom`,
  que en escritorio se convierte en **panel lateral pegajoso** con
  resumen, total y acción. Un botón deshabilitado nunca va solo: al lado
  dice qué falta.
- **Estados diseñados**: cargando (con esqueletos), error de carga con
  reintento, día sin horarios (con el siguiente día libre, volver a
  fechas y pasar a “cualquiera” — nunca un callejón sin salida), horario
  ocupado durante el proceso (recarga y devuelve al paso de hora),
  catálogo vacío, y confirmación en pantalla propia con código, agregar
  al calendario y gestionar la cita.
- **La selección nunca depende solo del color**: todo control elegido
  cambia tres cosas a la vez — marca de verificación, borde en `primary`
  con anillo, y peso tipográfico.
- `BlockRenderer` dejó de envolver el flujo en una segunda tarjeta (el
  flujo ya trae su propia superficie) y ensancha a `max-w-4xl` desde
  `lg`, donde el layout es de dos columnas.

**Dos bugs propios atrapados al verificar**: `h-4.5` no existe en la
escala de Tailwind (la clase no se genera y el ícono vuelve a su tamaño
natural), y se me coló un `format()` de date-fns en la barra inferior,
que formatea con el reloj del NAVEGADOR — exactamente la clase de bug de
zona horaria que este archivo ya documenta. Ambos corregidos.

Verificado en vivo recorriendo el flujo completo en `spa` a 375px y a
1280px: los 5 pasos, el resumen editable, la franja de días, los grupos
de horarios con su tope, la validación del formulario, y una reserva real
creada y confirmada (código 634C1436) — borrada al terminar junto con su
cliente. Sin overflow horizontal, botón de 48px, barra visible sin
scroll. `tsc` limpio, 97 tests en verde.

**Pendiente de decidir**: `resourceLabel` y `location` son props nuevas
con valores por defecto (“Profesional”, sin ubicación) porque no existen
en la base. Para `spa`, cuyos recursos se llaman “CAMA” y “CAMA 2”, lo
correcto sería “Cabina” — hace falta una columna en `tenants` y un
campo en el panel para que cada negocio elija cómo se llama lo que
reserva.

**La agenda del dueño ahora es editable (2026-09-17, mismo día)**: se le
señalaron a Bruno tres huecos del lado del operador y pidió resolverlos.
Son el mismo problema: el dueño podía mirar su agenda pero no tocarla,
mientras el cliente final sí podía moverla desde su enlace.

1. **Agendar a mano** (`createStaffBooking`): la clienta que llama o llega
   al local. Sin esto el dueño lleva una libreta en paralelo, el sistema
   ve medio día, y el siguiente visitante en línea reserva encima de una
   cita real — que es justo lo único que el producto promete evitar.
   Usa `create_booking` (la misma función atómica del flujo público, que
   es `service_role` only), así que la acción **verifica membresía
   explícitamente** con `requireTenantStaff` (`lib/auth/tenantStaff.ts`) y
   comprueba que el recurso y el servicio sean de ESE negocio: la RPC
   recibe el `tenant_id` por parámetro y se fía de él.
2. **Bloqueos** (`db/020_schedule_blocks.sql`, ⚠️ pendiente de correr):
   tabla `schedule_blocks` con `resource_id` nullable (NULL = todo el
   negocio, para que un festivo sea una fila y no una por silla) y, lo
   importante, **`get_available_slots` ahora también resta los bloqueos**.
   Un bloqueo que la página pública no respetara no sería un bloqueo.
3. **Reagendar desde el panel**: la lógica de mover una cita (futura,
   confirmada, el constraint de exclusión, el correo de aviso) se extrajo
   a `lib/bookings/reschedule.ts` y ahora la comparten el enlace público y
   el dashboard, en vez de vivir duplicada — esa función ya había
   producido un bug silencioso una vez (una cita cancelada "se movía" y
   mandaba correo).

- **`instantFromLocal`** (`lib/dates/tenantTime.ts`, con 4 tests): la
  inversa de todo lo demás del archivo. El dueño teclea "25/12, 14:00" en
  hora local y la columna es `timestamptz`; `new Date('...T14:00')` se
  resolvería contra la zona del PROCESO — UTC en Vercel — y habría
  guardado un bloqueo de 2pm como 8am, liberando exactamente las horas que
  quería cerrar. Probado contra México y contra Madrid en invierno y
  verano (cambio de horario).
- **`SlotPicker`** (`components/tenant-dash/`) es compartido por agendar y
  reagendar, y pregunta por los huecos libres a la MISMA función que la
  página pública. Cualquier otro camino sería reintroducir el
  doble-booking por la puerta de atrás.

**Bug propio encontrado al verificar**: el `<select>` de día arrancaba en
"hoy", pero un `<select>` cuyo value no coincide con ninguna opción
muestra la PRIMERA — así que decía "23 de septiembre" mientras el
componente seguía pensando que el día era hoy, y no aparecía ni un
horario. Ahora, al cargar, cae en el primer día con huecos.

Verificado con ruta QA temporal (borrada) contra los datos reales de
`spa`: el formulario carga 18 horarios reales, arma "Vas a agendar el
Miércoles 23 de septiembre, 10:00", y los bloqueos de ejemplo se leen
como "Viernes 25 de diciembre, todo el día" y "Viernes 2 de octubre, de
14:00 a 17:00" — o sea la conversión de zona horaria cuadra en los dos
sentidos. `tsc` limpio, 101 tests en verde.

`db/020_schedule_blocks.sql` **ya está aplicada y verificada de punta a
punta** contra los datos reales de `spa`:
- Bloqueo de todo el negocio por un día: 144 huecos → 126, exactamente
  los 18 de ese día. Al borrar el bloqueo, vuelve a 144.
- Bloqueo de UN solo recurso: CAMA 18→0, CAMA 2 17→17 — el alcance por
  recurso funciona, no cierra el negocio entero.
- Con el bloqueo puesto, la página pública marca ese día como "Sin
  horarios" y no deja elegirlo; al quitarlo vuelve a estar disponible.
- La tabla quedó en cero: los bloqueos de prueba se borraron.

Lo único que NO se pudo probar con sesión real son las policies de RLS de
`schedule_blocks` (las pruebas corrieron con `service_role`, que las
salta). Siguen el mismo patrón que `resource_schedules`, ya probado.

**WhatsApp como extra prendible por negocio (2026-09-18)**: Bruno pidió
implementarlo como un extra que se active y desactive con un botón desde
el panel de admin y el de vendedores. Antes calculamos el costo: tarifa
de utilidad en México **MX$0.15–0.20 por mensaje**, así que un negocio con
3–5 citas al día gasta **MX$25–50 al mes** solo en confirmaciones. Desde
el **1-oct-2026** Meta también cobra las plantillas de utilidad dentro de
la ventana de 24 h; para este caso de uso casi no cambia nada, porque las
confirmaciones salen cuando el cliente no está chateando y ya se cobraban.

- **`db/021_whatsapp_addon.sql`** (⚠️ pendiente de correr):
  `tenants.whatsapp_enabled` (default **false**) y la tabla
  `whatsapp_messages` — un renglón por intento, incluidos los fallidos y
  los omitidos con su motivo. Sin ese registro, "WhatsApp" es una línea
  en una factura que nadie puede justificar; con él, el panel dice cuántos
  mensajes van este mes y cuánto cuestan. RLS sin policies (service_role
  only): la tabla guarda teléfonos de clientes.
- **`lib/whatsapp/send.ts`**: Cloud API directo, sin BSP. Tres guardas
  antes de gastar un peso — el flag del negocio, las credenciales de la
  plataforma, y un teléfono marcable — y cada una que corta deja el
  motivo en el log. **Nunca lanza**: la cita ya existe en Postgres cuando
  esto corre. `toE164Mx` normaliza lo que la gente teclea de verdad
  ("618 123 4567", "+52…", el viejo prefijo 521) y devuelve null en vez
  de mandar al vacío; 4 tests.
- **El interruptor** (`components/tenant-setup/WhatsappToggle.tsx`) es el
  mismo componente en los dos paneles, con una frase distinta según quién
  mira ("Costo aprox. en Meta" para el equipo, "Te cuesta aprox." para el
  vendedor). La acción `setTenantWhatsapp` pasa por `requireTenantManager`,
  así que un vendedor solo puede prenderlo en los negocios que él trajo —
  es un interruptor de cobro, no una preferencia.
- **`/api/reservar`** lee el flag en una consulta aparte, para que una base
  sin la migración se comporte como "extra apagado" en vez de tumbar cada
  reserva. Verificado: con `db/021` sin correr, una reserva real se creó y
  se confirmó igual.
- **`WHATSAPP_SETUP.md`** (nuevo) tiene lo que no se puede automatizar:
  verificación del negocio en Meta, número emisor, token de System User
  (no el temporal de 24 h), y la plantilla con sus **cinco variables en
  orden exacto** — el código las manda posicionalmente, así que si se
  reordenan en Meta hay que reordenarlas en `send.ts`.
- **Decisión documentada ahí**: un solo número de bicho para todos los
  negocios (el nombre del negocio viaja como variable), y **nada de BSP**
  por ahora: su cuota mensual por número (MX$500–1,000) cuesta más que
  todos los mensajes juntos.

Verificado con ruta QA temporal (borrada): las tres variantes del
interruptor — apagado, activo con 212 mensajes y MX$42.40 estimados, y el
aviso de migración faltante. `tsc` limpio, 105 tests en verde.

`db/021_whatsapp_addon.sql` **ya está aplicada y el interruptor está
probado de punta a punta** contra `spa`:
- Con el extra **encendido**, una reserva real quedó confirmada y dejó un
  renglón en `whatsapp_messages`: `kind=confirmation`,
  `to_phone=526181112233` (normalizado desde "618 111 2233"),
  `status=skipped`, `error="WhatsApp no configurado en la plataforma"`.
  O sea: leyó el flag, normalizó el teléfono, se detuvo en la guarda de
  credenciales y lo dejó explicado — sin tocar la reserva.
- Con el extra **apagado**, otra reserva real no generó **ningún**
  renglón. Un negocio que no paga el extra no acumula ni registros.
- Datos de prueba borrados; `spa` quedó con el extra apagado.

**Pendiente de vos**: lo de Meta que está en `WHATSAPP_SETUP.md`
(verificación, número, token de System User y la plantilla). Hasta
entonces cada envío queda como `skipped` con su motivo.

**Lo que NO incluye esta pieza**: los recordatorios. Necesitan ejecución
programada (un cron de Vercel que cada hora busque las citas de mañana),
que es una pieza aparte con su propio riesgo — un cron mal hecho manda
el mismo recordatorio dos veces, y eso son mensajes cobrados de más.

**Plantillas: el editor hablaba en idioma de diseñador (2026-09-18)**:
Bruno: "son 0 intuitivas, no se entiende nada", y el objetivo que lo
ordena todo — **lo tiene que poder usar un vendedor**, que no ve código.
Decidió expresamente conservar TODO el poder actual (composición,
variantes, estilos): el problema no era el alcance, era que no se
entendía.

- **Vocabulario**. Los nombres eran los del sistema de layout:
  "Llamada a la acción", "Lista de características", "Imagen + texto",
  "Separador". Ahora dicen lo que la sección ES para el negocio:
  "Invitación a reservar", "Por qué elegirnos", "Foto con texto al lado",
  "Espacio en blanco". Y las variantes pasaron de jerga de dirección de
  arte ("Editorial", "Minimal", "Overlay") a describir lo que vas a ver
  ("Título enorme a la izquierda", "Foto de fondo con el texto encima").
- **`BLOCK_HINTS`**: una línea bajo cada nombre, para saber qué hace una
  sección ANTES de agregarla en vez de agregarla para averiguarlo.
- **`BLOCK_GROUPS`**: la paleta pasó de quince opciones en una columna
  plana a cuatro grupos por intención (Lo importante · Para convencer ·
  Datos prácticos · Formato). Y los nombres dejaron de truncarse:
  "Galería de imág…" no es un nombre.
- **34 campos del inspector ganaron etiqueta persistente.** Llevaban su
  nombre solo en el `placeholder`, que desaparece justo cuando escribes
  — así que una sección a medio llenar era una pila de cajas anónimas.
  Es el cambio que más pesa de todos.
- **Portadas de la galería**: eran un emoji (💇 🦷 🎾) sobre una banda de
  color, que repetía el giro que el nombre ya decía y no contaba nada de
  cómo se ve la plantilla — que es lo único que estás eligiendo. Ahora la
  tarjeta renderiza **una miniatura viva de la propia plantilla**, y
  `db/022_template_cover.sql` (⚠️ pendiente) agrega `cover_image_url`
  para poner una foto real cuando exista. Nada de fotos de stock: una
  foto de desconocidos en la plantilla de un negocio real da a entender
  que son sus clientes, y la miniatura además no se puede quedar vieja,
  porque ES la plantilla.

**Bug real que encontró Bruno y que estaba en las SEIS plantillas**: la
vista previa del bloque de reserva mostraba "¿Qué te hacemos? / Corte de
cabello / $300" — datos de peluquería quemados en `BlockRenderer`. En la
plantilla de pádel se leía absurdo. Ahora la previa toma los servicios de
la sección "Servicios y precios" **de esa misma página**, y si no hay
ninguna cae en un marcador neutro ("Tu primer servicio · $—") en vez de
inventarle un giro. El encabezado pasó de "¿Qué te hacemos?" (de
peluquería) a "Elige un servicio".

**Incidente durante el trabajo**: un `re.sub` para envolver los campos no
matcheó nada porque el patrón usaba `[^>]*?`, y cada input tiene una
función flecha en sus props — el `>` de `=>` cerraba la clase de
caracteres. Al reintentar con la ruta mal escrita, el script corrió dos
veces y duplicó un componente. Se restauró del respaldo que se había
hecho ANTES de tocar el archivo (1727 líneas) y se rehizo con
`.*?` + `re.DOTALL`. **Lección**: antes de correr un regex sobre un
archivo grande, `cp` a un respaldo; y en un heredoc de bash, las rutas
`/c/...` no existen para Python en Windows.

Verificado en vivo contra las plantillas reales: la paleta agrupada, los
nombres nuevos, las 34 etiquetas, las portadas con miniatura, y la previa
de pádel ya sin "Corte de cabello". La página pública sigue intacta
(`test-salon` carga su flujo con "Corte · 30 min · $300" real). `tsc`
limpio, 105 tests en verde.

**Pendiente de vos**: correr `db/022_template_cover.sql` si quieres poder
poner fotos de portada. Sin eso la galería funciona igual, con la
miniatura.

**Cuatro huecos del panel del negocio (2026-09-22)**: Bruno pidió reparar
cuatro de los cinco pendientes que le listé. El quinto (subir imágenes)
quedó fuera porque necesita un bucket de Supabase Storage creado por él.

**1. Una cita ya puede terminar en algo.** `AgendaList` leía `completed`
desde hacía meses —atenuaba la fila y le ponía un check— pero **nada en
todo el producto lo escribía nunca**. La columna tenía tres valores y la
app solo podía producir dos.
- `db/023_booking_attendance.sql` (⚠️ pendiente) agrega `no_show` al
  check. **No es lo mismo que `cancelled`**: cancelada devuelve el
  horario a la venta, no-show significa que el horario se consumió y
  nadie llegó. El `exclude` constraint filtra `status <> 'cancelled'`,
  así que `completed` y `no_show` siguen ocupando su hueco — correcto, y
  hay un comentario en la migración para que nadie lo "arregle".
- `markBookingAttendance(bookingId, slug, attended)` pasa por
  `requireTenantStaff`, rechaza una cita cancelada con una frase en vez
  de dejar que el constraint truene, y traduce el `23514` a «Falta
  correr la migración 023».
- `AttendanceButtons` solo aparece en citas **ya terminadas**: "¿vino?"
  no es una pregunta que se pueda contestar sobre mañana. La agenda
  ahora ramifica — futura → Cambiar hora / Cancelar; pasada → Vino / No
  vino. Antes eran cuatro botones en una fila de teléfono, y ofrecía
  "cancelar" una hora que ya ocurrió.
- El badge de no-show es **el único estado que NO se atenúa**: alguien
  revisando la semana busca exactamente esas filas.

**2. Vista de clientes** (`/dashboard/customers`). El hallazgo que la
ordena todo: **`create_booking` inserta una fila NUEVA en `customers` en
cada reserva** (db/010) y no hay unicidad por teléfono, así que la tabla
es «una fila por cita» disfrazada. Leerla directo mostraría a la misma
clienta cinco veces.
- `lib/customers/roster.ts` agrupa por teléfono normalizado (solo
  dígitos) al LEER, con el nombre como respaldo. **No se hizo migración
  de datos** a propósito: fusionar dos personas que comparten un número
  (una pareja, el teléfono del local tecleado por el staff) no es
  reversible; agrupar en lectura sí. Si algún día se agrega la unicidad,
  esta vista sigue funcionando igual.
- **Una cita pasada en `confirmed` cuenta como visita.** Nada podía
  escribir `completed` antes de db/023, así que contar solo eso habría
  mostrado a toda la clientela histórica como desconocidos. De ahí que
  `visits` y `completed` sean campos distintos.
- 18 tests en `lib/customers/roster.test.ts`.
- La demo pública ganó su propia `/plataforma/panel/customers` con el
  MISMO `buildRoster`, y las fixtures ganaron historial (offsets
  negativos, que las otras dos pantallas filtran) — sin él cada cliente
  leería «Nuevo · 1 visita», que es justo la pantalla que hace que una
  demo parezca vacía.

**3. `resource_label` y `location` por negocio**
(`db/024_tenant_labels.sql`, ⚠️ pendiente). `BookingFlow` aceptaba ambas
props desde que se reconstruyó; nadie podía llenarlas nunca.
- Campos nuevos en `BrandEditor` (los dos paneles). `resource_label` es
  un `<input list>` con sugerencias, no un `<select>`: un giro que no
  se nos ocurrió tiene que poder escribir su palabra.
- **La pregunta del paso también se adapta**, que era el punto: el flujo
  decía «¿Con quién prefieres reservar?» fijo, absurdo para una cancha.
  Ahora `resourceLabel` ya NO tiene default en el destructure — el
  componente distingue «el negocio eligió una palabra» de «está en el
  respaldo», y solo en el primer caso cambia a «¿Qué cancha prefieres?».
  Un negocio que no configuró nada lee exactamente lo de antes.
- `updateTenantBranding` **reintenta sin las dos columnas** ante un
  42703: una migración pendiente cuesta los dos campos nuevos, no todos
  los colores del formulario. Mismo patrón defensivo de `page_blocks` y
  `reseller_id`. Verificado en vivo **con db/024 sin correr**: la página
  pública de `test-salon` renderiza igual.
- «Ver mi cita» por fin puede responder «¿dónde voy?» — la dirección
  enlaza a Google Maps, y la fila «Te atiende» usa la palabra del
  negocio.

**4. `npm run lint` reparado.** `next lint` desapareció en Next 16 y el
script apuntaba a una carpeta llamada `lint`. Ahora es `eslint .` con
`eslint.config.mjs` (flat config; ESLint 10 no lee `.eslintrc.json`, que
se borró). **Hubo que bajar eslint de 10 a 9**: el `>=9.0.0` de los
peers de `eslint-config-next@16` es optimista — sus plugins de React y
TypeScript son de la generación de ESLint 9 y revientan con 10
(`contextOrFilename.getFilename is not a function`, luego
`scopeManager.addGlobals is not a function`).

**Bug encontrado al verificar, que yo mismo había enviado la sesión
pasada**: **todos los enlaces del menú de la demo pública eran 404.**
`navBase` del `Sidebar` se CONCATENABA (`/plataforma/panel` +
`/dashboard/calendar` = `/plataforma/panel/dashboard/calendar`) cuando
las rutas reales son `/plataforma/panel/calendar`. Ahora **sustituye** el
segmento `/dashboard` en vez de prefijarlo. Los 8 destinos verificados en
200. Se descubrió porque agregar "Clientes" al menú me hizo mirar los
hrefs renderizados, no porque nada fallara visiblemente — la demo se veía
bien y era inservible más allá de la primera pantalla.

**Hallazgos del lint que NO se arreglaron** (nunca se habían visto porque
el comando llevaba meses roto): 9 errores de `react-hooks`, todos reales
— 5 `set-state-in-effect` (ThemeToggle, Sidebar, BookingFlow,
SlotPicker, ResellerShell), 2 `static-components` (ServicesTicker define
`Row` dentro del componente), 1 `purity`, 1 `refs`. Son refactors de
código que funciona, así que `npm run lint` sale en rojo hasta que se
hagan. Los 3 enlaces crudos que marcaba `next` sí se resolvieron: uno era
un bug real (recarga completa al ir a `/reservas`), los otros dos son
anclas de la misma página con su `eslint-disable` y su motivo.

**Pendiente de vos**: correr `db/023_booking_attendance.sql` y
`db/024_tenant_labels.sql` en el SQL Editor. Hasta entonces «Vino»
funciona (`completed` ya era legal) y «No vino» muestra el mensaje de
migración pendiente — verificado contra la base real.

**Choose en el portafolio + el portafolio pasa a marquesina (2026-09-22,
mismo día)**: Bruno mandó la captura de Choose (plataforma de orientación
vocacional, Django + Next.js + React) para agregarla, y después pidió que
las tarjetas fueran todas iguales, desfilaran «como el banner de arriba»
y llevaran una flechita.

- `public/portfolio/choose.webp` (2000×1318) + entrada nueva en
  `projects.ts`. **El stack dice exactamente Django · Next.js · React**:
  Django trae Postgres por defecto, pero él no lo dijo y un chip en un
  portafolio es una afirmación técnica, no una suposición.
- **La marquesina reutiliza el mecanismo del ticker del hero**, no uno
  nuevo: `.ticker-shell` + `.ticker-track` de `globals.css`, con
  `--ticker-duration: 60s` (contra los 16s del hero — aquí no son cuatro
  palabras, son tarjetas de 480px con captura y párrafo). La lista se
  renderiza dos veces y el keyframe mueve exactamente -50%, así que el
  ciclo no salta.
- **La copia va `aria-hidden` Y `inert`.** Aquí importa más que en el
  hero: estas tarjetas llevan botones reales, y sin `inert` el Tab
  aterrizaría en un duplicado del enlace que el visitante ya pasó.
  Verificado: solo 2 enlaces tabulables en toda la sección.
- **`.ticker-shell:focus-within` también pausa** (regla nueva en
  `globals.css`, beneficia a los dos tickers): sin eso, tabular a un
  botón arranca una persecución — el objetivo sigue deslizándose con el
  anillo de foco encima. El hover ya pausaba.
- **La flechita es un `<span aria-hidden>`, no un enlace**, por la misma
  regla de anclas anidadas que ya causó un error de hidratación real en
  el hero: la tarjeta es un contenedor con hasta dos acciones en el pie,
  así que un tercer enlace encima sería un ancla dentro de otra. La
  flecha es affordance; los destinos siguen siendo los botones.
- El aviso «pasa el cursor para detenerlo» está oculto en teléfono — ahí
  no hay cursor, sería una instrucción que nadie puede seguir.
- Se probó primero una variante con la primera tarjeta a ancho completo
  (para que 3 tarjetas no dejaran una huérfana en una rejilla de dos
  columnas); Bruno la descartó — «déjalos todos así». La marquesina
  resuelve el mismo problema mejor, porque con N tarjetas nunca hay
  fila incompleta.

Verificado a 1280 y 375px: 6 tarjetas (3 + copia) de 480×595 y 308×568,
sin overflow, pausa por hover confirmada (`animationPlayState: paused`),
consola limpia. `tsc` limpio, 123 tests en verde.

**Hueco de honestidad que esto destapa**: el subtítulo de la sección dice
«Entra y pruébalos», pero **2 de las 3 tarjetas no tienen enlace**
(Choose y Nova Solar siguen con `href: '#portafolio'` y su TODO). Con
una de tres se disimulaba; con dos de tres el subtítulo promete algo que
la sección no cumple. Hace falta la URL pública de las dos, o cambiar
esa frase.
