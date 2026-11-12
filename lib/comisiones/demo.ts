import { addDaysKey } from '@/lib/dates/tenantTime';
import { calcularComisiones, comisionCents, periodoDe, type CitaComisionable, type FilaComision, type Rango } from '@/lib/comisiones/calculo';
import type { PagoComision } from '@/lib/comisiones/datos';

// Comisiones del panel de demostración: citas completadas inventadas a
// partir del equipo y el catálogo reales del negocio, igual que
// lib/caja/demo.ts. Deterministas por slug (dos visitantes ven lo mismo)
// y relativas a hoy.

type Servicio = { price_cents: number };
type Recurso = { id: string; name: string };

function aleatorio(slug: string): () => number {
  let a = 2166136261;
  for (let i = 0; i < slug.length; i++) a = Math.imul(a ^ slug.charCodeAt(i), 16777619);
  a >>>= 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PCTS = [4000, 3500, 3000, 4500];

export function demoComisiones(
  slug: string,
  recursos: Recurso[],
  servicios: Servicio[],
  hoy: string,
  rango: Rango
): { filas: FilaComision[]; pagos: PagoComision[] } {
  const rnd = aleatorio(`comisiones:${slug}`);
  const equipo = recursos.length ? recursos : [{ id: 'demo-1', name: 'Equipo' }];
  const precios = servicios.map((s) => s.price_cents).filter((p) => p > 0);
  const catalogo = precios.length ? precios : [25000];
  const personas = equipo.map((r, i) => ({ id: r.id, nombre: r.name, activo: true, pctBp: PCTS[i % PCTS.length] }));

  // Desde el inicio del mes pasado: alcanza para la quincena anterior pagada.
  const citas: CitaComisionable[] = [];
  const inicio = periodoDe('mes', addDaysKey(`${hoy.slice(0, 8)}01`, -1)).desde;
  for (let dia = inicio; dia <= hoy; dia = addDaysKey(dia, 1)) {
    for (const p of personas) {
      const n = Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        citas.push({ resourceId: p.id, dia, precioCents: catalogo[Math.floor(rnd() * catalogo.length)] });
      }
    }
  }

  // La quincena anterior ya está pagada, para que el historial no salga vacío.
  const anterior = periodoDe('quincena', addDaysKey(periodoDe('quincena', hoy).desde, -1));
  const pagos: PagoComision[] = calcularComisiones(personas, citas, anterior).map((f, i) => ({
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

  return { filas: calcularComisiones(personas, citas, rango), pagos };
}
