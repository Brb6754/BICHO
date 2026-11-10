import { addDaysKey } from '@/lib/dates/tenantTime';

// Las cuentas de la Caja, sin base de datos ni React: entran movimientos
// y un "hoy", salen los números que ve el dueño. Puras para poder
// probarlas (resumen.test.ts) y para correr igual en servidor y cliente.

export const METODOS = ['efectivo', 'tarjeta', 'transferencia'] as const;
export type Metodo = (typeof METODOS)[number];

export const CATEGORIAS_GASTO = ['renta', 'productos', 'sueldos', 'servicios', 'otro'] as const;
export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export type Periodo = 'hoy' | 'semana' | 'mes';

export type Movimiento = {
  /** id de la fila, o `cita:<bookingId>` para una venta calculada de una cita. */
  id: string;
  tipo: 'venta' | 'gasto';
  concepto: string;
  montoCents: number;
  metodo: Metodo;
  categoria: CategoriaGasto | null;
  /** YYYY-MM-DD en la zona del negocio. */
  dia: string;
  bookingId: string | null;
  /** Nombre del servicio cuando la venta sale de una cita. */
  servicio: string | null;
};

/** Una cita completada, tal como llega de la base. */
export type CitaCompletada = {
  bookingId: string;
  dia: string;
  servicio: string;
  precioCents: number;
};

/** Fila de caja_movimientos ya leída. */
export type FilaCaja = Omit<Movimiento, 'servicio'> & { anulada: boolean };

/**
 * Las ventas de citas se calculan de las citas completadas; si el dueño
 * editó o quitó una, su fila (con booking_id) gana. Las filas manuales
 * pasan tal cual. Una venta anulada desaparece.
 */
export function combinarMovimientos(citas: CitaCompletada[], filas: FilaCaja[]): Movimiento[] {
  const ajustes = new Map(filas.filter((f) => f.bookingId).map((f) => [f.bookingId as string, f]));
  const deCitas: Movimiento[] = [];
  for (const c of citas) {
    const ajuste = ajustes.get(c.bookingId);
    if (ajuste?.anulada) continue;
    deCitas.push({
      id: `cita:${c.bookingId}`,
      tipo: 'venta',
      concepto: ajuste?.concepto || c.servicio,
      montoCents: ajuste ? ajuste.montoCents : c.precioCents,
      // Sin ajuste se asume efectivo: es como cobra casi toda estética o
      // barbería, y el dueño lo cambia con un toque si fue tarjeta.
      metodo: ajuste?.metodo ?? 'efectivo',
      categoria: null,
      dia: c.dia,
      bookingId: c.bookingId,
      servicio: c.servicio,
    });
  }
  const manuales: Movimiento[] = filas
    .filter((f) => !f.bookingId && !f.anulada)
    .map(({ anulada: _a, ...f }) => ({ ...f, servicio: null }));
  return [...deCitas, ...manuales];
}

/** Día de la semana de una llave YYYY-MM-DD, con lunes = 0. */
function diaSemana(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7;
}

function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T12:00:00Z`);
  const b = Date.parse(`${hasta}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export type Rango = { desde: string; hasta: string; prevDesde: string; prevHasta: string };

/**
 * El periodo hasta hoy (inclusive) y el periodo anterior cortado en el
 * mismo punto: "este mes al día 10" contra "el mes pasado al día 10".
 * Comparar 10 días contra un mes completo haría que todo mes empezara
 * "perdiendo".
 */
export function rangoDe(periodo: Periodo, hoy: string): Rango {
  if (periodo === 'hoy') {
    const ayer = addDaysKey(hoy, -1);
    return { desde: hoy, hasta: hoy, prevDesde: ayer, prevHasta: ayer };
  }
  if (periodo === 'semana') {
    const desde = addDaysKey(hoy, -diaSemana(hoy));
    return { desde, hasta: hoy, prevDesde: addDaysKey(desde, -7), prevHasta: addDaysKey(hoy, -7) };
  }
  const desde = `${hoy.slice(0, 8)}01`;
  const prevDesde = `${addDaysKey(desde, -1).slice(0, 8)}01`;
  const finPrev = addDaysKey(desde, -1);
  const mismoPunto = addDaysKey(prevDesde, diasEntre(desde, hoy));
  return { desde, hasta: hoy, prevDesde, prevHasta: mismoPunto < finPrev ? mismoPunto : finPrev };
}

export type Resumen = {
  vendidoCents: number;
  gastadoCents: number;
  /** Lo que le quedó: vendido − gastado. Puede ser negativo. */
  quedoCents: number;
  numVentas: number;
  porServicio: { nombre: string; cents: number; veces: number }[];
  porMetodo: Record<Metodo, number>;
};

export function resumir(movs: Movimiento[], desde: string, hasta: string): Resumen {
  const r: Resumen = {
    vendidoCents: 0,
    gastadoCents: 0,
    quedoCents: 0,
    numVentas: 0,
    porServicio: [],
    porMetodo: { efectivo: 0, tarjeta: 0, transferencia: 0 },
  };
  const servicios = new Map<string, { cents: number; veces: number }>();
  for (const m of movs) {
    if (m.dia < desde || m.dia > hasta) continue;
    if (m.tipo === 'gasto') {
      r.gastadoCents += m.montoCents;
      continue;
    }
    r.vendidoCents += m.montoCents;
    r.numVentas += 1;
    r.porMetodo[m.metodo] += m.montoCents;
    // Las ventas sueltas (un champú, una propina) van juntas: listarlas
    // por concepto llenaría la tabla de renglones de una sola vez.
    const nombre = m.servicio ?? 'Ventas sueltas';
    const s = servicios.get(nombre) ?? { cents: 0, veces: 0 };
    s.cents += m.montoCents;
    s.veces += 1;
    servicios.set(nombre, s);
  }
  r.quedoCents = r.vendidoCents - r.gastadoCents;
  r.porServicio = [...servicios.entries()]
    .map(([nombre, s]) => ({ nombre, ...s }))
    .sort((a, b) => b.cents - a.cents);
  return r;
}

/** Cambio porcentual contra el periodo anterior; null si antes no hubo nada. */
export function cambioPct(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / Math.abs(anterior)) * 100);
}

export type Corte = {
  fondoCents: number;
  ventasEfectivoCents: number;
  gastosEfectivoCents: number;
  /** Lo que debería haber en el cajón al cerrar. */
  esperadoCents: number;
};

/** Corte del día: fondo + ventas en efectivo − gastos pagados en efectivo. */
export function corteDeCaja(movs: Movimiento[], dia: string, fondoCents = 0): Corte {
  let ventas = 0;
  let gastos = 0;
  for (const m of movs) {
    if (m.dia !== dia || m.metodo !== 'efectivo') continue;
    if (m.tipo === 'venta') ventas += m.montoCents;
    else gastos += m.montoCents;
  }
  return {
    fondoCents,
    ventasEfectivoCents: ventas,
    gastosEfectivoCents: gastos,
    esperadoCents: fondoCents + ventas - gastos,
  };
}

/**
 * "1,250.50" / "$300" / "300" → centavos. null si no es un monto válido
 * (vacío, negativo, más de 2 decimales, o absurdo para un negocio chico).
 */
export function pesosACentavos(texto: string): number | null {
  const limpio = texto.replace(/[\s$,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const cents = Math.round(Number(limpio) * 100);
  if (!Number.isFinite(cents) || cents <= 0 || cents > 1_000_000_000) return null;
  return cents;
}

/** Monto para mostrar: "$1,250" o "$1,250.50", con signo si es negativo. */
export function formatoPesos(cents: number): string {
  const tieneCentavos = cents % 100 !== 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: tieneCentavos ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
