// Inventario (db/049): la lógica que no depende de la base.
//
// El stock lo calcula y lo guarda la función SQL `inventario_mover`
// (atómica, con la fila bloqueada). Aquí solo vive lo que la pantalla y
// las Server Actions necesitan para validar entradas y decidir avisos.

export const TIPOS_MOVIMIENTO = ['entrada', 'uso', 'venta', 'ajuste'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const TIPO_LABEL: Record<TipoMovimiento, string> = {
  entrada: 'Entrada / compra',
  uso: 'Uso interno',
  venta: 'Venta',
  ajuste: 'Ajuste (conteo)',
};

export type Producto = {
  id: string;
  nombre: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  costoCents: number | null;
  precioCents: number | null;
};

export type MovimientoInventario = {
  id: string;
  productoId: string;
  tipo: TipoMovimiento;
  /** Con signo: lo que sumó o restó al stock. */
  cantidad: number;
  stockDespues: number;
  dia: string;
  nota: string;
};

/** "Se está acabando": stock en o por debajo del mínimo. */
export function seAcaba(p: Pick<Producto, 'stock' | 'stockMinimo'>): boolean {
  return p.stock <= p.stockMinimo;
}

/** Los que se están acabando primero (los más vacíos arriba), luego por nombre. */
export function ordenarProductos(productos: Producto[]): Producto[] {
  return [...productos].sort((a, b) => {
    const aa = seAcaba(a);
    const ba = seAcaba(b);
    if (aa !== ba) return aa ? -1 : 1;
    if (aa) return a.stock - a.stockMinimo - (b.stock - b.stockMinimo);
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

/**
 * Cantidad escrita por la dueña: "3", "1.5", "2,5". Máximo 2 decimales
 * (numeric(12,2) en la base). `permitirCero` solo para el ajuste
 * ("ya no queda nada").
 */
export function parseCantidad(texto: string, permitirCero = false): number | null {
  const limpio = (texto ?? '').trim().replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(limpio)) return null;
  const n = Number(limpio);
  if (n === 0 && !permitirCero) return null;
  return n;
}

/** 3 → "3", 1.5 → "1.5", 2.25 → "2.25". */
export function formatoCantidad(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
}

/** Lo que se sugiere cobrar en Caja por una venta: precio × cantidad, redondeado al centavo. */
export function ventaSugeridaCents(precioCents: number | null, cantidad: number): number | null {
  if (precioCents == null || !(cantidad > 0)) return null;
  return Math.round(precioCents * cantidad);
}

/**
 * Traduce el error de `inventario_mover` a algo que la dueña entienda.
 * La función lanza "inventario: stock insuficiente (7.00)".
 */
export function mensajeDeError(message: string, unidad = ''): string {
  const m = /stock insuficiente \(([\d.]+)\)/.exec(message);
  if (m) {
    const hay = formatoCantidad(Number(m[1]));
    return `Solo hay ${hay}${unidad ? ` ${unidad}` : ''}. Si contaste y hay más, haz un ajuste.`;
  }
  if (message.includes('producto no encontrado')) return 'Ese producto ya no existe.';
  if (message.includes('cantidad inválida')) return 'Escribe una cantidad válida.';
  return `No se pudo guardar: ${message}`;
}
