import { describe, expect, it } from 'vitest';
import { bpATexto, calcularComisiones, comisionCents, pctABp, periodoDe } from './calculo';

describe('periodoDe', () => {
  // 2026-11-11 es miércoles.
  it('semana completa de lunes a domingo', () => {
    expect(periodoDe('semana', '2026-11-11')).toEqual({ desde: '2026-11-09', hasta: '2026-11-15' });
    expect(periodoDe('semana', '2026-11-09')).toEqual({ desde: '2026-11-09', hasta: '2026-11-15' });
    expect(periodoDe('semana', '2026-11-15')).toEqual({ desde: '2026-11-09', hasta: '2026-11-15' });
  });

  it('semana que cruza de mes y de año', () => {
    expect(periodoDe('semana', '2027-01-01')).toEqual({ desde: '2026-12-28', hasta: '2027-01-03' });
  });

  it('quincena 1–15 y 16–fin de mes', () => {
    expect(periodoDe('quincena', '2026-11-15')).toEqual({ desde: '2026-11-01', hasta: '2026-11-15' });
    expect(periodoDe('quincena', '2026-11-16')).toEqual({ desde: '2026-11-16', hasta: '2026-11-30' });
    expect(periodoDe('quincena', '2028-02-20')).toEqual({ desde: '2028-02-16', hasta: '2028-02-29' });
  });

  it('mes completo', () => {
    expect(periodoDe('mes', '2026-12-03')).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
    expect(periodoDe('mes', '2027-02-10')).toEqual({ desde: '2027-02-01', hasta: '2027-02-28' });
  });

  it('rango: ordena las fechas y cae a la quincena si vienen mal', () => {
    expect(periodoDe('rango', '2026-11-11', '2026-11-20', '2026-11-03')).toEqual({ desde: '2026-11-03', hasta: '2026-11-20' });
    expect(periodoDe('rango', '2026-11-11', 'ayer', '2026-11-03')).toEqual({ desde: '2026-11-01', hasta: '2026-11-15' });
  });
});

describe('comisionCents', () => {
  it('enteros exactos', () => {
    expect(comisionCents(100000, 3000)).toBe(30000);
    expect(comisionCents(0, 3000)).toBe(0);
    expect(comisionCents(55555, 0)).toBe(0);
    expect(comisionCents(55555, 10000)).toBe(55555);
  });

  it('redondea medio centavo hacia arriba y lo demás al más cercano', () => {
    expect(comisionCents(5, 1000)).toBe(1); // 0.5 → 1
    expect(comisionCents(4, 1000)).toBe(0); // 0.4 → 0
    expect(comisionCents(33333, 1250)).toBe(4167); // 4166.625 → 4167
    expect(comisionCents(33331, 1250)).toBe(4166); // 4166.375 → 4166
  });

  it('montos grandes sin perder precisión', () => {
    expect(comisionCents(1_000_000_000, 3333)).toBe(333_300_000);
  });
});

describe('pctABp / bpATexto', () => {
  it('parsea porcentajes', () => {
    expect(pctABp('30')).toBe(3000);
    expect(pctABp('12.5')).toBe(1250);
    expect(pctABp('12,05')).toBe(1205);
    expect(pctABp(' 40 % ')).toBe(4000);
    expect(pctABp('0')).toBe(0);
    expect(pctABp('100')).toBe(10000);
  });

  it('rechaza lo inválido', () => {
    expect(pctABp('')).toBeNull();
    expect(pctABp('-5')).toBeNull();
    expect(pctABp('100.01')).toBeNull();
    expect(pctABp('12.345')).toBeNull();
    expect(pctABp('abc')).toBeNull();
  });

  it('formatea de regreso', () => {
    expect(bpATexto(3000)).toBe('30');
    expect(bpATexto(1250)).toBe('12.5');
    expect(bpATexto(1205)).toBe('12.05');
    expect(bpATexto(0)).toBe('0');
  });
});

describe('calcularComisiones', () => {
  const personas = [
    { id: 'a', nombre: 'Ana', activo: true, pctBp: 4000 },
    { id: 'b', nombre: 'Beto', activo: true, pctBp: 0 },
    { id: 'c', nombre: 'Caro', activo: false, pctBp: 3000 },
    { id: 'd', nombre: 'Dani', activo: false, pctBp: 3000 },
  ];
  const citas = [
    { resourceId: 'a', dia: '2026-11-01', precioCents: 25000 },
    { resourceId: 'a', dia: '2026-11-15', precioCents: 33333 },
    { resourceId: 'a', dia: '2026-11-16', precioCents: 99999 }, // fuera
    { resourceId: 'c', dia: '2026-11-05', precioCents: 10000 },
  ];

  it('suma por persona dentro del periodo y redondea una sola vez', () => {
    const filas = calcularComisiones(personas, citas, { desde: '2026-11-01', hasta: '2026-11-15' });
    expect(filas).toEqual([
      { resourceId: 'a', nombre: 'Ana', pctBp: 4000, citas: 2, vendidoCents: 58333, comisionCents: 23333 },
      { resourceId: 'b', nombre: 'Beto', pctBp: 0, citas: 0, vendidoCents: 0, comisionCents: 0 },
      // Inactiva pero con citas en el periodo: se le debe.
      { resourceId: 'c', nombre: 'Caro', pctBp: 3000, citas: 1, vendidoCents: 10000, comisionCents: 3000 },
    ]);
  });
});
