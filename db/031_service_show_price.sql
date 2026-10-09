-- ============================================================
-- 031 · Publicar el precio de un servicio, o no
--
-- Hasta hoy el precio era obligatorio y un servicio sin precio quedaba
-- en 0. El flujo público ya traducía ese 0 a «Sin costo», que está bien
-- para una primera consulta regalada — pero es una AFIRMACIÓN, y falsa
-- en el caso que de verdad abunda: el negocio que no publica precio
-- porque depende del caso, del largo del pelo o de la pieza.
--
-- «Gratis» y «no lo digo aquí» son dos cosas distintas y el 0 no puede
-- significar las dos. De ahí la columna.
--
--   show_price = true  + price_cents > 0  → «$450»
--   show_price = true  + price_cents = 0  → «Sin costo» (de verdad gratis)
--   show_price = false                    → no se muestra nada
--
-- Default TRUE: los servicios que ya existen siguen mostrando su precio
-- exactamente como hoy. Nadie se entera de esta migración hasta que
-- decide usarla.
-- ============================================================

alter table service_types
  add column if not exists show_price boolean not null default true;

comment on column service_types.show_price is
  'Si el precio aparece en la página pública. false = el negocio prefiere no publicarlo (cotiza aparte); no significa gratis — eso es show_price true con price_cents 0.';
