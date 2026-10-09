-- ============================================================
-- 036 · Una cotización, una factura
--
-- Pasó de verdad mientras se probaba: la misma cotización se timbró dos
-- veces y salieron dos CFDI idénticos. En modo prueba da igual; en
-- producción son dos comprobantes fiscales reales por una sola venta, y
-- deshacerlo no es borrar una fila — es cancelar ante el SAT con su
-- motivo, y si ya se la mandaste al cliente, explicárselo.
--
-- Comprobar en la aplicación "¿ya tiene factura?" antes de timbrar NO
-- alcanza: entre la lectura y la escritura caben dos clics, y el segundo
-- lee lo mismo que el primero. Es exactamente la condición de carrera
-- que `bookings` resuelve con su exclude constraint, y se resuelve igual
-- — en el motor.
--
-- QUÉ ESTADOS OCUPAN EL LUGAR, Y POR QUÉ:
--
--   draft    SÍ — es la reserva del turno. Se inserta ANTES de llamar a
--                 Facturapi, así que la segunda llamada choca aquí y
--                 nunca llega a timbrar.
--   stamped  SÍ — la factura buena. Es el invariante de verdad.
--   error    NO — el intento falló y no existe CFDI. Hay que poder
--                 reintentar; si ocupara el lugar, un error de red
--                 dejaría la cotización sin poder facturarse nunca.
--   cancelled NO — se canceló ante el SAT y la venta puede volver a
--                 facturarse. Bloquearlo obligaría a inventar una
--                 cotización nueva para refacturar.
-- ============================================================

create unique index if not exists invoices_one_per_quote
  on invoices (quote_id)
  where quote_id is not null and status in ('draft', 'stamped');

comment on index invoices_one_per_quote is
  'Impide dos CFDI por la misma cotización. draft ocupa el lugar porque se inserta antes de llamar al PAC: ahí es donde se corta la condición de carrera.';
