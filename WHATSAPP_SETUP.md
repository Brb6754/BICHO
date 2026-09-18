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
