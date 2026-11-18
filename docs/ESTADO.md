# Estado de bicho — nota de traspaso (14 nov 2026)

## En producción (bichomx.com, master)
- Ola 2: Inventario, Comisiones, RESICO, Referidos (2dbcd21).
- 3 planes: Esencial $299 / Negocio $499 / Pro $799. Fuente única en `lib/billing/planes.ts`.
- Panel rediseñado "para señoras": un solo estilo claro sin modo oscuro, cobro desde la agenda, corte y "Ya le escribiste" en la base (874a4a9; `db/060_corte_y_contactos.sql` SIN correr, usa localStorage mientras tanto).
- Página de reservar con portada que colapsa al avanzar (modelo: lima-laca).
- Directorio y mapa en `/negocios` (requiere `db/055_directorio.sql`).
- Landing nueva + SEO con gráficos (f8c0341, 0a4ef3c):
  - `/para/*` (7 giros), `/funciones/*` (14), `/guias/*` (3).
  - sitemap y robots, OG, JSON-LD, Vercel Analytics (`cta_registro`, `alta_completada`).
- Search Console verificado y sitemap enviado. www → apex con 308 (Vercel).

- Dashboard móvil tipo app: tiles con colores de campaña (5dce738). Paleta en `lib/branding/moduloColores.ts`.
- UX del panel fase 1: auditoría, reglas y plan de 3 grupos en `docs/UX-PANEL.md`; primeros pasos, compartir link, toasts y menú por intención.
- Recepcionista IA por WhatsApp (919bf58), desplegada pero sin conectar:
  - Webhook: `/api/webhooks/whatsapp`.
  - Panel: `/dashboard/whatsapp`.
  - Migración `db/056` SIN correr.
  - Faltan: botón wa.me en reservar y la prueba real con el número (tope de mensajes y link en Sidebar ya hechos).
- Add-on Cotiza por WhatsApp (cotizar del catálogo, aceptar, facturar CFDI con constancia leída por Claude, seguimiento 48 h): migración `db/057` SIN correr, plantilla de seguimiento sin aprobar, precio por decidir ($1,499 propuesto), sin cobro (Mercado Pago por negocio = siguiente paso). Ver WHATSAPP_SETUP.md → "Cotiza".
- Bot de citas con anticipo por WhatsApp (18 nov): listas interactivas (servicio → especialista → día → hora), apartado de 15 min que se libera solo, recordatorios 24 h/2 h con Confirmo/Reagendar (plazo del negocio), seguimiento post-cita, panel Anticipos en `/dashboard/whatsapp` y demo `/panel/whatsapp`. Mercado Pago Connect (OAuth, el dinero va directo al negocio) listo para sandbox, apagado con `MP_CONNECT_ENABLED`. Migración `db/061_anticipos.sql` SIN correr; plantillas `WHATSAPP_TEMPLATE_RECORDATORIO/SEGUIMIENTO/APARTADO_VENCIDO` sin aprobar; cron `/api/cron/citas-whatsapp` diario (el de 2 h necesita cron externo cada 15 min). Ver WHATSAPP_SETUP.md §8–9.
- Add-on Boost de clientes (Negocio/Pro, $399/mes, 300 msj/mes): lista VIP de cancelaciones + horas flojas con descuento de 20 min, panel `/dashboard/boost`, demo `/panel/boost`, cron diario `/api/cron/boost`. Migración `db/058` SIN correr, plantillas `WHATSAPP_TEMPLATE_BOOST_VIP/FLOJAS` sin aprobar, sin cobro. Ver WHATSAPP_SETUP.md → "Boost".

## Pendiente de Bruno
- Correr `db/055_directorio.sql`.
- Google Business Profile y Bing Webmaster (importar desde Search Console).
- Chip para WhatsApp → `WHATSAPP_CONTACTO` en `lib/seo/sitio.ts` + Meta según `WHATSAPP_SETUP.md`.
- Sacar el RFC. Hacer la prueba sandbox de Mercado Pago antes del ~28 nov.
- **Decidir:**
  1. Cupo fundador: 20 para siempre vs 10 por 12 meses (la junta recomienda 10/12).
  2. Oferta única de entrada: "agenda lista hoy, 15 días gratis, $299, si no te sirvió no pagas".
  3. WhatsApp en frío: pausar o seguir.
  4. Garantía de devolución.
  5. Comisión de aliados.

## Bugs y huecos conocidos
- `planes.ts` dice "recordatorios por correo" en Esencial, pero el cron solo corre con `regresan` (Negocio).
- No está claro con qué plan arranca la prueba de 15 días.
- La landing promete "te mandamos tus datos" y no existe exportación.
- La miniatura de recordatorios parece WhatsApp, que todavía no está conectado.
- Falta `public/demo/burbujas-bigotes.webp`.
- `MENSAJES.md` y la nota del vault tienen precios viejos ($300).
- Dev server :3005 roto (Turbopack + next/font Archivo). Para revisar, usar worktree + `next dev --webpack`.

## Ventas y marketing (en `redes/`)
- `ventas-fin-de-semana/PLAYBOOK-INGENIERO.md`: embudo, oferta, competencia, guion, experimentos.
- `ventas-fin-de-semana/{ventas,marketing,finanzas}/`: kit completo.
- `facebook-campana/v2/`:
  - `PROMPTS.md`: 8 posts del 16 al 29 nov.
  - `grupos.md`
  - `colores.md`: un color por servicio; reservas = morado + amarillo neón.
- Consejeros: `.claude/agents/consejero-*.md` + `redes/CONSEJEROS-REGLAS.md`.

## Ideas ofrecidas, sin arrancar
- "Reserva con bicho" en cada página de negocio (backlinks).
- Landings por ciudad.
- Más guías.
- Plantillas de WhatsApp.
- Actualizar la presentación: la lámina "viene" está vieja.
