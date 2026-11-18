import { addDaysKey } from '@/lib/dates/tenantTime';
import { demoCaja } from '@/lib/caja/demo';
import type { Movimiento } from '@/lib/caja/resumen';
import { NOMBRES } from '@/lib/demo/panelFixtures';
import {
  calcularComisiones,
  comisionCents,
  periodoDe,
  type CitaComisionable,
  type FilaComision,
  type Rango,
} from '@/lib/comisiones/calculo';
import type { CitaDetalle, PagoComision } from '@/lib/comisiones/datos';

// Comisiones del panel de demostración. Cuentan la MISMA historia que la
// Caja y la Agenda demo: cada cobro de cita de lib/caja/demo.ts es una
// cita de comisión con el mismo servicio, día y precio, y las de la
// agenda demo (lib/demo/panelFixtures.ts) conservan a quien atendió y a
// la clienta. Así "vendió $X" aquí es lo mismo que la Caja suma por citas.

type Servicio = { id: string; name: string; price_cents: number };
type Recurso = { id: string; name: string };
type CitaAgenda = {
  id: string;
  starts_at: string;
  status: string;
  resource_id?: string;
  service_type_id?: string;
  service_types: { name: string } | null;
  customers: { name: string } | null;
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const PCTS = [4000, 3500, 3000, 4500];

/** Las ventas demo del negocio (lo mismo que enseña la Caja demo). */
export function ventasDemo(
  slug: string,
  servicios: Servicio[],
  timezone: string,
  now: Date,
  agenda: CitaAgenda[],
): Movimiento[] {
  return demoCaja(slug, servicios, timezone, now, agenda);
}

export function demoComisiones(
  slug: string,
  demo: {
    resources: Recurso[];
    services: Servicio[];
    citas: CitaAgenda[];
    timezone: string;
    now: Date;
  },
  rango: Rango,
  hoy: string
): { filas: FilaComision[]; pagos: PagoComision[]; detalle: CitaDetalle[] } {
  const equipo = demo.resources.length ? demo.resources : [{ id: 'demo-1', name: 'Equipo' }];
  const personas = equipo.map((r, i) => ({
    id: r.id,
    nombre: r.name,
    activo: true,
    pctBp: PCTS[i % PCTS.length],
  }));
  const agenda = new Map(demo.citas.map((c) => [c.id, c]));

  // Solo los cobros que salen de una cita (las ventas sueltas, como un
  // shampoo, no dan comisión). La cita de la agenda dice quién atendió;
  // las de días anteriores se reparten fijo por su id.
  const detalle: CitaDetalle[] = ventasDemo(slug, demo.services, demo.timezone, demo.now, demo.citas)
    .filter((m) => m.tipo === 'venta' && m.bookingId && !m.porCobrar)
    .map((m) => {
      const cita = agenda.get(m.bookingId!);
      return {
        id: m.id,
        resourceId: cita?.resource_id ?? equipo[hash(m.id) % equipo.length].id,
        dia: m.dia,
        hora: m.hora ?? null,
        servicio: m.servicio ?? m.concepto,
        // Los días que la agenda demo no enseña también llevan clienta: una
        // cita sin nombre en Comisiones se lee como dato roto.
        cliente: cita?.customers?.name ?? NOMBRES[hash(`${m.id}:cliente`) % NOMBRES.length],
        precioCents: m.montoCents,
      };
    })
    .filter((c) => c.dia <= hoy);
  const citas: CitaComisionable[] = detalle.map((c) => ({ resourceId: c.resourceId, dia: c.dia, precioCents: c.precioCents }));

  // La quincena anterior ya está pagada, para que el historial no salga vacío.
  const anterior = periodoDe('quincena', addDaysKey(periodoDe('quincena', hoy).desde, -1));
  const pagos: PagoComision[] = calcularComisiones(personas, citas, anterior)
    .filter((f) => f.citas > 0)
    .map((f, i) => ({
      id: `demo-pago-${i}`,
      resourceId: f.resourceId,
      nombre: f.nombre,
      desde: anterior.desde,
      hasta: anterior.hasta,
      citas: f.citas,
      vendidoCents: f.vendidoCents,
      pctBp: f.pctBp,
      comisionCents: comisionCents(f.vendidoCents, f.pctBp),
      enCaja: true,
      creado: `${anterior.hasta}T20:00:00Z`,
    }));

  return {
    filas: calcularComisiones(personas, citas, rango),
    pagos,
    detalle: detalle.filter((c) => c.dia >= rango.desde && c.dia <= rango.hasta),
  };
}
