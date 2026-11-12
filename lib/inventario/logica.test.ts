import { describe, expect, it } from 'vitest';
import {
  formatoCantidad,
  mensajeDeError,
  ordenarProductos,
  parseCantidad,
  seAcaba,
  ventaSugeridaCents,
  type Producto,
} from './logica';
import { demoInventario } from './demo';

const p = (nombre: string, stock: number, stockMinimo: number): Producto => ({
  id: nombre,
  nombre,
  unidad: 'pieza',
  stock,
  stockMinimo,
  costoCents: null,
  precioCents: null,
});

describe('seAcaba', () => {
  it('avisa en el mínimo y por debajo, no arriba', () => {
    expect(seAcaba({ stock: 2, stockMinimo: 2 })).toBe(true);
    expect(seAcaba({ stock: 1, stockMinimo: 2 })).toBe(true);
    expect(seAcaba({ stock: 3, stockMinimo: 2 })).toBe(false);
  });
  it('sin mínimo, avisa solo cuando ya no hay', () => {
    expect(seAcaba({ stock: 0, stockMinimo: 0 })).toBe(true);
    expect(seAcaba({ stock: 1, stockMinimo: 0 })).toBe(false);
  });
});

describe('ordenarProductos', () => {
  it('los que se acaban primero (más vacíos arriba), luego alfabético', () => {
    const orden = ordenarProductos([p('Cera', 10, 2), p('Acetona', 9, 2), p('Tinte', 1, 3), p('Esmalte', 2, 2)]);
    expect(orden.map((x) => x.nombre)).toEqual(['Tinte', 'Esmalte', 'Acetona', 'Cera']);
  });
});

describe('parseCantidad', () => {
  it('acepta enteros y hasta dos decimales con punto o coma', () => {
    expect(parseCantidad('3')).toBe(3);
    expect(parseCantidad(' 1.5 ')).toBe(1.5);
    expect(parseCantidad('2,25')).toBe(2.25);
  });
  it('rechaza basura, negativos, tres decimales y cero (salvo ajuste)', () => {
    expect(parseCantidad('abc')).toBeNull();
    expect(parseCantidad('-1')).toBeNull();
    expect(parseCantidad('1.234')).toBeNull();
    expect(parseCantidad('0')).toBeNull();
    expect(parseCantidad('0', true)).toBe(0);
  });
});

describe('formatoCantidad', () => {
  it('no enseña decimales de más', () => {
    expect(formatoCantidad(3)).toBe('3');
    expect(formatoCantidad(1.5)).toBe('1.5');
    expect(formatoCantidad(2.25)).toBe('2.25');
  });
});

describe('ventaSugeridaCents', () => {
  it('precio × cantidad al centavo, null sin precio', () => {
    expect(ventaSugeridaCents(15000, 2)).toBe(30000);
    expect(ventaSugeridaCents(9999, 1.5)).toBe(14999);
    expect(ventaSugeridaCents(null, 2)).toBeNull();
  });
});

describe('mensajeDeError', () => {
  it('traduce el stock insuficiente de inventario_mover', () => {
    expect(mensajeDeError('inventario: stock insuficiente (7.00)', 'frascos')).toBe(
      'Solo hay 7 frascos. Si contaste y hay más, haz un ajuste.'
    );
  });
  it('deja pasar otros errores con contexto', () => {
    expect(mensajeDeError('boom')).toBe('No se pudo guardar: boom');
  });
});

describe('demoInventario', () => {
  it('es determinista, consistente y trae al menos un aviso', () => {
    const a = demoInventario('lima-laca', '2026-11-11');
    const b = demoInventario('lima-laca', '2026-11-11');
    expect(a).toEqual(b);
    expect(a.productos.some(seAcaba)).toBe(true);
    // Cada stock_despues coincide con el stock del producto en su último movimiento.
    for (const prod of a.productos) {
      const ultimo = a.movimientos.find((m) => m.productoId === prod.id);
      if (ultimo) expect(ultimo.stockDespues).toBe(prod.stock);
    }
  });
});
