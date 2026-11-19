import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { addDaysKey, dayKey, longDate } from '@/lib/dates/tenantTime';
import type { Alerta, Dinero } from '@/components/tenant-dash/ResumenHoy';
import type { TileModulo } from '@/lib/branding/moduloColores';

// Las props del inicio y las cuentas sobre ellas. El inicio solo acomoda
// y pinta; no consulta nada.

export type ResumenProps = {
  tenantName: string;
  now: Date;
  timezone: string | null;
  /** Las citas de hoy, todas (canceladas incluidas: la agenda las enseña tachadas). */
  today: AgendaBooking[];
  /** Confirmadas de los próximos días. */
  upcoming: AgendaBooking[];
  dinero: Dinero | null;
  alertas: Alerta[];
  base: string;
  action?: React.ReactNode;
  /** "Apartados por cobrar" (citas esperando anticipo), si hay alguno. */
  apartados?: React.ReactNode;
  /** El checklist de "tu página todavía no puede recibir citas", si aplica. */
  setup?: React.ReactNode;
  /** La cuadrícula de módulos del inicio. */
  modulos?: TileModulo[];
  /** Solo la demo: con qué llenar las hojas de ejemplo (agendar, bloquear). */
  demo?: { servicios: string[]; personas: string[]; hoyKey: string };
};

function hourIn(now: Date, timezone: string | null): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone || 'America/Mexico_City' }).format(now)
  );
}

export function enCuanto(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `En ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `En ${h} h ${m} min` : `En ${h} h`;
}

export function weekdayShort(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d, 12)))
    .replace('.', '');
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Las cuentas del día. */
export function armar(p: ResumenProps) {
  const tz = p.timezone;
  const active = p.today.filter((b) => b.status !== 'cancelled');
  const canceladas = p.today.length - active.length;
  const done = active.filter((b) => b.status === 'completed' || new Date(b.ends_at) <= p.now).length;
  const next = active.find((b) => b.status === 'confirmed' && new Date(b.ends_at) > p.now);
  const inProgress = next ? new Date(next.starts_at) <= p.now : false;
  const todayKey = dayKey(p.now, tz);
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysKey(todayKey, i + 1);
    return { key, count: p.upcoming.filter((b) => dayKey(b.starts_at, tz) === key).length };
  });
  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const diasConCitas = week.filter((d) => d.count > 0).length;
  const avance = active.length ? done / active.length : 0;
  const h = hourIn(p.now, tz);
  return {
    tz,
    active,
    canceladas,
    done,
    next,
    inProgress,
    week,
    weekMax,
    diasConCitas,
    avance,
    saludo: h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches',
    fecha: longDate(p.now, tz),
  };
}
export type Dia = ReturnType<typeof armar>;
