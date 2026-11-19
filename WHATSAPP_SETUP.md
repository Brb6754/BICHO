# WhatsApp: qué hay que hacer fuera del código

El extra ya está construido y se prende por negocio desde el panel. Lo
que falta es del lado de Meta, y nada de eso se puede automatizar desde
aquí.

Mientras falte, **no se rompe nada**: cada intento de envío queda
registrado en `whatsapp_messages` con `status = 'skipped'` y el motivo, y
la reserva se crea igual.

## 1. Cuenta y número

1. Meta Business Suite → verifica el negocio (te piden documentos; suele
   tardar días, no horas).
2. WhatsApp Manager → agrega un número emisor. **No puede ser un número
   que ya use la app de WhatsApp normal.**
3. API Setup → copia el **Phone number ID** (no el teléfono) →
   `WHATSAPP_PHONE_NUMBER_ID`.
4. Crea un **System User** con permiso sobre la cuenta de WhatsApp y
   genera un token permanente → `WHATSAPP_ACCESS_TOKEN`. El token que
   aparece en la primera pantalla dura 24 horas y no sirve para
   producción.

## 2. La plantilla

Una plantilla de utilidad, en español, con **cinco** variables en este
orden exacto — el código las manda posicionalmente, así que si cambias el
orden en Meta hay que cambiarlo en `lib/whatsapp/send.ts`:

| # | Contenido |
|---|---|
| `{{1}}` | Nombre del cliente |
| `{{2}}` | Nombre del negocio |
| `{{3}}` | Servicio |
| `{{4}}` | Cuándo, ya formateado ("Miércoles 23 de septiembre, 10:00") |
| `{{5}}` | Liga para ver/cambiar/cancelar la cita |

Ejemplo de cuerpo:

> Hola {{1}}, tu cita en {{2}} quedó agendada.
> {{3}} · {{4}}
> Puedes cambiarla o cancelarla aquí: {{5}}

Categoría: **Utility** (no Marketing — marketing cuesta ~3× más y se
rechaza para confirmaciones). El nombre que le pongas va en
`WHATSAPP_TEMPLATE_CONFIRMATION`.

## 3. Costo

Tarifa de utilidad en México: **MX$0.15–0.20 por mensaje**, sin descuento
por volumen a escala chica. Un negocio con 3–5 citas al día manda 150–260
mensajes al mes ≈ **MX$25–50**, y el doble si algún día se agregan
recordatorios.

Desde el **1 de octubre de 2026** Meta también cobra las plantillas de
utilidad enviadas dentro de la ventana de 24 h, que antes eran gratis.
Para este caso de uso casi no cambia nada: las confirmaciones salen
cuando el cliente no está chateando, así que ya se cobraban.

**No contrates un BSP** (Twilio, 360dialog, Gupshup) todavía: su cuota
mensual por número es de MX$500–1,000, más que todos los mensajes juntos.
Cloud API directo con Meta no tiene cuota fija.

## 4. Un número para todos, o uno por negocio

Hoy el código asume **un número de bicho para todos los negocios**: una
verificación, un set de plantillas, y el nombre del negocio viaja como
variable `{{2}}` dentro del mensaje.

Un número por negocio implica Embedded Signup, ser Tech Provider ante
Meta y una verificación por cliente. Solo vale la pena cuando alguien lo
pida y lo pague.

Ojo con el colchón gratis: los 1,000 mensajes de servicio gratis al mes
son **por número**, así que con un número compartido se reparte entre
todos los negocios.

## 5. Agente IA (recepcionista por WhatsApp)

Un agente con Claude Haiku (`claude-haiku-5-5`) contesta a los clientes,
ve servicios y horarios libres, agenda, consulta y cancela citas, y pasa
la plática a una persona cuando hace falta. Add-on del plan **Pro**: se
prende en el panel del negocio → `/dashboard/whatsapp`.

### Lo que hay que hacer

1. Correr `db/056_whatsapp_agente.sql` en el SQL Editor de Supabase.
2. Variables en Vercel (además de `WHATSAPP_ACCESS_TOKEN` y
   `WHATSAPP_PHONE_NUMBER_ID` de arriba):

   | Variable | De dónde sale |
   |---|---|
   | `WHATSAPP_VERIFY_TOKEN` | La inventas tú (cadena larga al azar). Se pega igual en Meta. |
   | `WHATSAPP_APP_SECRET` | App de Meta → Configuración → Básica → Clave secreta de la app. Con ella se verifica la firma `X-Hub-Signature-256` de cada webhook; sin ella se rechaza todo. |
   | `ANTHROPIC_API_KEY` | La misma que ya usa el Copiloto. |

3. Meta → tu app → WhatsApp → Configuración → Webhook:
   - URL de devolución de llamada: `https://bichomx.com/api/webhooks/whatsapp`
   - Token de verificación: el valor de `WHATSAPP_VERIFY_TOKEN`
   - Campos del webhook: suscribir **`messages`** (solo ese).
4. En el panel del negocio (plan Pro): "Prender recepcionista".

### Cómo sabe a qué negocio le escriben

- **Número de bicho (compartido):** el link de la página de reservas
  abre `wa.me/<número>?text=Hola%20<slug>`; ese primer mensaje elige el
  negocio. Los mensajes siguientes siguen con el mismo negocio (se
  recuerda la conversación). Si alguien escribe sin código y sin
  historia, se le pide el nombre del negocio.
- **Número propio de un negocio:** poner su Phone number ID en
  `tenants.whatsapp_phone_number_id` (a mano, por ahora). Todo lo que
  entre a ese número es de ese negocio. Usa el mismo
  `WHATSAPP_ACCESS_TOKEN`, así que el System User necesita permiso sobre
  ese número.

### La ventana de 24 horas

Las respuestas libres (lo que escribe el agente o el dueño desde el
panel) **solo se pueden mandar dentro de las 24 h** desde el último
mensaje del cliente. El agente siempre contesta a un mensaje recién
llegado, así que siempre está dentro. Para escribirle a alguien fuera de
esa ventana hacen falta plantillas aprobadas (sección 2); el panel
bloquea la respuesta manual pasadas las 24 h.

### Costo estimado por conversación — *supuesto, verificar*

- Claude Haiku 5.5: $0.10 USD / millón de tokens de entrada y $0.50 de
  salida. Una conversación típica de agendar (~6 mensajes del cliente,
  2–3 llamadas al modelo por mensaje, ~3k tokens de entrada por llamada)
  ≈ 55k de entrada + 2k de salida ≈ **US$0.007 (≈ MX$0.13)**. El
  razonamiento interno del modelo puede subirlo; revisar el uso real en
  la consola de Anthropic después de la primera semana.
- Meta: las respuestas dentro de una conversación que inició el cliente
  (mensajes de servicio) hoy no se cobran; las plantillas sí (sección 3).

### Qué hace y qué no

- Precios y horarios salen solo de las herramientas (catálogo y
  `get_available_slots`); horario de atención, dirección y FAQ salen de
  la página del negocio (`page_blocks`) si existen.
- Un teléfono solo ve y cancela **sus** citas, y solo las de ese negocio.
- Ve los últimos 10 mensajes y hace como máximo 6 vueltas de
  herramientas por mensaje. Si no puede, avisa y pasa a humano.
- En modo "humano" la IA no contesta; el dueño responde desde el panel.
- Solo lee texto (audios e imágenes reciben "solo leo texto").
- Logs: solo id, tipo y timestamp del mensaje, nunca el contenido.

## 6. Cotiza, cobra y factura por WhatsApp (add-on Pro)

Para negocios que cotizan (instalador solar, clínica, distribuidora). El
agente arma cotizaciones **solo** con el catálogo y precios del negocio
(servicios con precio visible + productos de inventario con precio); si
algo no está, pregunta o pasa a un humano. Nunca inventa precios.

### Lo que hay que hacer
1. Correr `db/057_cotiza_whatsapp.sql` en el SQL Editor (idempotente; requiere `db/056`).
2. El negocio necesita **número propio**: su Phone number ID en
   `tenants.whatsapp_phone_number_id`. En el número compartido de la
   plataforma Cotiza no corre (no se sabe de qué negocio es la cotización).
3. Plan Pro + Cotizaciones prendido; para facturar, además Facturación con
   su llave de Facturapi. Se prende en `/dashboard/whatsapp`.
4. Aprobar en Meta la plantilla de seguimiento (abajo) y poner su nombre en
   `WHATSAPP_TEMPLATE_SEGUIMIENTO_COTIZACION`. Sin ella el cron no manda nada.
5. `CRON_SECRET` ya existe (lo usa `/api/cron/recordatorios`); el cron nuevo
   `/api/cron/seguimiento-cotizaciones` corre diario 17:00 UTC (`vercel.json`).

### Plantilla sugerida (categoría UTILITY, es_MX) — *por aprobar*
Nombre: `seguimiento_cotizacion`

> Hola {{1}}, te escribimos de {{2}}. ¿Pudiste revisar la cotización {{3}}
> que te mandamos? Si tienes dudas o quieres ajustar algo, responde a este
> mensaje.

Una sola vez por cotización, a las 48 h sin respuesta (en la práctica
48–72 h porque el cron es diario); no se persiguen cotizaciones de más de 7 días.

### Facturación
- El cliente manda su Constancia de Situación Fiscal (PDF o foto) o sus datos.
  Claude (`claude-opus-5-5`, una llamada por constancia) extrae RFC, razón
  social, régimen, CP y uso de CFDI (G03 si no lo dice). Se validan formato de
  RFC, CP, régimen según persona física/moral y uso de CFDI.
- Se le enseñan los datos al cliente y **tiene que confirmarlos en otro
  mensaje** antes de timbrar (se impone en código, no en el prompt).
- "Confirmar facturas antes de timbrar" (prendido por defecto): la factura
  queda "por aprobar" y el dueño la timbra desde el panel.
- Respeta el tope de 100 timbres/mes. PDF y XML se mandan por WhatsApp; el
  XML va como `text/plain` con nombre `.xml` porque Meta no acepta
  `application/xml` como documento. Si el dueño aprueba pasadas 24 h del
  último mensaje del cliente, no se manda: se descarga en Facturas.
- Datos fiscales = PII: viven en `quotes.receptor_*` (solo service_role,
  leídos tras verificar membresía), nunca se loguean.

### Topes de mensajes (todo el agente)
Por teléfono: 20/hora y 60/día; por negocio: 400/día; archivos por teléfono:
5/día. Al pasar el tope se avisa una vez y luego se calla sin llamar a Claude.
Cortan spam y bucles bot-contra-bot sin estorbar a un cliente real (una
plática normal son 5–15 mensajes). Constantes en `lib/whatsapp/agente/tope.ts`.

### Pendiente de decidir (Bruno)
- **Notas de voz**: no hay proveedor de voz a texto. `lib/whatsapp/transcribir.ts`
  está apagado; hoy se responde "por ahora escríbeme tu mensaje".
- **Precio** del add-on: `PRECIO_COTIZA_WHATSAPP_MXN` en `lib/billing/planes.ts`
  (propuesta $1,499/mes). No está en la landing ni se cobra todavía.
- **Cobro** por WhatsApp: no implementado; necesita la cuenta de Mercado Pago de cada negocio.

## 7. Boost de clientes (add-on de Negocio y Pro)

Llena huecos de la agenda con clientas que el negocio ya tiene. $399/mes,
tope de **300 mensajes al mes por negocio** (`PRECIO_BOOST_MXN` y
`TOPE_BOOST_MENSAJES_MES` en `lib/billing/planes.ts`). El cobro todavía no
está conectado a Mercado Pago. Se prende en `/dashboard/boost`.

- **Lista VIP de cancelaciones:** la clienta se apunta en la página de
  reservas ("Avísame si se libera algo") con su teléfono, días, franjas y
  la casilla de permiso (obligatoria). Cuando se cancela una cita (panel,
  link de la clienta o recepcionista), se avisa hasta a 3 compatibles, sin
  descuento. La primera que aparta se lo queda; a la segunda se le dice que
  ya lo ganaron (el exclusion constraint de `bookings` evita la cita doble).
- **Horas flojas:** el cron `/api/cron/boost` (diario, 18:00 UTC = 12:00
  CDMX) busca huecos libres en las próximas horas y se los ofrece con el
  descuento máximo del negocio a clientas con historial en esa franja que
  aceptaron promociones. El descuento vale 20 minutos (fila en
  `boost_ofertas` con `expira_at`, validada en el servidor); después el
  link cobra precio normal. Máximo una promoción por clienta cada 7 días.
- **Baja:** si la clienta responde "BAJA" (o "stop", "alto", "no más
  promociones"…) al webhook, se marca `baja_at` y se le confirma. Al número
  propio de un negocio: baja de ese negocio; al número de la plataforma:
  de todos (pidió que ese número deje de escribirle).

### Lo que hay que hacer
1. Correr `db/058_boost.sql` en el SQL Editor (idempotente).
2. Aprobar en Meta las dos plantillas de abajo y poner sus nombres en
   `WHATSAPP_TEMPLATE_BOOST_VIP` y `WHATSAPP_TEMPLATE_BOOST_FLOJAS`.
   Sin ellas no se manda nada: queda `skipped` en `boost_mensajes` y no
   gasta el tope.
3. `CRON_SECRET` ya existe. El plan Hobby de Vercel solo deja crons
   diarios: por eso horas flojas corre una vez al día. Con Vercel Pro se
   puede subir a cada hora (`"0 * * * *"`) sin tocar código.

### Plantilla VIP (categoría UTILITY, es_MX) — *por aprobar*
Nombre sugerido: `boost_hueco_libre`

| # | Contenido |
|---|---|
| `{{1}}` | Nombre de la clienta |
| `{{2}}` | Negocio |
| `{{3}}` | Servicio |
| `{{4}}` | Cuándo ("Martes 17 de noviembre, 16:00") |
| `{{5}}` | Link para apartar |

> Hola {{1}}, se liberó un horario en {{2}}: {{3}} el {{4}}. Si lo quieres,
> apártalo aquí: {{5}}
> Te escribimos porque pediste que te avisáramos. Responde BAJA para no recibir más avisos.

### Plantilla horas flojas (categoría MARKETING, es_MX) — *por aprobar*
Nombre sugerido: `boost_hora_floja`

| # | Contenido |
|---|---|
| `{{1}}` | Nombre |
| `{{2}}` | Negocio |
| `{{3}}` | Servicio |
| `{{4}}` | Cuándo |
| `{{5}}` | Descuento ("15%") |
| `{{6}}` | Minutos que vale ("20") |
| `{{7}}` | Link |

> Hola {{1}}, en {{2}} tenemos libre {{3}} el {{4}} con {{5}} de descuento
> si lo apartas en los próximos {{6}} minutos: {{7}}
> Responde BAJA para no recibir promociones.

Costo estimado (lo que enseña el panel, marcado como estimación): MX$0.20
por aviso de utilidad y MX$0.60 por promoción de marketing (≈3× utilidad,
sección 3). Verificar contra el cobro real de Meta.

## 8. Bot de citas con anticipo

Va sobre la recepcionista (sección 5): mismo switch, mismo plan Pro, mismo
webhook. Núcleo en `lib/anticipos/` (README ahí); necesita
`db/061_anticipos.sql` corrida. Sin ella todo funciona como antes: la cita
se confirma directo y el cron responde `ok:false` con el motivo.

### Qué hace
- **Agendar con botones, sin pasar por Claude.** Entra cuando el cliente
  escribe algo corto como "quiero una cita", "agendar" o "reservar"
  (`quiereAgendar` en `lib/whatsapp/agente/flujoCita.ts`; si menciona
  cancelar, cambiar, precio… va a la IA), o cuando la IA usa la
  herramienta `mostrar_menu_citas`. Pasos con listas: servicio →
  especialista (se salta si hay uno solo; ofrece "Cualquiera disponible")
  → día (próximos 14 con huecos) → hora (disponibilidad real,
  `get_available_slots`). Cada opción lleva en su id lo ya elegido
  (`c|s=…|r=…|d=…`): el id se valida con una gramática cerrada y todo se
  vuelve a checar contra la base al apartar (servicio y recurso de ESTE
  negocio, hueco libre). El nombre sale del perfil de WhatsApp; si no
  viene, se le pregunta.
- **Anticipo.** Si el servicio lo pide, la cita queda apartada
  (`apartarCita`): se le dice el monto, que el horario queda apartado N
  minutos y el link de pago si `obtenerLinkAnticipo` da uno; si no, que el
  negocio le compartirá cómo pagar. Sin anticipo, confirmada como siempre.
  La herramienta `crear_cita` de la IA hace lo mismo.
- **Apartados vencidos.** Se liberan en cada mensaje entrante del negocio
  (barrido perezoso) y en el cron; al cliente le llega un botón "Buscar
  otro horario" (interactivo si está dentro de las 24 h; si Meta lo
  rechaza, la plantilla de abajo).
- **Recordatorios** a 24 h y a 2 h con botones Confirmo / Reagendar, y un
  **seguimiento** después de la cita con "Agendar otra" (uno por clienta;
  no si ya tiene otra cita o ya recibió uno en 30 días). No se recuerdan
  apartados sin pagar. Si "Clientas que regresan" ya mandó su
  recordatorio (`reminder_sent_at`), no sale el de 24 h, y al revés.
- **Confirmo** marca `customer_confirmed_at`. **Reagendar** ofrece días y
  horas del mismo recurso y mueve LA MISMA cita (conserva el anticipo).
  Fuera del plazo del negocio (`anticipo_reagendar_horas`) le explica la
  política con el límite en hora local y pasa la conversación a humano.

### Lo que hay que hacer
1. Correr `db/061_anticipos.sql` en el SQL Editor (idempotente).
2. Aprobar en Meta las tres plantillas de abajo y poner sus nombres en
   las variables de entorno. Sin el nombre no se manda nada: queda
   `skipped` con el motivo en `whatsapp_messages`.
3. El cron `/api/cron/citas-whatsapp` está en `vercel.json` una vez al
   día (Hobby solo deja diarios). Con eso salen el de 24 h, el
   seguimiento y la liberación diaria, pero **el de 2 h casi nunca cae a
   tiempo**. Para eso hay que llamarlo cada 15 minutos desde un cron
   externo (por ejemplo cron-job.org), `GET` a
   `https://<dominio>/api/cron/citas-whatsapp` con el header
   `Authorization: Bearer <CRON_SECRET>`, o pasar a Vercel Pro y cambiar el
   schedule a `"*/15 * * * *"`. Es idempotente: cada envío se marca antes
   de mandarse, así que llamarlo de más no duplica mensajes.

### Variables de entorno nuevas
| Variable | Para qué |
|---|---|
| `WHATSAPP_TEMPLATE_RECORDATORIO` | Recordatorio 24 h y 2 h |
| `WHATSAPP_TEMPLATE_SEGUIMIENTO` | Después de la cita |
| `WHATSAPP_TEMPLATE_APARTADO_VENCIDO` | Aviso de apartado liberado fuera de la ventana de 24 h |

Las tres usan `WHATSAPP_TEMPLATE_LANG` (default `es_MX`). Los botones son
de **respuesta rápida**: su texto vive en Meta y el código pone el
payload por índice, así que el ORDEN de los botones importa.

### Plantilla recordatorio (UTILITY, es_MX) — *por aprobar*
Nombre sugerido: `recordatorio_cita`

| # | Contenido |
|---|---|
| `{{1}}` | Primer nombre del cliente |
| `{{2}}` | Negocio |
| `{{3}}` | Servicio |
| `{{4}}` | Cuándo ("Jueves 19 de noviembre, 12:00") |

> Hola {{1}}, te recordamos tu cita en {{2}}: {{3}} el {{4}}. ¿Nos confirmas?

Botones (en este orden): 1. `Confirmo` · 2. `Reagendar`

### Plantilla seguimiento (UTILITY, es_MX) — *por aprobar*
Nombre sugerido: `seguimiento_cita`

| # | Contenido |
|---|---|
| `{{1}}` | Primer nombre |
| `{{2}}` | Negocio |
| `{{3}}` | Servicio |

> Hola {{1}}, gracias por venir a {{2}} por tu {{3}}. Cuando quieras tu
> próxima cita, la agendas aquí mismo.

Botón: 1. `Agendar otra`

Ojo: Meta puede clasificar este texto como MARKETING si suena a
promoción; si lo reclasifica, el cobro es el de marketing (sección 3).

### Plantilla apartado vencido (UTILITY, es_MX) — *por aprobar*
Nombre sugerido: `apartado_vencido`

| # | Contenido |
|---|---|
| `{{1}}` | Primer nombre |
| `{{2}}` | Negocio |
| `{{3}}` | Servicio |
| `{{4}}` | Cuándo era |

> Hola {{1}}, el horario que te apartamos en {{2}} ({{3}}, {{4}}) se liberó
> porque no se recibió el anticipo a tiempo. ¿Quieres buscar otro?

Botón: 1. `Buscar otro horario`

## 9. Mercado Pago Connect (anticipos)

El bot de citas puede pedir un anticipo para apartar el horario (db/061).
Con Connect, el link de pago es una preferencia de Checkout Pro creada con
la cuenta de Mercado Pago **del negocio**: el dinero cae directo en su
cuenta, bicho no lo retiene, no lo reparte y no cobra comisión
(sin `marketplace_fee`). Sin esto, el bot dice que el negocio le
compartirá cómo pagar y el anticipo se marca a mano.

**Estado:** listo para sandbox y apagado. Solo se enciende con
`MP_CONNECT_ENABLED=1`; producción además necesita `MP_CONNECT_LIVE=1`
(y el RFC + la app aprobada en Mercado Pago).

### Alta de la app (una sola vez)

1. mercadopago.com.mx/developers → **Tus integraciones → Crear aplicación**.
   Es una app aparte de la del plan mensual (sección de suscripciones):
   otras credenciales y otro secreto de webhook.
2. Tipo de integración: pagos online con **Checkout Pro**, y activar
   **OAuth / cobrar en nombre de terceros** (modelo marketplace). No se
   configura comisión.
3. **URL de redireccionamiento**: `https://<dominio raíz>/api/mercadopago/oauth/callback`.
   Tiene que ser idéntica a `MP_CONNECT_REDIRECT_URI` (MP compara exacto).
4. **Webhooks**: URL `https://<dominio raíz>/api/webhooks/mercadopago-anticipos`,
   evento **Pagos** (`payment`). Copia la **clave secreta** a
   `MP_CONNECT_WEBHOOK_SECRET`. Igual cada preferencia manda su propia
   `notification_url` a esa misma ruta.
5. Credenciales → `MP_CONNECT_CLIENT_ID` y `MP_CONNECT_CLIENT_SECRET`.
6. Llave de cifrado de los tokens (guárdala: si se pierde, cada negocio
   tiene que volver a conectar):
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   → `MP_TOKEN_ENC_KEY`.
7. Todo va en Vercel → Settings → Environment Variables (server-only).

### Cómo funciona

- **Conectar**: desde el panel, `GET /api/mercadopago/oauth/start?slug=<slug>`
  (exige sesión y membresía del negocio). Crea un `state` de un solo uso en
  `mp_oauth_states` y manda al dueño a `auth.mercadopago.com/authorization`.
  El callback valida el `state` (existe, < 10 min, se borra al usarlo),
  cambia el `code` por tokens y los guarda **cifrados** (AES-256-GCM) en
  `tenant_mp_connections`. Regresa a `/dashboard/anticipos?mp=ok|error`.
- **Desconectar**: `POST /api/mercadopago/oauth/disconnect` (form con `slug`,
  mismo origen). Borra la conexión; el permiso en MP lo quita el dueño
  desde su cuenta (no hay endpoint de revocación documentado).
- **Tokens**: el access token dura 180 días; se refresca 7 días antes de
  vencer. El refresh token es de un solo uso y se reemplaza en cada refresh.
- **Webhook**: verifica `x-signature` (HMAC-SHA256 sobre
  `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, ventana de 5 min) antes
  de parsear, **vuelve a consultar el pago** con el token del negocio, exige
  que `external_reference` (`<tenant>:<cita>`) sea de ese negocio, `approved`,
  MXN y monto ≥ anticipo; deduplica por id de evento en `mp_anticipo_events`
  y confirma con `confirmarAnticipo`. Manda el comprobante por WhatsApp
  (texto libre: entra en la ventana de 24 h porque el cliente acaba de
  chatear). Si el apartado ya se había liberado, le avisa con honestidad
  que el negocio lo contactará para reagendar o devolver el dinero.

### Sandbox

1. En Tus integraciones → **Cuentas de prueba**, crea dos usuarios de
   prueba: un **vendedor** (hace de negocio) y un **comprador**.
2. Inicia sesión con el vendedor de prueba y conecta desde el panel del
   negocio de prueba (`MP_CONNECT_LIVE` vacío → `test_token=true`).
3. Agenda por WhatsApp un servicio con anticipo; el link es
   `sandbox_init_point`. Paga con el comprador de prueba y las tarjetas de
   prueba de MP (titular `APRO` = aprobado, `OTHE` = rechazado).
4. Revisa en Vercel los logs `[mp-anticipos]` (solo id/tipo/fecha, nunca el
   payload) y que la cita quede `deposit_status = 'paid'`.

### Nivel de integración y riesgos

- Revisado con la documentación oficial de OAuth (URL de autorización,
  `POST /oauth/token` con `authorization_code`/`refresh_token`, vigencia de
  180 días). El catálogo de PagoKit no estaba disponible al construirlo, así
  que se trata como nivel **"advise"**: el esquema de firma de MP firma
  metadatos (id, request-id, ts), **no el cuerpo**, así que la defensa
  principal es **re-consultar el pago + validar la referencia + dedup**; la
  firma es una capa extra.
- PKCE no se usa (MP lo soporta si se activa en la app; quedó como TODO en
  `lib/payments/mpConnect.ts`).
- El vendedor se resuelve por el `user_id` del evento; una notificación sin
  `user_id` se ignora.
