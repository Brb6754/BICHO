import { addDaysKey } from '@/lib/dates/tenantTime';

// Las cuentas de Comisiones, sin base de datos ni React (mismo criterio
// que lib/caja/resumen.ts): entran personas, citas completadas y un
// periodo; sale cuánto vendió y cuánto le toca a cada quien.
//
// Dinero en centavos enteros y % en puntos base (12.5% = 1250): ninguna
// cuenta de dinero pasa por un float.

export const PERIODOS = ['semana', 'quincena', 'mes', 'rango'] as const;
export type PeriodoComision = (typeof PERIODOS)[number];

export type Rango = { desde: string; hasta: string };

const LLAVE = /^\d{4}-\d{2}-\d{2}$/;

function esLlave(s: string | undefined): s is string {
  return !!s && LLAVE.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));
}

function finDeMes(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 0, 12)).getUTCDate();
  return `${key.slice(0, 8)}${String(d).padStart(2, '0')}`;
}

/**
 * El periodo COMPLETO que contiene a `hoy` (se paga el periodo entero,
 * no "hasta hoy"): semana lunes–domingo, quincena 1–15 o 16–fin de mes,
 * mes 1–fin. `rango` usa desde/hasta; si vienen mal, cae a la quincena.
 */
export function periodoDe(tipo: PeriodoComision, hoy: string, desde?: string, hasta?: string): Rango {
  if (tipo === 'rango' && esLlave(desde) && esLlave(hasta)) {
    return desde <= hasta ? { desde, hasta } : { desde: hasta, hasta: desde };
  }
  if (tipo === 'semana') {
    const [y, m, d] = hoy.split('-').map(Number);
    const lunes = addDaysKey(hoy, -((new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7));
    return { desde: lunes, hasta: addDaysKey(lunes, 6) };
  }
  const inicioMes = `${hoy.slice(0, 8)}01`;
  if (tipo === 'mes') return { desde: inicioMes, hasta: finDeMes(hoy) };
  const dia = Number(hoy.slice(8, 10));
  return dia <= 15
    ? { desde: inicioMes, hasta: `${hoy.slice(0, 8)}15` }
    : { desde: `${hoy.slice(0, 8)}16`, hasta: finDeMes(hoy) };
}

/**
 * Comisión de un monto: vendido × bp / 10000, redondeado al centavo
 * más cercano con medio centavo hacia arriba. Todo en enteros.
 */
export function comisionCents(vendidoCents: number, pctBp: number): number {
  return Math.floor((vendidoCents * pctBp + 5000) / 10000);
}

/** "12.5" / "12,5" / "30%" → 1250 bp. null si no es un % válido (0–100, máx. 2 decimales). */
export function pctABp(texto: string): number | null {
  const limpio = texto.replace(/[\s%]/g, '').replace(',', '.');
  const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(limpio);
  if (!m) return null;
  const bp = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return bp > 10000 ? null : bp;
}

/** 1250 → "12.5", 3000 → "30". */
export function bpATexto(bp: number): string {
  const entero = Math.floor(bp / 100);
  const resto = bp % 100;
  if (!resto) return String(entero);
  return `${entero}.${String(resto).padStart(2, '0').replace(/0$/, '')}`;
}

export type Persona = { id: string; nombre: string; activo: boolean; pctBp: number };
export type CitaComisionable = { resourceId: string; dia: string; precioCents: number };

export type FilaComision = {
  resourceId: string;
  nombre: string;
  pctBp: number;
  citas: number;
  vendidoCents: number;
  comisionCents: number;
};

/**
 * Una fila por persona activa (y por las inactivas que sí tuvieron
 * citas en el periodo). La comisión se calcula sobre el total vendido
 * de la persona, no cita por cita: un solo redondeo por pago.
 */
export function calcularComisiones(personas: Persona[], citas: CitaComisionable[], rango: Rango): FilaComision[] {
  const tot = new Map<string, { citas: number; vendido: number }>();
  for (const c of citas) {
    if (c.dia < rango.desde || c.dia > rango.hasta) continue;
    const t = tot.get(c.resourceId) ?? { citas: 0, vendido: 0 };
    t.citas += 1;
    t.vendido += c.precioCents;
    tot.set(c.resourceId, t);
  }
  return personas
    .filter((p) => p.activo || tot.has(p.id))
    .map((p) => {
      const t = tot.get(p.id) ?? { citas: 0, vendido: 0 };
      return {
        resourceId: p.id,
        nombre: p.nombre,
        pctBp: p.pctBp,
        citas: t.citas,
        vendidoCents: t.vendido,
        comisionCents: comisionCents(t.vendido, p.pctBp),
      };
    });
}
