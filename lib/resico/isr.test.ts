import { describe, expect, it } from 'vitest';
import { formatoTasa, isrMensualResico } from './isr';

describe('isrMensualResico', () => {
  it.each([
    // [ingresos en centavos, tasa bps, isr centavos]
    [0, 100, 0],
    [1_000_000, 100, 10_000], // $10,000 → 1% = $100
    [2_500_000, 100, 25_000], // $25,000.00 justo: sigue en 1%
    [2_500_001, 110, 27_500], // un centavo más: 1.1% sobre todo
    [5_000_000, 110, 55_000], // $50,000.00 → $550
    [5_000_001, 150, 75_000],
    [8_333_333, 150, 125_000], // $83,333.33 → $1,250.00 (redondeado)
    [8_333_334, 200, 166_667],
    [20_833_333, 200, 416_667], // $208,333.33 → $4,166.67
    [20_833_334, 250, 520_833],
    [350_000_000, 250, 8_750_000], // $3,500,000 → $87,500
  ])('%i centavos → %i bps, ISR %i', (ingresos, tasa, isr) => {
    expect(isrMensualResico(ingresos)).toEqual({ ok: true, tasaBps: tasa, isrCents: isr });
  });

  it('más de $3,500,000 en el mes ya no cabe en RESICO', () => {
    expect(isrMensualResico(350_000_001)).toEqual({ ok: false, motivo: 'excede' });
  });

  it('negativos cuentan como cero', () => {
    expect(isrMensualResico(-500)).toEqual({ ok: true, tasaBps: 100, isrCents: 0 });
  });
});

describe('formatoTasa', () => {
  it('dos decimales', () => {
    expect(formatoTasa(110)).toBe('1.10%');
    expect(formatoTasa(250)).toBe('2.50%');
  });
});
