import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { addDaysKey, dayKey, longDate } from '@/lib/dates/tenantTime';
import type { Estilo } from '@/lib/branding/dashEstilo';
import type { Alerta, Dinero } from '@/components/tenant-dash/ResumenHoy';

// Lo que los cuatro estilos del Resumen comparten: las mismas props que
// recibía ResumenHoy y las mismas cuentas sobre ellas. Cada estilo solo
// acomoda y pinta; ninguno consulta nada.

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
  /** El checklist de "tu página todavía no puede recibir citas", si aplica. */
  setup?: React.ReactNode;
  estilo?: Estilo;
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

/** Las cuentas del día, una sola vez para cualquier estilo. */
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

/** "Pendientes": la misma lista en los estilos que la enseñan como renglones. */
export function ListaPendientes({ alertas }: { alertas: Alerta[] }) {
  if (!alertas.length) {
    return (
      <p className="flex items-center gap-3 rounded-[var(--rs-radius,1rem)] border border-dashed border-border px-4 py-4 text-sm text-muted">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success dark:text-[#4ADE80]">
          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
        Nada pendiente. Todo en orden.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {alertas.map((a) => {
        const Icon = a.icon;
        return (
          <li key={a.key}>
            <Link
              href={a.href}
              className="dash-row group flex min-h-[3.5rem] items-center gap-3 rounded-[var(--rs-radius,1rem)] border border-border bg-surface px-3.5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  a.tone === 'warning'
                    ? 'bg-warning-soft text-warning dark:text-[#FBBF24]'
                    : 'bg-primary text-[rgb(var(--color-cta-fg))]'
                }`}
                aria-hidden="true"
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-ink">{a.title}</span>
                {a.detail && <span className="block truncate text-[13px] text-muted">{a.detail}</span>}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Medidor semicircular: `valor` de 0 a 1. Pinta en currentColor sobre una pista tenue. */
export function Medidor({ valor, grosor = 14, className = '' }: { valor: number; grosor?: number; className?: string }) {
  const r = 50 - grosor / 2;
  const largo = Math.PI * r;
  const v = Math.min(1, Math.max(0, valor));
  return (
    <svg viewBox="0 0 100 54" className={className} aria-hidden="true">
      <path d={`M ${grosor / 2} 50 A ${r} ${r} 0 0 1 ${100 - grosor / 2} 50`} fill="none" stroke="currentColor" strokeOpacity={0.16} strokeWidth={grosor} strokeLinecap="round" />
      <path
        className="rs-medidor"
        d={`M ${grosor / 2} 50 A ${r} ${r} 0 0 1 ${100 - grosor / 2} 50`}
        fill="none"
        stroke="currentColor"
        strokeWidth={grosor}
        strokeLinecap="round"
        strokeDasharray={`${largo} ${largo}`}
        style={{ '--rs-largo': largo, strokeDashoffset: largo * (1 - v) } as React.CSSProperties}
      />
    </svg>
  );
}

/** Enlace con forma de pastilla. `tono` decide relleno o contorno; los colores salen del estilo. */
export function Pastilla({ href, children, tono = 'relleno' }: { href: string; children: React.ReactNode; tono?: 'relleno' | 'contorno' }) {
  return (
    <Link href={href} className={`rs-pill rs-pill-${tono}`}>
      {children}
    </Link>
  );
}
