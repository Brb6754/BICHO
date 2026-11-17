import { addDaysKey, dayKey, formatTime } from '@/lib/dates/tenantTime';
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

/** Lo mínimo de una cita de la agenda demo (lib/demo/panelFixtures.ts). */
type CitaAgenda = { id: string; starts_at: string; status: string; service_type_id?: string; service_types: { name: string } | null };

/**
 * La Caja demo CUADRA con la agenda demo: en los días que la agenda
 * enseña (anteayer, ayer y hoy) cada cobro de cita es una cita
 * «Asistió» de esa agenda, con su precio y su hora. Los días anteriores
 * (que la agenda no enseña) se inventan al mismo ritmo para que la
 * semana y el mes tengan con qué compararse.
 *
 * Hoy la agenda todavía no marca a nadie como «Asistió»: las citas que
 * ya empezaron salen de `demoPorCobrar`, fuera de los totales, para que
 * el botón «Cobrar una cita» tenga qué cobrar.
 */
export function demoCaja(
  slug: string,
  servicios: Servicio[],
  timezone: string,
  now: Date,
  agenda: CitaAgenda[] = [],
): Movimiento[] {
  const rnd = aleatorio(slug);
  const conPrecio = servicios.filter((s) => s.price_cents > 0);
  const catalogo = conPrecio.length ? conPrecio : [{ id: 'x', name: 'Servicio', price_cents: 25000 }];
  // Ticket promedio del negocio: la renta y los sueldos se escalan con él
  // para que un spa y una barbería den una utilidad creíble los dos.
  const ticket = catalogo.reduce((s, c) => s + c.price_cents, 0) / catalogo.length;
  const precio = new Map(servicios.map((s) => [s.id, s.price_cents]));

  const hoy = dayKey(now, timezone);
  const desdeAgenda = addDaysKey(hoy, -2);
  const movs: Movimiento[] = [];
  let n = 0;
  const metodo = (): Metodo => {
    const r = rnd();
    return r < 0.55 ? 'efectivo' : r < 0.85 ? 'tarjeta' : 'transferencia';
  };
  const gasto = (dia: string, categoria: Movimiento['categoria'], concepto: string, cents: number, m: Metodo, hora = '10:15') =>
    movs.push({ id: `demo-${n++}`, tipo: 'gasto', concepto, montoCents: Math.round(cents / 100) * 100, metodo: m, categoria, dia, bookingId: null, servicio: null, hora });
  const deCita = (c: CitaAgenda, m: Metodo) => citaAMovimiento(c, precio, timezone, m, false);

  for (let dia = rangoDe('mes', hoy).prevDesde; dia <= hoy; dia = addDaysKey(dia, 1)) {
    const [y, mo, d] = dia.split('-').map(Number);
    const semana = new Date(Date.UTC(y, mo - 1, d, 12)).getUTCDay(); // 0 domingo

    // Sin agenda (otras pantallas demo que no la pasan) se inventa todo, como antes.
    if (agenda.length && dia >= desdeAgenda) {
      for (const c of agenda) {
        if (c.status === 'completed' && dayKey(c.starts_at, timezone) === dia) movs.push(deCita(c, metodo()));
      }
    } else {
      // Mismo ritmo que la agenda demo (3 a 5 citas por día).
      const base = semana === 0 ? 1 : semana === 6 ? 5 : 3;
      const citas = Math.round(base + rnd() * 2);
      for (let i = 0; i < citas; i++) {
        const s = catalogo[Math.floor(rnd() * catalogo.length)];
        const min = 10 * 60 + i * 90;
        const hora = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
        movs.push({ id: `demo-${n++}`, tipo: 'venta', concepto: s.name, montoCents: s.price_cents, metodo: metodo(), categoria: null, dia, bookingId: `demo-${n}`, servicio: s.name, hora });
      }
    }
    // Hoy siempre trae una venta suelta: un "hoy" vacío se lee como un mal día.
    if (rnd() < 0.3 || dia === hoy) {
      const c = SUELTAS[Math.floor(rnd() * SUELTAS.length)];
      movs.push({ id: `demo-${n++}`, tipo: 'venta', concepto: c, montoCents: (8 + Math.floor(rnd() * 15)) * 1000, metodo: dia === hoy ? 'efectivo' : metodo(), categoria: null, dia, bookingId: null, servicio: null, hora: '11:20' });
    }

    if (d === 1) gasto(dia, 'renta', 'Renta del local', ticket * 20, 'transferencia');
    if (d === 1 || d === 15) gasto(dia, 'sueldos', 'Quincena del equipo', ticket * 14, 'transferencia');
    if (d === 5) gasto(dia, 'servicios', 'Luz y agua', ticket * 3, 'transferencia');
    if (d === 8) gasto(dia, 'servicios', 'Internet', 59900, 'tarjeta');
    // Las compras grandes nunca caen hoy: dejarían el corte del día en negativo.
    if (semana === 2 && dia !== hoy) gasto(dia, 'productos', 'Productos de la semana', ticket * (1 + rnd()), 'efectivo');
    if (dia === hoy) gasto(dia, 'otro', 'Garrafón y limpieza', 6000, 'efectivo', '09:40');
  }

  return movs;
}

function citaAMovimiento(c: CitaAgenda, precio: Map<string, number>, timezone: string, metodo: Metodo, porCobrar: boolean): Movimiento {
  const nombre = c.service_types?.name ?? 'Cita';
  return {
    id: `cita:${c.id}`,
    tipo: 'venta',
    concepto: nombre,
    montoCents: precio.get(c.service_type_id ?? '') ?? 0,
    metodo,
    categoria: null,
    dia: dayKey(c.starts_at, timezone),
    bookingId: c.id,
    servicio: nombre,
    hora: formatTime(c.starts_at, timezone),
    porCobrar,
  };
}

/** Las citas de hoy de la agenda demo que ya empezaron: las que «Cobrar una cita» ofrece. */
export function demoPorCobrar(servicios: Servicio[], timezone: string, now: Date, agenda: CitaAgenda[]): Movimiento[] {
  const hoy = dayKey(now, timezone);
  const precio = new Map(servicios.map((s) => [s.id, s.price_cents]));
  const deHoy = agenda.filter((c) => c.status === 'confirmed' && dayKey(c.starts_at, timezone) === hoy);
  const empezadas = deHoy.filter((c) => new Date(c.starts_at) <= now);
  // shortcut: de madrugada ninguna ha empezado; se ofrece la primera del día para que el botón enseñe algo.
  return (empezadas.length ? empezadas : deHoy.slice(0, 1)).map((c) => citaAMovimiento(c, precio, timezone, 'efectivo', true));
}
