# Checklist de producción — Stripe (cobro a vendedores)

PagoKit te dejó listo el **modo prueba**. El paso a live es manual a propósito:
es el único momento en que un error cuesta dinero real de alguien más.

No avances hasta que el sandbox pase completo (`/pagokit:test` + una tarjeta de
prueba de punta a punta).

---

## 0. Bloqueantes antes de cobrarle a alguien de verdad

Estos no son detalles de configuración. Si sales a producción sin resolverlos,
estás incumpliendo o cobrando a ciegas.

- [ ] **CFDI 4.0.** Stripe **no** es merchant of record: el vendedor eres tú, así
      que cada cobro a un vendedor necesita su comprobante fiscal. Esta
      integración **no emite ninguno**. Tres salidas, elige una y anótala:
      (a) conectar un PAC (Facturama, Facturapi) al mismo handler que marca la
      factura como pagada — `handleInvoicePaid` en
      `app/api/webhooks/stripe/route.ts`; (b) emitirlos a mano mientras sean
      pocos vendedores, con un recordatorio real; (c) cambiar a un modelo donde
      otro sea el vendedor legal.
- [ ] **Datos fiscales de los vendedores.** Hoy no se guarda RFC ni régimen ni
      uso de CFDI (Regla 11: solo se recoge lo mínimo). Sin eso no puedes
      facturar. Decídelo junto con el punto anterior, no por separado.
- [ ] **Aviso de Privacidad (LFPDPPP)** actualizado: ahora tratas datos de pago
      de tus vendedores y Stripe es tu encargado del tratamiento.
- [ ] **Precio mayorista real.** `resellers.wholesale_price_mxn` sigue sin un
      valor definido. Con 0, Stripe cobra $0 y la suscripción «funciona» sin
      cobrar nada — falla silenciosa perfecta. Pon el precio de cada vendedor en
      `/admin/vendedores` **antes** de que guarden tarjeta.
- [ ] `db/018_reseller_subscriptions.sql` corrida en Supabase **producción**, no
      solo en la base de desarrollo.

---

## 1. Cambiar llaves de prueba por llaves live

- [ ] En el dashboard de Stripe, activa la cuenta (activación live tarda 1–7
      días) y cambia el switch a **modo live**.
- [ ] Genera las llaves live. **Nunca las pongas en `.env.example` ni en ningún
      archivo del repo** — van al almacén de secretos de Vercel.
- [ ] `STRIPE_SECRET_KEY` → el valor `sk_live_…`.
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → el valor `pk_live_…`.
- [ ] `STRIPE_WEBHOOK_SECRET` → **se regenera**. Cada endpoint de webhook que
      creas tiene su propio `whsec_`, así que el de live NO es el de prueba.
      Copiarlo del sandbox hace que todos los eventos se vean falsificados y el
      webhook responda 400 a todo, en silencio.

## 2. Configurar el webhook en el dashboard live

- [ ] Crea un endpoint nuevo apuntando a:

      https://reservas-saas-sigma.vercel.app/api/webhooks/stripe

      (Si algún día compras dominio, cámbialo ahí mismo. No uses un subdominio:
      `proxy.ts` excluye `/api` del rewrite a propósito y `*.vercel.app` no tiene
      certificado para subdominios arbitrarios.)
- [ ] Suscríbelo exactamente a estos 14 eventos (la lista completa está en
      `PAGOKIT_INTEGRATION.md`):

      customer.subscription.created
      customer.subscription.updated
      customer.subscription.deleted
      invoice.paid
      invoice.payment_failed
      charge.succeeded
      charge.refunded
      charge.dispute.created
      setup_intent.succeeded
      payment_method.attached
      payment_method.automatically_updated
      payment_method.detached
      payment_intent.succeeded
      payment_intent.payment_failed

- [ ] Copia el `whsec_` nuevo a los secretos de Vercel.
- [ ] Manda un evento de prueba desde el dashboard y confirma un **200** en el
      log de Stripe. Un 400 = secreto equivocado; un 500 = falta la variable o la
      migración no está corrida.

## 3. Secretos en Vercel

```bash
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
```

- [ ] `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` marcados como **Secret** (no
      Plain), igual que ya está `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` sí lleva el prefijo `NEXT_PUBLIC_`:
      Stripe Elements la necesita en el navegador y es publicable por diseño.
      Ninguna de las otras dos debe llevar ese prefijo jamás.
- [ ] Redeploy después de agregarlas (las variables no se recargan en caliente).
- [ ] `RESEND_API_KEY` cargada, o asume que **nadie se entera** de que le falló el
      cobro hasta que entra al panel.

## 4. Apple Pay / Google Pay

No aplica: esta integración es **solo tarjeta**
(`payment_method_types: ['card']` en el SetupIntent). Si algún día los agregas:

- [ ] Valida el dominio de producción en el dashboard de Stripe.
- [ ] Pruébalo en un dispositivo real — el sandbox no ejercita Apple Pay.

## 5. Impuestos y facturación

- [ ] Stripe Tax es opcional aquí y **no sustituye al CFDI** (punto 0). Si lo
      activas, agrega tus identificadores fiscales en el dashboard.
- [ ] Decide cómo tratas el IVA: `wholesale_price_mxn` hoy no dice si incluye IVA
      o no. Lo que se le cobra al vendedor es ese número tal cual × la cantidad.
      Escríbelo en el contrato con el vendedor antes del primer cobro.

## 6. Prueba final de humo (con dinero real)

Con un vendedor real, o uno de prueba con precio mayorista de $1:

- [ ] Guarda una tarjeta real desde `/vendedor/suscripcion`. Confirma que
      **no se cobró nada** en ese momento (así está diseñado: el cargo cae en el
      día de corte).
- [ ] Confirma en Stripe que la suscripción quedó con la `quantity` correcta y el
      `billing_cycle_anchor` en el día de corte del vendedor.
- [ ] Suspende uno de sus negocios desde `/admin/tenants/[id]` y confirma que la
      cantidad en Stripe bajó, **sin** generar un cargo inmediato (debe aparecer
      como línea de prorrateo pendiente para la siguiente factura).
- [ ] Reactívalo y confirma que vuelve a subir.
- [ ] Fuerza un cobro con un reloj de prueba de Stripe (Test Clock) o espera al
      corte, y confirma que llegó `invoice.paid`, que hay fila en
      `reseller_charges` y que el monto es
      `negocios_activos × wholesale_price_mxn` en pesos.
- [ ] Haz un reembolso desde el panel interno y confirma que llegó
      `charge.refunded` y que `amount_refunded_cents` cuadra.
- [ ] Prueba el camino de mora: tarjeta `4000 0000 0000 0341` (falla al cobrar
      después de guardarse) → confirma banda roja en el panel, correo de dunning,
      y que cambiar la tarjeta reintenta el cobro pendiente al instante.

## 7. Monitoreo

- [ ] Alerta en el dashboard de Stripe para cargos fallidos y para disputas.
- [ ] Revisa los logs de Vercel de la ruta `/api/webhooks/stripe` durante las
      primeras 24 h. Busca `unhandled event type`: si aparece algo seguido,
      agrégale un `case` explícito en vez de dejarlo en el `default`.
- [ ] Revisa `idempotency_keys` con `status = 'failed'` cada tanto: es el
      registro de las llamadas a Stripe que no salieron.
- [ ] Revisa `reseller_subscriptions` con `past_due_since` viejo: son vendedores
      que llevan días sin pagar y que Stripe va a terminar cancelando.
- [ ] Poda `webhook_events_processed` de vez en cuando (Stripe reintenta hasta 3
      días; guardar ~30 días es de sobra). No es urgente ni afecta la corrección.

## 8. Lo que este proyecto ya sabe que se rompe

Escrito aquí porque ya pasó antes en este repositorio:

- [ ] **Nunca corras `npm run build` con el dev server activo** — corrompe
      `.next` y la app se sirve sin CSS.
- [ ] Después de cambiar variables de entorno en Vercel, **redeploy**.
- [ ] `npm run lint` sigue roto desde el upgrade a Next 16 (`next lint` ya no
      existe). No es de esta integración, pero el paso de lint del CI no pasa.

---

## Si algo sale mal, en orden

1. **Ningún evento llega** → revisa la URL del endpoint y que el deploy esté vivo.
2. **Todo responde 400** → `STRIPE_WEBHOOK_SECRET` equivocado (¿copiaste el de
   prueba?). El log dice `rejected signature reason=no_matching_signature`.
3. **Todo responde 500** → falta una variable, o `db/018` no está corrida en la
   base de producción. El log dice qué.
4. **La cantidad no cuadra** → botón «Volver a contar» en `/vendedor/suscripcion`,
   o `syncResellerSubscriptionQuantity(resellerId)`. Siempre recalcula desde la
   base; correrlo de más no hace daño.
5. **Un cobro se duplicó** → no debería: cada llamada lleva `Idempotency-Key` y
   los eventos se deduplican por `event.id`. Busca el evento en
   `webhook_events_processed` y la llamada en `idempotency_keys` antes de tocar
   nada en Stripe.
