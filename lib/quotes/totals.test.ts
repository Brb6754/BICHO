import { describe, it, expect } from 'vitest';
import { computeTotals, lineTotalCents, formatFolio, isExpired } from './totals';

// Esto es lo único del producto que un cliente revisa con calculadora.
// Las pruebas van sobre los casos que de verdad rompen una cotización,
// no sobre el camino feliz.

describe('computeTotals', () => {
  it('suma, aplica IVA y cuadra', () => {
    const t = computeTotals([{ description: 'Panel', quantity: 2, unitPriceCents: 150000 }], { taxRate: 16 });
    expect(t.subtotalCents).toBe(300000);
    expect(t.taxCents).toBe(48000);
    expect(t.totalCents).toBe(348000);
  });

  it('la columna de importes suma exactamente el subtotal', () => {
    // El error clásico: redondear solo el total. Aquí cada renglón se
    // redondea, y la suma de los renglones TIENE que dar el subtotal
    // impreso — porque el cliente la va a sumar a mano.
    const items = [
      { description: 'Hora', quantity: 1.5, unitPriceCents: 33333 },
      { description: 'Metro', quantity: 2.75, unitPriceCents: 19999 },
      { description: 'Pieza', quantity: 3, unitPriceCents: 12345 },
    ];
    const t = computeTotals(items);
    const sumaDeRenglones = items.reduce((s, i) => s + lineTotalCents(i), 0);
    expect(t.subtotalCents).toBe(sumaDeRenglones);
  });

  it('el descuento nunca deja un total negativo', () => {
    const t = computeTotals([{ description: 'x', quantity: 1, unitPriceCents: 10000 }], {
      discountCents: 50000,
      taxRate: 16,
    });
    expect(t.discountCents).toBe(10000);
    expect(t.totalCents).toBe(0);
  });

  it('el impuesto se calcula DESPUÉS del descuento', () => {
    // Al revés, el cliente paga IVA sobre dinero que no se le cobró.
    const t = computeTotals([{ description: 'x', quantity: 1, unitPriceCents: 100000 }], {
      discountCents: 20000,
      taxRate: 16,
    });
    expect(t.taxableCents).toBe(80000);
    expect(t.taxCents).toBe(12800);
    expect(t.totalCents).toBe(92800);
  });

  it('acepta tasa 0 (exento) sin inventar impuesto', () => {
    const t = computeTotals([{ description: 'Medicina', quantity: 1, unitPriceCents: 25000 }], { taxRate: 0 });
    expect(t.taxCents).toBe(0);
    expect(t.totalCents).toBe(25000);
  });

  it('acepta la tasa de frontera', () => {
    const t = computeTotals([{ description: 'x', quantity: 1, unitPriceCents: 100000 }], { taxRate: 8 });
    expect(t.taxCents).toBe(8000);
  });

  it('una tasa imposible se acota en vez de producir un absurdo', () => {
    const negativa = computeTotals([{ description: 'x', quantity: 1, unitPriceCents: 10000 }], { taxRate: -5 });
    expect(negativa.taxCents).toBe(0);
    const enorme = computeTotals([{ description: 'x', quantity: 1, unitPriceCents: 10000 }], { taxRate: 500 });
    expect(enorme.taxCents).toBe(10000);
  });

  it('sin partidas da ceros, no NaN', () => {
    const t = computeTotals([], { taxRate: 16 });
    expect(t.subtotalCents).toBe(0);
    expect(t.totalCents).toBe(0);
  });
});

describe('formatFolio', () => {
  it('rellena con ceros', () => {
    expect(formatFolio(7)).toBe('0007');
    expect(formatFolio(1234)).toBe('1234');
    expect(formatFolio(12345)).toBe('12345');
  });
});

describe('isExpired', () => {
  it('sin fecha de vigencia, nunca vence', () => {
    expect(isExpired(null, new Date('2030-01-01T00:00:00Z'))).toBe(false);
  });

  it('vale todo el día de su vencimiento', () => {
    // El caso que muerde: una cotización "válida hasta el 10" tiene que
    // seguir valiendo a las 6 de la tarde del 10.
    expect(isExpired('2026-10-10', new Date('2026-10-10T18:00:00Z'))).toBe(false);
    expect(isExpired('2026-10-10', new Date('2026-10-11T00:30:00Z'))).toBe(true);
  });
});
