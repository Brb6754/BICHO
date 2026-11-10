import { describe, expect, it } from 'vitest';
import {
  cambioPct,
  combinarMovimientos,
  corteDeCaja,
  pesosACentavos,
  rangoDe,
  resumir,
  type FilaCaja,
  type Movimiento,
} from './resumen';

const fila = (p: Partial<FilaCaja>): FilaCaja => ({
  id: p.id ?? 'f1',
  tipo: 'venta',
  concepto: '',
  montoCents: 0,
  metodo: 'efectivo',
  categoria: null,
  dia: '2026-11-10',
  bookingId: null,
  anulada: false,
  ...p,
});

const mov = (p: Partial<Movimiento>): Movimiento => ({ ...fila(p), servicio: null, ...p });

describe('rangoDe', () => {
  it('hoy contra ayer', () => {
    expect(rangoDe('hoy', '2026-11-10')).toEqual({
      desde: '2026-11-10',
      hasta: '2026-11-10',
      prevDesde: '2026-11-09',
      prevHasta: '2026-11-09',
    });
  });

  it('la semana empieza en lunes y se compara al mismo día de la semana pasada', () => {
    // 2026-11-10 es martes.
    expect(rangoDe('semana', '2026-11-10')).toEqual({
      desde: '2026-11-09',
      hasta: '2026-11-10',
      prevDesde: '2026-11-02',
      prevHasta: '2026-11-03',
    });
    // Un domingo cierra la semana que empezó el lunes anterior.
    expect(rangoDe('semana', '2026-11-15').desde).toBe('2026-11-09');
  });

  it('el mes se compara contra el mes pasado al mismo día', () => {
    expect(rangoDe('mes', '2026-11-10')).toEqual({
      desde: '2026-11-01',
      hasta: '2026-11-10',
      prevDesde: '2026-10-01',
      prevHasta: '2026-10-10',
    });
  });

  it('si el mes pasado fue más corto, se corta en su último día', () => {
    expect(rangoDe('mes', '2026-03-31')).toMatchObject({ prevDesde: '2026-02-01', prevHasta: '2026-02-28' });
    expect(rangoDe('mes', '2026-01-15')).toMatchObject({ prevDesde: '2025-12-01', prevHasta: '2025-12-15' });
  });
});

describe('combinarMovimientos', () => {
  const citas = [
    { bookingId: 'b1', dia: '2026-11-10', servicio: 'Corte', precioCents: 20000 },
    { bookingId: 'b2', dia: '2026-11-10', servicio: 'Barba', precioCents: 15000 },
    { bookingId: 'b3', dia: '2026-11-10', servicio: 'Tinte', precioCents: 60000 },
  ];

  it('cada cita completada es una venta en efectivo al precio del servicio', () => {
    const r = combinarMovimientos(citas, []);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ id: 'cita:b1', montoCents: 20000, metodo: 'efectivo', servicio: 'Corte' });
  });

  it('un ajuste del dueño gana y una venta anulada desaparece', () => {
    const r = combinarMovimientos(citas, [
      fila({ id: 'a1', bookingId: 'b2', montoCents: 12000, metodo: 'tarjeta' }),
      fila({ id: 'a2', bookingId: 'b3', anulada: true }),
      fila({ id: 'm1', concepto: 'Cera', montoCents: 9000 }),
    ]);
    expect(r.map((m) => m.id)).toEqual(['cita:b1', 'cita:b2', 'm1']);
    expect(r[1]).toMatchObject({ montoCents: 12000, metodo: 'tarjeta', concepto: 'Barba' });
  });
});

describe('resumir', () => {
  const movs = [
    mov({ id: '1', montoCents: 20000, servicio: 'Corte', metodo: 'efectivo' }),
    mov({ id: '2', montoCents: 20000, servicio: 'Corte', metodo: 'tarjeta' }),
    mov({ id: '3', montoCents: 9000, metodo: 'transferencia' }),
    mov({ id: '4', tipo: 'gasto', categoria: 'productos', montoCents: 15000 }),
    mov({ id: '5', montoCents: 99999, dia: '2026-11-01' }),
  ];

  it('vendido, gastado y lo que te quedó, solo dentro del rango', () => {
    const r = resumir(movs, '2026-11-10', '2026-11-10');
    expect(r.vendidoCents).toBe(49000);
    expect(r.gastadoCents).toBe(15000);
    expect(r.quedoCents).toBe(34000);
    expect(r.numVentas).toBe(3);
  });

  it('agrupa por servicio (mayor primero) y por método', () => {
    const r = resumir(movs, '2026-11-10', '2026-11-10');
    expect(r.porServicio).toEqual([
      { nombre: 'Corte', cents: 40000, veces: 2 },
      { nombre: 'Ventas sueltas', cents: 9000, veces: 1 },
    ]);
    expect(r.porMetodo).toEqual({ efectivo: 20000, tarjeta: 20000, transferencia: 9000 });
  });

  it('la utilidad puede ser negativa', () => {
    const r = resumir([mov({ tipo: 'gasto', categoria: 'renta', montoCents: 500000 })], '2026-11-10', '2026-11-10');
    expect(r.quedoCents).toBe(-500000);
  });
});

describe('cambioPct', () => {
  it('compara contra el periodo anterior', () => {
    expect(cambioPct(150, 100)).toBe(50);
    expect(cambioPct(50, 100)).toBe(-50);
    expect(cambioPct(100, 0)).toBeNull();
    // Pasar de perder a perder menos es una mejora.
    expect(cambioPct(-50, -100)).toBe(50);
  });
});

describe('corteDeCaja', () => {
  it('fondo + ventas en efectivo − gastos en efectivo, solo del día', () => {
    const c = corteDeCaja(
      [
        mov({ montoCents: 20000 }),
        mov({ montoCents: 30000, metodo: 'tarjeta' }),
        mov({ tipo: 'gasto', categoria: 'productos', montoCents: 5000 }),
        mov({ tipo: 'gasto', categoria: 'renta', montoCents: 800000, metodo: 'transferencia' }),
        mov({ montoCents: 70000, dia: '2026-11-09' }),
      ],
      '2026-11-10',
      50000
    );
    expect(c).toEqual({ fondoCents: 50000, ventasEfectivoCents: 20000, gastosEfectivoCents: 5000, esperadoCents: 65000 });
  });
});

describe('pesosACentavos', () => {
  it('acepta formatos comunes', () => {
    expect(pesosACentavos('300')).toBe(30000);
    expect(pesosACentavos('$1,250.50')).toBe(125050);
    expect(pesosACentavos(' 99.9 ')).toBe(9990);
  });
  it('rechaza lo que no es un monto', () => {
    for (const t of ['', '0', '-5', 'abc', '1.234', '1e5', '20000000']) expect(pesosACentavos(t)).toBeNull();
  });
});
