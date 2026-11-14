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
