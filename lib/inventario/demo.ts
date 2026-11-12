import { addDaysKey } from '@/lib/dates/tenantTime';
import type { MovimientoInventario, Producto, TipoMovimiento } from '@/lib/inventario/logica';

// El Inventario del panel de demostración (estilo lib/caja/demo.ts):
// productos de salón inventados, relativos a hoy, y movimientos que
// cuadran con el stock final — la misma cuenta que haría
// `inventario_mover`. Fijo para todos los demos: es una lista de
// productos, no hay nada del catálogo real que la haga más creíble.
// shortcut: lista de salón/uñas para todos los demos, aunque un dental o un pádel los vea; derivar por vertical si se vuelve a vender a esos giros.

type Semilla = Omit<Producto, 'id' | 'stock'> & {
  inicial: number;
  // [hace cuántos días, tipo, cantidad (para ajuste: lo contado), nota]
  movs: [number, TipoMovimiento, number, string][];
};

const SEMILLAS: Semilla[] = [
  {
    nombre: 'Esmalte gel rojo cereza',
    unidad: 'frasco',
    stockMinimo: 2,
    costoCents: 9500,
    precioCents: null,
    inicial: 6,
    movs: [
      [9, 'uso', 2, ''],
      [5, 'uso', 1, ''],
      [2, 'uso', 1, 'Se derramó uno a la mitad'],
    ],
  },
  {
    nombre: 'Tinte rubio cenizo 9.1',
    unidad: 'tubo',
    stockMinimo: 3,
    costoCents: 14000,
    precioCents: null,
    inicial: 8,
    movs: [
      [8, 'uso', 2, ''],
      [4, 'uso', 3, 'Mechas de tres clientas'],
      [1, 'uso', 1, ''],
    ],
  },
  {
    nombre: 'Crema de manos karité',
    unidad: 'pieza',
    stockMinimo: 4,
    costoCents: 6500,
    precioCents: 15000,
    inicial: 10,
    movs: [
      [7, 'venta', 2, ''],
      [6, 'entrada', 6, 'Pedido al distribuidor'],
      [3, 'venta', 1, ''],
      [0, 'venta', 2, ''],
    ],
  },
  {
    nombre: 'Acetona pura',
    unidad: 'litro',
    stockMinimo: 1,
    costoCents: 8000,
    precioCents: null,
    inicial: 3,
    movs: [
      [6, 'uso', 0.5, ''],
      [2, 'ajuste', 2, 'Conteo del lunes'],
    ],
  },
  {
    nombre: 'Shampoo matizador',
    unidad: 'pieza',
    stockMinimo: 2,
    costoCents: 11000,
    precioCents: 24000,
    inicial: 4,
    movs: [
      [5, 'venta', 1, ''],
      [1, 'venta', 1, ''],
    ],
  },
  {
    nombre: 'Guantes de nitrilo',
    unidad: 'caja',
    stockMinimo: 1,
    costoCents: 18000,
    precioCents: null,
    inicial: 2,
    movs: [[4, 'entrada', 3, '']],
  },
];

export function demoInventario(slug: string, hoy: string): { productos: Producto[]; movimientos: MovimientoInventario[] } {
  const productos: Producto[] = [];
  const movimientos: MovimientoInventario[] = [];
  SEMILLAS.forEach(({ inicial, movs, ...p }, i) => {
    const id = `demo-${slug}-${i}`;
    let stock = inicial;
    movs.forEach(([hace, tipo, cantidad, nota], j) => {
      const delta = tipo === 'entrada' ? cantidad : tipo === 'ajuste' ? cantidad - stock : -cantidad;
      stock += delta;
      movimientos.push({ id: `${id}-${j}`, productoId: id, tipo, cantidad: delta, stockDespues: stock, dia: addDaysKey(hoy, -hace), nota });
    });
    productos.push({ ...p, id, stock });
  });
  // Lo más nuevo primero, igual que la consulta real.
  movimientos.sort((a, b) => (a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : b.id.localeCompare(a.id)));
  return { productos, movimientos };
}
