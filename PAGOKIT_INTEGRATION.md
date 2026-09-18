# Integración PagoKit — Stripe

Generado por PagoKit el 2026-09-17.

> **Lee esto primero**: bicho le cobra **únicamente a sus vendedores** (tabla
> `resellers`). Nunca le cobra a un negocio (`tenants`) ni al cliente final que
> agenda una cita. El negocio le paga al vendedor **por fuera** (efectivo o
> transferencia) y ese dinero jamás pasa por la plataforma: no hay Stripe
> Connect, no hay split, no hay marketplace y no hay payouts en ningún archivo
> de esta integración.

## Qué se cobra exactamente

```
cargo mensual = (negocios ACTIVOS de ese vendedor) × resellers.wholesale_price_mxn
```

- «Negocio activo» = `select count(*) from tenants where reseller_id = <vendedor> and status = 'active'`.
  `tenants.status` admite `trial`/`active`/`suspended`/`cancelled`; **solo cuenta `active`**.
- Se cobra el día `resellers.billing_day` (1–28) de cada mes, mapeado al
  `billing_cycle_anchor` de Stripe.
- Es una suscripción recurrente de **cantidad variable**: precio licenciado
  (por unidad) donde `quantity` es el número de negocios activos.
- `tenants.retail_price_mxn` (lo que el vendedor le cobra al negocio) es
  **informativo**: nunca se cobra ni se le manda a Stripe.
- Un negocio con `reseller_id IS NULL` no genera ningún cargo. Se omite.

## Configuración

| | |
|---|---|
| Proveedor | Stripe (API `2025-08-27.basil`) |
| SDK servidor | `stripe@18.5.0` |
| SDK navegador | `@stripe/stripe-js@9.16.0` + `@stripe/react-stripe-js@6.10.0` |
| Stack | Next.js 16 (App Router) |
| ORM | ninguno — `service_role` de Supabase vía `lib/supabase/admin.ts` |
| Deploy | Vercel |
| Modelo de cobro | suscripción con cantidad variable |
| Frontend | Stripe Elements embebido (Payment Element) |
| Métodos | tarjeta |
| Moneda | MXN |
| Modo | **solo pruebas** (`sk_test_` / `pk_test_`) |

### Nota sobre la versión de API

El catálogo de PagoKit nombra `2025-04-30.basil`. El SDK instalado
(`stripe@18.5.0`) está compilado contra `2025-08-27.basil`, de la misma
generación *basil*, y sus tipos de TypeScript solo aceptan esa cadena. Se fijó
la versión del SDK (`STRIPE_API_VERSION` en `lib/payments/stripe.ts`) para que
tipos y protocolo coincidan, que es justamente el objetivo de fijar la versión.
Al subir el SDK hay que cambiar esa constante a propósito y leer las notas de
versión — no borrar la línea.

## La trampa de unidades (la más importante)

`resellers.wholesale_price_mxn` es un entero **en pesos completos** (constraint
0–100000, se captura a mano en el panel interno: «700» son setecientos pesos).
MXN tiene exponente ISO 4217 = 2, así que el `unit_amount` de Stripe va en
**centavos**. La conversión es `× 100`.

Vive en **un solo lugar**: `pesosToCentavos()` en `lib/payments/stripe.ts`.
Ningún otro archivo escribe `* 100` sobre un precio. Está cubierta por pruebas
que verifican que no es la identidad y que no se aplica dos veces
(`lib/payments/stripe.test.ts`).

## Política de prorrateo — decidida, no re-discutir

**`proration_behavior: 'create_prorations'`** (constante `PRORATION_BEHAVIOR` en
`lib/payments/stripe.ts`, fijada además por una prueba).

Qué significa en dinero: cuando un negocio se activa o se desactiva a mitad de
mes, Stripe **registra** la diferencia como línea de prorrateo y la **cobra en
la siguiente factura**. Nunca se genera un cargo inmediato.

Las dos alternativas que se descartaron a propósito:

- `always_invoice` — cobraría la diferencia al instante. Es exactamente lo que
  el dueño pidió evitar.
- `none` — tiraría la diferencia a la basura: un vendedor que activa diez
  negocios el día 2 los tendría gratis hasta el siguiente corte.

Lo mismo aplica al alta: la suscripción se crea con `billing_cycle_anchor` en el
próximo día de corte, así que **guardar la tarjeta no mueve dinero**; el periodo
parcial se prorratea sobre esa primera factura.

## Resincronización de la cantidad

`syncResellerSubscriptionQuantity(resellerId)` en
`lib/payments/resellerSubscription.ts` es la **única** forma en que cambia la
cantidad. Vuelve a contar con un `count(*)` fresco contra `tenants` y **manda el
resultado** a Stripe: nunca suma ni resta sobre un número cacheado, porque un
solo evento perdido desviaría la factura para siempre y el desvío sería
invisible hasta que alguien reclame.

Nunca lanza: cada punto de llamada está haciendo algo importante (activar un
negocio, moverlo de vendedor) y la facturación no puede tumbar esa operación.

Puntos de llamada cableados:

| Dónde | Archivo | Por qué |
|---|---|---|
| `setTenantStatus` | `app/admin/(panel)/tenants/[tenantId]/actions.ts` | Suspender/reactivar un negocio cambia la cuenta de alguien |
| `setTenantReseller` | `app/admin/(panel)/vendedores/actions.ts` | Mover un negocio cambia **dos** facturas — se resincronizan ambos vendedores (`syncBothSidesOfReassignment`) |
| `createTenant` | `app/admin/(panel)/tenants/actions.ts` | Hoy nace en `trial` (no-op), pero mantiene la invariante sin excepciones |
| `setResellerActive` | `app/admin/(panel)/vendedores/actions.ts` | Un vendedor dado de baja no puede seguir pagando |
| Botón «Volver a contar» | `/vendedor/suscripcion` | El vendedor puede verificarlo él mismo |

Todas las llamadas usan `await`: en Vercel nada garantiza que una promesa siga
corriendo después de mandar la respuesta, así que una promesa suelta se saltaría
la resincronización justo en producción.

### Vendedor dado de baja (`resellers.active = false`)

Resuelto, no omitido: la resincronización lee `active` y pone
`cancel_at_period_end` en consecuencia. Dar de baja termina la suscripción **al
final del periodo ya pagado** (cancelar a media calle dejaría ese dinero varado
o exigiría un reembolso que nadie pidió). Volver a activarlo lo revierte. Como
se evalúa en cada sync y no solo en la transición, el estado no puede quedar
desfasado.

### Cero negocios activos

`quantity = 0` y además `pause_collection: { behavior: 'void' }`. Un vendedor sin
negocios activos no debe nada, y pausar evita facturas de $0. Al activarse un
negocio se quita la pausa sola en el siguiente sync.

## Archivos creados

| Archivo | Para qué |
|---|---|
| `db/018_reseller_subscriptions.sql` | Migración: ids de Stripe en `resellers` + 5 tablas nuevas + RLS + triggers |
| `lib/payments/stripe.ts` | Cliente Stripe (versión fijada), conversión de moneda, anchor de cobro, política de prorrateo |
| `lib/payments/errors.ts` | Taxonomía de errores → mensajes accionables en español |
| `lib/payments/webhookSignature.ts` | Verificación de firma (HMAC + `timingSafeEqual` + ventana de tiempo) |
| `lib/payments/webhookSignature.test.ts` | 10 pruebas que falsifican firmas a propósito |
| `lib/payments/stripe.test.ts` | 17 pruebas de conversión de moneda, día de corte y prorrateo |
| `lib/payments/resellerSubscription.ts` | Resync de cantidad, alta de suscripción, cliente de Stripe, precios |
| `lib/payments/refunds.ts` | Reembolsos con todas sus guardas |
| `lib/email/sendResellerDunning.ts` | Correo de cobro fallido (dunning) |
| `app/api/webhooks/stripe/route.ts` | Webhook firmado |
| `app/vendedor/(panel)/suscripcion/page.tsx` | Pantalla del vendedor |
| `app/vendedor/(panel)/suscripcion/actions.ts` | SetupIntent, guardar tarjeta, resync |
| `components/reseller/CardSetupForm.tsx` | Stripe Elements embebido |
| `components/reseller/SubscriptionPanel.tsx` | Estado de tarjeta + cambiar tarjeta + recontar |
| `payment-page-scripts.json` | Inventario de scripts de la página de pago (PCI DSS 4.0.1 req. 6.4.3) |
| `PAGOKIT_INTEGRATION.md` | Este archivo |
| `PAGOKIT_PRODUCTION_CHECKLIST.md` | Paso a producción |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `.env.example` | 3 variables de Stripe (solo prefijos de prueba) |
| `package.json` / `package-lock.json` | 3 dependencias de Stripe |
| `lib/urls.ts` | `resellerSubscriptionUrl()` para el enlace del correo de dunning |
| `app/admin/(panel)/tenants/actions.ts` | Resync en `createTenant` |
| `app/admin/(panel)/tenants/[tenantId]/actions.ts` | Resync en `setTenantStatus` |
| `app/admin/(panel)/vendedores/actions.ts` | Resync en `setTenantReseller` y `setResellerActive`; acción `refundResellerMonth` |
| `components/reseller/ResellerShell.tsx` | Entrada «Mi suscripción» en el menú |

**`.gitignore` no se tocó**: ya cubre `.env` y `.env*`. Verificado antes de
escribir nada relacionado con variables de entorno (Regla 2).

**La tabla `payments` no se tocó** (restricción del dueño). Su `booking_id` es
`NOT NULL` con FK a `bookings`, así que un cargo a un vendedor no se puede
representar ahí; meterlo a la fuerza obligaría a volver `booking_id` nullable y
destruiría la garantía de que toda fila de `payments` pertenece a una cita real.

## Base de datos — `db/018_reseller_subscriptions.sql`

⚠️ **Pendiente de correr a mano en el SQL Editor de Supabase**, igual que todas
las migraciones anteriores de este proyecto. Es idempotente: correrla dos veces
no rompe nada.

Columnas nuevas en `resellers`:

- `stripe_customer_id` — el cliente de Stripe **es** el vendedor.
- `stripe_subscription_id` — su suscripción.

Ambas con índice único parcial (los muchos `null` de vendedores sin tarjeta no
chocan entre sí).

Tablas nuevas:

| Tabla | Contenido |
|---|---|
| `reseller_subscriptions` | Espejo local de la suscripción de Stripe (estado, cantidad, periodo, `past_due_since`) |
| `reseller_payment_methods` | Metadatos de la tarjeta: marca, últimos 4, vencimiento, `network_transaction_id` |
| `reseller_charges` | Una fila por factura de Stripe. Montos en **centavos** (el resto del esquema usa pesos) |
| `webhook_events_processed` | Deduplicación por `event.id` (Regla 9) |
| `idempotency_keys` | Registro propio de cada `Idempotency-Key` mandada a Stripe (Regla 4) |

**RLS**: las cinco tablas quedan con RLS **activado y cero policies**, igual que
`platform_admins` (db/006) y `resellers` (db/016). Eso es *deny* por defecto para
`anon` y `authenticated`, y paso libre solo para `service_role`. El criterio es
el mismo de `db/002` (dar policy solo donde alguien sin `service_role` realmente
necesita leer) aplicado a un caso donde nadie está en esa posición. Aquí importa
más que en ningún otro lado: una policy que dejara leer a `authenticated`
expondría los ingresos de cada vendedor a todos los demás.

## Eventos de webhook

Ruta: **`app/api/webhooks/stripe/route.ts`** → `/api/webhooks/stripe`.

No es el `/api/webhook/<proveedor>/` por defecto de PagoKit: es la ruta que pidió
el dueño porque `proxy.ts:66` reescribe subdominios a `/t/{slug}` y `/admin` pero
excluye explícitamente todo lo que empieza con `/api`, así que esta ruta resuelve
en cualquier host.

URL de producción:

```
https://reservas-saas-sigma.vercel.app/api/webhooks/stripe
```

(No hay dominio propio todavía, así que los subdominios no resuelven en
`*.vercel.app` — una URL de webhook con subdominio simplemente nunca conectaría.)

| Evento | Qué hace |
|---|---|
| ✅ `customer.subscription.created` | Crea el espejo local |
| ✅ `customer.subscription.updated` | Actualiza estado/cantidad/periodo. Cubre `past_due`, `unpaid`, `paused` y `cancel_at_period_end` |
| ✅ `customer.subscription.deleted` | Marca cancelada y limpia el puntero en `resellers` |
| ✅ `invoice.paid` | Registra el cobro y **apaga** el estado de mora |
| ✅ `invoice.payment_failed` | Marca `past_due`, guarda el motivo y **manda el correo de dunning** |
| ✅ `charge.succeeded` | Guarda `network_transaction_id` y el id del cargo |
| ✅ `charge.refunded` | Actualiza el monto reembolsado |
| ✅ `charge.dispute.created` | Marca `disputed_at` (una disputa **no** es un reembolso) |
| ✅ `setup_intent.succeeded` | Guarda la tarjeta como predeterminada |
| ✅ `payment_method.attached` | Guarda metadatos de la tarjeta |
| ✅ `payment_method.automatically_updated` | La red actualizó número/vencimiento — refresca los metadatos |
| ✅ `payment_method.detached` | Borra la tarjeta guardada |
| ✅ `payment_intent.succeeded` | Solo se registra en log: el dinero se contabiliza desde los eventos `invoice.*` (actuar aquí duplicaría el cargo) |
| ✅ `payment_intent.payment_failed` | Igual que el anterior |
| ⏳ cualquier otro | `default:` solo escribe en log, nunca cumple nada (Regla 14). Hay un `TODO` en `app/api/webhooks/stripe/route.ts` que pide agregar un `case` explícito si aparece algo nuevo en los logs |

Cubre el mínimo del catálogo de Stripe (7 eventos) y agrega 7 más.

### Camino de mora (dunning)

1. Falla el cobro → `invoice.payment_failed`.
2. Se marca `past_due` y se guarda desde cuándo.
3. Sale correo (`lib/email/sendResellerDunning.ts`). Si Stripe todavía va a
   reintentar (`next_payment_attempt`) dice «lo volveremos a intentar»; si ya se
   rindió, dice que la suscripción quedó cancelada.
4. El panel del vendedor muestra una banda roja y **abre solo** el formulario de
   cambiar tarjeta.
5. Al guardar la tarjeta nueva se reintenta la factura abierta al instante, sin
   esperar el reintento programado de Stripe.

El correo no se manda si falta `RESEND_API_KEY` (hoy falta) y **nunca** tumba el
webhook: el cobro fallido ya quedó registrado en Postgres.

## Webhooks que ya existían en el proyecto

Ninguno de pagos. Lo que hay son rutas de API no relacionadas, que no se tocaron:

- `app/api/reservar/route.ts` — flujo público de reserva.
- `app/admin/auth/callback/route.ts`, `app/t/[slug]/auth/callback/route.ts` —
  intercambio de código PKCE de Supabase Auth.

## Seguridad — cómo se cumple cada regla

| Regla | Dónde |
|---|---|
| 1 — Sin llaves en el código | Todo sale de `process.env`. Sin fallback, sin valor «demo» |
| 2 — `.env` en `.gitignore` | Verificado antes de tocar `.env.example`: ya cubierto |
| 3 — Firma verificada | `verifyStripeSignature()` **y** `stripe.webhooks.constructEvent()`; si discrepan, se rechaza |
| 4 — Idempotencia | `crypto.randomUUID()` en `resellerSubscription.ts` y `refunds.ts`, registrada en `idempotency_keys` |
| 5 — Cuerpo crudo | `await request.text()` + `export const runtime = 'nodejs'`. No hay ni un `request.json()` en la ruta |
| 6 — Sin PII en logs | `logEvent()` solo escribe `event.id`, `event.type`, `event.created`. Los errores loguean el código, nunca el objeto de Stripe |
| 7 — Sin pisar webhooks | No existía ninguno de pagos; verificado con un `find` antes de escribir |
| 8 — Solo llaves de prueba | `.env.example` solo trae `sk_test_` / `pk_test_` / `whsec_` |
| 9 — Anti-replay | Ventana de 300 s **y** deduplicación por `event.id` en `webhook_events_processed` |
| 10 — Límite de cuerpo | 256 KB, revisado por `Content-Length` y otra vez sobre los bytes reales |
| 11 — PII mínima | El cliente de Stripe lleva nombre, correo y el id del vendedor. Sin dirección, sin RFC, sin teléfono |
| 12 — Nada de PAN/CVV | No hay columna para eso y no la habrá. La tarjeta se captura en el iframe de Stripe; aquí solo viven marca, últimos 4 y vencimiento |

### Sobre `timingSafeEqual`

`lib/payments/webhookSignature.ts` calcula el HMAC-SHA256 sobre
`${timestamp}.${cuerpo_crudo}` con el **secreto de webhook** (`whsec_`, nunca la
llave de API) y compara en tiempo constante. La comprobación de longitud previa
no filtra nada: el largo de un digest hex de SHA-256 es público (64 caracteres);
lo que no debe filtrarse es **dónde** divergen dos digests del mismo largo, y de
eso se encarga `timingSafeEqual`.

La ventana de tiempo se revisa **antes** del HMAC, porque la firma de una
petición reenviada es genuinamente válida — el reloj es lo único que la detiene.

### `network_transaction_id`

Se guarda en `reseller_payment_methods.network_transaction_id` desde el evento
`charge.succeeded` (que es cuando existe: no hay trace id antes de que un cargo
real liquide). Las redes exigen el trace id de la transacción original en cada
cargo posterior iniciado por el comercio — que es lo que es una renovación.
Mastercard lo vuelve obligatorio para MIT económicamente relacionadas desde el
**23 de octubre de 2026**, y Visa ya castiga las MIT sin vínculo. Stripe lo
adjunta solo mientras tiene el mandato; guardarlo es lo que permite probar (y
portar) la cadena si algún día la tarjeta se migra.

## Tarjetas de prueba

| Caso | Tarjeta |
|---|---|
| Éxito | 4242 4242 4242 4242 |
| Rechazada | 4000 0000 0000 0002 |
| Fondos insuficientes | 4000 0000 0000 9995 |
| Pide 3-D Secure | 4000 0025 0000 3155 |

Cualquier fecha futura y cualquier CVC. **Estos números son de prueba de Stripe y
no existen fuera de su sandbox** — no hay ningún dato de tarjeta real en este
repositorio.

## Siguientes pasos

1. Corre `db/018_reseller_subscriptions.sql` en el SQL Editor de Supabase
   (requiere `db/016` y, si aplica, `db/017` ya corridas).
2. Pon las llaves de prueba en `.env.local` — mira `.env.example`.
3. Crea el endpoint de webhook en el dashboard de Stripe **en modo prueba**,
   apuntando a `/api/webhooks/stripe`, y copia el `whsec_` a `.env.local`.
   En local puedes usar `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
4. Corre `/pagokit:test` para mandar un evento firmado de prueba al webhook.
5. Cuando el sandbox pase, lee **`PAGOKIT_PRODUCTION_CHECKLIST.md`** antes de
   tocar una llave live.

## Referencias

- Documentación de Stripe: <https://stripe.com/docs>
- Reglas de seguridad de PagoKit:
  `~/.claude/skills/pagokit/skills/payment-advisor/SECURITY_RULES.md`

---

## Obligaciones legales en México (Regla 11)

No son opcionales y no las resuelve el código:

- **LFPDPPP** — el Aviso de Privacidad ya estaba pendiente en `CLAUDE.md`. Esta
  integración agrega tratamiento de datos de pago de los vendedores (nombre,
  correo, metadatos de tarjeta), así que el aviso tiene que mencionarlo y nombrar
  a Stripe como encargado.
- **CFDI 4.0** — Stripe **no es merchant of record**: el vendedor es bicho, así
  que **bicho tiene que emitir el CFDI de cada cobro a cada vendedor**. Esta
  integración no emite ninguno: no hay nada conectado a un PAC. En México emitir
  el comprobante es una obligación que nace con la venta, no un trámite contable
  posterior, así que hay que resolverlo antes de cobrarle a alguien de verdad
  (Facturama o Facturapi se conectan al mismo handler que marca la factura
  pagada). Está como punto bloqueante en el checklist de producción.
- Los vendedores son personas físicas con actividad empresarial o morales; hace
  falta guardar su RFC y sus datos fiscales para poder facturarles. **Hoy no se
  guardan** (Regla 11: se recoge el mínimo). Agregar esas columnas es una
  decisión consciente que conviene tomar junto con el CFDI, no antes.

_Información verificada contra el catálogo de PagoKit con `last_verified_at:
2026-05-20`. Tarifas, disponibilidad de productos y versiones de API pueden haber
cambiado._
