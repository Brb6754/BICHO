import { addDaysKey, dayKey } from '@/lib/dates/tenantTime';
import { rangoDe, type Metodo, type Movimiento } from '@/lib/caja/resumen';

// La Caja del panel de demostración: inventada a partir del catálogo
// real del negocio (sus servicios y precios), igual que la agenda demo
// (lib/demo/panelFixtures.ts). Determinista por slug — dos visitantes
// ven los mismos números — y relativa a hoy, para que siempre haya
// "hoy", "esta semana" y "el mes pasado" con qué comparar.

type Servicio = { id: string; name: string; price_cents: number };

/** Generador pseudoaleatorio estable (mulberry32) sembrado con el slug. */
function aleatorio(slug: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) h = Math.imul(h ^ slug.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUELTAS = ['Cera para cabello', 'Shampoo', 'Propina', 'Tratamiento extra'];

export function demoCaja(slug: string, servicios: Servicio[], timezone: string, now: Date): Movimiento[] {
  const rnd = aleatorio(slug);
  const conPrecio = servicios.filter((s) => s.price_cents > 0);
  const catalogo = conPrecio.length ? conPrecio : [{ id: 'x', name: 'Servicio', price_cents: 25000 }];
  // Ticket promedio del negocio: la renta y los sueldos se escalan con él
  // para que un spa y una barbería den una utilidad creíble los dos.
  const ticket = catalogo.reduce((s, c) => s + c.price_cents, 0) / catalogo.length;

  const hoy = dayKey(now, timezone);
  const movs: Movimiento[] = [];
  let n = 0;
  const metodo = (): Metodo => {
    const r = rnd();
    return r < 0.55 ? 'efectivo' : r < 0.85 ? 'tarjeta' : 'transferencia';
  };
  const gasto = (dia: string, categoria: Movimiento['categoria'], concepto: string, cents: number, m: Metodo) =>
    movs.push({ id: `demo-${n++}`, tipo: 'gasto', concepto, montoCents: Math.round(cents / 100) * 100, metodo: m, categoria, dia, bookingId: null, servicio: null });

  for (let dia = rangoDe('mes', hoy).prevDesde; dia <= hoy; dia = addDaysKey(dia, 1)) {
    const [y, mo, d] = dia.split('-').map(Number);
    const semana = new Date(Date.UTC(y, mo - 1, d, 12)).getUTCDay(); // 0 domingo
    // Hoy casi completo: la demo se enseña en cualquier momento del día
    // y un "hoy" a medias siempre se leería como un mal día.
    const base = semana === 0 ? 2 : semana === 6 ? 9 : 6;
    const citas = Math.round((base + rnd() * 3) * (dia === hoy ? 0.85 : 1));

    for (let i = 0; i < citas; i++) {
      const s = catalogo[Math.floor(rnd() * catalogo.length)];
      movs.push({ id: `demo-${n++}`, tipo: 'venta', concepto: s.name, montoCents: s.price_cents, metodo: metodo(), categoria: null, dia, bookingId: `demo-${n}`, servicio: s.name });
    }
    if (rnd() < 0.3) {
      const c = SUELTAS[Math.floor(rnd() * SUELTAS.length)];
      movs.push({ id: `demo-${n++}`, tipo: 'venta', concepto: c, montoCents: (8 + Math.floor(rnd() * 15)) * 1000, metodo: metodo(), categoria: null, dia, bookingId: null, servicio: null });
    }

    if (d === 1) gasto(dia, 'renta', 'Renta del local', ticket * 30, 'transferencia');
    if (d === 1 || d === 15) gasto(dia, 'sueldos', 'Quincena del equipo', ticket * 22, 'transferencia');
    if (d === 5) gasto(dia, 'servicios', 'Luz y agua', ticket * 4, 'transferencia');
    if (d === 8) gasto(dia, 'servicios', 'Internet', 59900, 'tarjeta');
    // Las compras grandes nunca caen hoy: dejarían el corte del día en negativo.
    if (semana === 2 && dia !== hoy) gasto(dia, 'productos', 'Productos de la semana', ticket * (2 + rnd() * 2), 'efectivo');
    if (dia === hoy) gasto(dia, 'otro', 'Garrafón y limpieza', 9500, 'efectivo');
  }
  return movs;
}
