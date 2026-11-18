# lib/anticipos — núcleo del bot de citas con anticipo

Migración: `db/061_anticipos.sql` (Bruno la corre a mano). Todo tolera que
no esté corrida: sin columnas = anticipo apagado = cita confirmada directo.

## Estados de una cita (`bookings`)
| Situación | status | deposit_status | otros |
|---|---|---|---|
| Sin anticipo (hoy) | confirmed | null | |
| Apartada esperando pago | confirmed | pending | hold_expires_at, deposit_mxn |
| Anticipo pagado | confirmed | paid | deposit_paid_at, deposit_payment_id |
| Perdonado por el negocio | confirmed | waived | |
| Venció sin pagar | cancelled | released | |

Un apartado sigue bloqueando el horario (exclude constraint y
`get_available_slots` filtran `status <> 'cancelled'`). No se agregó un
status nuevo a propósito. Banderas para crons (se ponen en el mismo
update que filtra `is null`): `reminder_24h_sent_at`, `reminder_2h_sent_at`,
`followup_sent_at`, `customer_confirmed_at`.

## Regla de montos (`montoAnticipo`)
Anticipo apagado → 0. `service_types.deposit_mxn` no null → ese (0 = sin
anticipo). null → `tenants.anticipo_mxn` (o 0). Se pide si es > 0.

## Config (columnas en `tenants`, lectura pública: nada secreto)
`anticipo_enabled`, `anticipo_mxn`, `anticipo_apartado_min` (5..120, def 15),
`anticipo_reagendar_horas` (def 24), `anticipo_politica` (≤500).

## Funciones (importa del archivo; todas filtran por tenant_id)
- `config.ts` — `leerConfigAnticipo(db, tenantId): ConfigAnticipo`,
  `montoAnticipo(config, servicio)`, `mpConnectHabilitado()`
  (`MP_CONNECT_ENABLED === '1'`), `faltaMigracion(error)`.
- `apartar.ts` — `apartarCita(db, tenantId, input, ahora?)` con el mismo
  `input` que `crearReserva`. Devuelve `{ ok, bookingId, serviceName,
  requiereAnticipo, montoMxn, venceEn }` o `{ ok:false, status, error }`.
  No manda avisos: si `requiereAnticipo`, manda el link de pago y NO la
  confirmación de cita (esa va al confirmar el pago).
- `liberar.ts` — `liberarApartadosVencidos(db, now?, tenantId?)` →
  `[{ id, tenantId, telefono, nombre, servicio, startsAt }]`. Idempotente y
  barata (índice parcial). Llámala en el cron diario, en el webhook de
  WhatsApp y antes de calcular disponibilidad. No avisa: avisa tú.
- `confirmar.ts` — `confirmarAnticipo(db, { tenantId, bookingId, paymentId,
  montoMxn })` → `{ ok:true, yaEstaba }` o `{ ok:false, motivo }` con motivo
  `no_encontrada | liberada | sin_anticipo | monto_insuficiente | error`.
  Pago con el apartado vencido pero no barrido: se acepta. `liberada`: el
  dinero ya está en la cuenta del negocio; avisa al negocio para que lo
  devuelva o reagende a mano.
- `reagendar.ts` — `puedeReagendar(cita, config, now?)` → `{ puede, limite,
  limiteTexto, politica }`; `reagendarConservandoAnticipo(db, { tenantId,
  slug, bookingId, newStartsAt, newEndsAt }, now?)` mueve LA MISMA fila vía
  `rescheduleBooking` (el anticipo se queda ligado). El plazo solo aplica a
  citas pending/paid; fuera de plazo → `motivo: 'fuera_de_plazo'` (pasa a humano).
- `pago.ts` — `ProveedorPago` (interfaz) y `obtenerLinkAnticipo(db, input,
  proveedor?)`: null sin flag, sin `tenant_mp_connections`, sin proveedor o
  si falla. Con null el bot dice que el negocio le compartirá cómo pagar.
  Fase 2: implementar `ProveedorPago` en `lib/payments/mpConnect*.ts` y
  ponerlo como default de `proveedor`.

## Fase 2 (solo service_role, RLS sin policies)
`tenant_mp_connections` (tokens cifrados; el panel lee "conectado" con
service_role tras verificar membresía), `mp_anticipo_events` (dedup del
webhook por event_id), `mp_oauth_states` (state de un solo uso; rechaza >10 min).

Tests: `anticipos.test.ts` (usa `lib/whatsapp/agente/fakeDb.ts`, que ganó
`sinColumnas` para simular la migración ausente).
