// ISR mensual estimado en el Régimen Simplificado de Confianza (RESICO),
// personas físicas. Puro, sin base ni React, para probarlo (isr.test.ts).
//
// Fuente: Ley del ISR, art. 113-E (tabla mensual y límite anual),
// 113-F (anual en abril) y 113-G (obligaciones), texto de la Cámara de
// Diputados, última reforma DOF 01-04-2024:
//   https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
// Verificado el 11 nov 2026. Ojo: el Paquete Económico 2027 propone subir
// el límite a 5 millones (Gaceta Parlamentaria 8 sep 2026); al cierre de
// esta revisión no estaba publicado en el DOF. Si se publica, cambiar
// LIMITE_ANUAL_CENTS y REVISADO.
//
// La tasa NO es progresiva por tramos: la que toque se aplica a TODO el
// ingreso del mes (cobrado, con CFDI, sin IVA, sin deducciones).

export const REVISADO = 'noviembre 2026';

/** $3,500,000 al año (art. 113-E, primer párrafo). */
export const LIMITE_ANUAL_CENTS = 350_000_000;

/** Tabla mensual del art. 113-E: "hasta" (centavos, inclusive) → tasa en puntos base. */
export const TABLA_MENSUAL: { hastaCents: number; tasaBps: number }[] = [
  { hastaCents: 2_500_000, tasaBps: 100 }, //   25,000.00 → 1.00%
  { hastaCents: 5_000_000, tasaBps: 110 }, //   50,000.00 → 1.10%
  { hastaCents: 8_333_333, tasaBps: 150 }, //   83,333.33 → 1.50%
  { hastaCents: 20_833_333, tasaBps: 200 }, // 208,333.33 → 2.00%
  { hastaCents: 350_000_000, tasaBps: 250 }, // 3,500,000.00 → 2.50%
];

export type IsrResico =
  | { ok: true; tasaBps: number; isrCents: number }
  | { ok: false; motivo: 'excede' };

export function isrMensualResico(ingresosCents: number): IsrResico {
  const ingresos = Math.max(0, Math.round(ingresosCents));
  const tramo = TABLA_MENSUAL.find((t) => ingresos <= t.hastaCents);
  if (!tramo) return { ok: false, motivo: 'excede' };
  return { ok: true, tasaBps: tramo.tasaBps, isrCents: Math.round((ingresos * tramo.tasaBps) / 10_000) };
}

/** "1.10%" */
export function formatoTasa(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}
