import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Check, ChevronRight, Package, HeartHandshake } from 'lucide-react';
import { AgendaList, type AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { addDaysKey, dayKey, formatTime, longDate } from '@/lib/dates/tenantTime';
import { formatoPesos, rangoDe, resumir, type Movimiento } from '@/lib/caja/resumen';

// EL RESUMEN — la pantalla con la que la dueña abre el día.
//
// Una sola pregunta manda: "¿qué tengo hoy?". Por eso la página no abre
// con una fila de contadores iguales sino con UNA pieza grande en el
// color del negocio: la siguiente cita, cuánto falta, y la forma del día
// entero como una barra (lo que ya pasó lleno, lo que viene en hueco).
// Debajo, lo que pide atención (inventario, clientas por regresar), el
// dinero del día y la agenda.
//
// Es la misma pieza para el panel real (/dashboard) y la demo sin login
// (/panel): cada página junta sus datos y esta solo pinta. `base` es el
// segmento de los enlaces, igual que navBase en el Sidebar.

export type Alerta = {
  key: string;
  icon: LucideIcon;
  tone: 'warning' | 'brand';
  title: string;
  detail?: string;
  href: string;
};

export type Dinero = { hoyCents: number; semanaCents: number; dias: { key: string; cents: number }[] };

/** Ventas de hoy, de la semana y de los últimos 7 días, de los mismos movimientos que la Caja. */
export function dineroDe(movs: Movimiento[], hoy: string): Dinero {
  const semana = rangoDe('semana', hoy);
  return {
    hoyCents: resumir(movs, hoy, hoy).vendidoCents,
    semanaCents: resumir(movs, semana.desde, semana.hasta).vendidoCents,
    dias: Array.from({ length: 7 }, (_, i) => {
      const key = addDaysKey(hoy, i - 6);
      return { key, cents: resumir(movs, key, key).vendidoCents };
    }),
  };
}

/** Las alertas que el Resumen sabe armar, con el mismo texto en el panel real y en la demo. */
export function alertaInventario(nombres: string[], base: string): Alerta | null {
  if (!nombres.length) return null;
  return {
    key: 'inventario',
    icon: Package,
    tone: 'warning',
    title: nombres.length === 1 ? 'Se está acabando 1 producto' : `Se están acabando ${nombres.length} productos`,
    detail: nombres.slice(0, 3).join(', ') + (nombres.length > 3 ? '…' : ''),
    href: `${base}/inventario`,
  };
}

export function alertaRegresan(nombres: string[], semanas: number, base: string): Alerta | null {
  if (!nombres.length) return null;
  return {
    key: 'regresan',
    icon: HeartHandshake,
    tone: 'brand',
    title:
      nombres.length === 1
        ? `1 clienta no ha vuelto en ${semanas} semanas`
        : `${nombres.length} clientas no han vuelto en ${semanas} semanas`,
    detail: 'Escríbeles hoy: ' + nombres.slice(0, 3).join(', ') + (nombres.length > 3 ? '…' : ''),
    href: `${base}/regresan`,
  };
}

function hourIn(now: Date, timezone: string | null): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: timezone || 'America/Mexico_City',
    }).format(now)
  );
}

function saludo(now: Date, timezone: string | null): string {
  const h = hourIn(now, timezone);
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function enCuanto(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `En ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `En ${h} h ${m} min` : `En ${h} h`;
}

function weekdayShort(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d, 12)))
    .replace('.', '');
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function ResumenHoy({
  tenantName,
  now,
  timezone,
  today,
  upcoming,
  dinero,
  alertas,
  base,
  action,
  setup,
}: {
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
}) {
  const tz = timezone;
  const active = today.filter((b) => b.status !== 'cancelled');
  const done = active.filter((b) => b.status === 'completed' || new Date(b.ends_at) <= now).length;
  const next = active.find((b) => b.status === 'confirmed' && new Date(b.ends_at) > now);
  const inProgress = next ? new Date(next.starts_at) <= now : false;

  // La forma del día: de la primera hora a la última, cada cita un tramo.
  const t0 = active.length ? Math.min(...active.map((b) => new Date(b.starts_at).getTime())) : 0;
  const t1 = active.length ? Math.max(...active.map((b) => new Date(b.ends_at).getTime())) : 0;
  const span = Math.max(1, t1 - t0);
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - t0) / span) * 100));
  const nowPct = now.getTime() > t0 && now.getTime() < t1 ? pct(now.getTime()) : null;

  const todayKey = dayKey(now, tz);
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysKey(todayKey, i + 1);
    return { key, count: upcoming.filter((b) => dayKey(b.starts_at, tz) === key).length };
  });
  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const diasMax = dinero ? Math.max(1, ...dinero.dias.map((d) => d.cents)) : 1;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[2.6rem]">
            {saludo(now, tz)}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            <span className="font-medium text-ink">{tenantName}</span>
            <span aria-hidden="true"> · </span>
            <span className="first-letter:uppercase">{longDate(now, tz)}</span>
          </p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      {setup}

      {/* LA PIEZA DEL DÍA. Color sólido del negocio; el texto usa
          --color-cta-fg, que se calcula por contraste contra ese mismo
          color, así que una marca crema lleva texto oscuro y una vino
          lleva texto blanco sin tocar nada aquí. */}
      <section
        aria-label="Tu día"
        className="dash-hero relative mt-7 overflow-hidden rounded-[28px] bg-primary px-5 pb-5 pt-6 text-[rgb(var(--color-cta-fg))] sm:px-8 sm:pb-7 sm:pt-8"
      >
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0" style={{ '--i': 1 } as React.CSSProperties}>
            {next ? (
              <>
                <p className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--color-cta-fg)/0.14)] px-3 py-1 text-[13px] font-semibold">
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    {inProgress && (
                      <span className="dash-ping absolute inset-0 rounded-full bg-[rgb(var(--color-cta-fg))]" />
                    )}
                    <span className="relative h-2 w-2 rounded-full bg-[rgb(var(--color-cta-fg))]" />
                  </span>
                  {inProgress
                    ? `En curso · termina ${formatTime(next.ends_at, tz)}`
                    : enCuanto(new Date(next.starts_at).getTime() - now.getTime())}
                </p>
                <p className="mt-4 text-[3.25rem] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[4.5rem]">
                  {formatTime(next.starts_at, tz)}
                </p>
                <p className="mt-3 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {next.service_types?.name ?? 'Cita'}
                </p>
                <p className="mt-1 truncate text-[15px] text-[rgb(var(--color-cta-fg)/0.85)]">
                  con {next.customers?.name ?? 'cliente'}
                  {next.resources?.name ? ` · ${next.resources.name}` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3rem]">
                  {active.length ? 'Terminaste por hoy' : 'Hoy no hay citas'}
                </p>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[rgb(var(--color-cta-fg)/0.85)]">
                  {active.length
                    ? `Atendiste ${plural(done, 'cita', 'citas')}. Lo de mañana está abajo.`
                    : 'Un buen día para compartir tu enlace de reservas por WhatsApp o en tu Instagram.'}
                </p>
              </>
            )}
          </div>

          {/* Tres datos del día, como frase corta y no como tarjetas. */}
          <dl
            className="grid grid-cols-3 gap-4 border-t border-[rgb(var(--color-cta-fg)/0.18)] pt-5 lg:min-w-[15rem] lg:grid-cols-1 lg:gap-3 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            <div>
              <dt className="text-[13px] text-[rgb(var(--color-cta-fg)/0.85)]">Citas hoy</dt>
              <dd className="text-2xl font-semibold tabular-nums tracking-tight">{active.length}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-[rgb(var(--color-cta-fg)/0.85)]">Atendidas</dt>
              <dd className="text-2xl font-semibold tabular-nums tracking-tight">
                {done}
                <span className="text-base font-medium text-[rgb(var(--color-cta-fg)/0.85)]">/{active.length}</span>
              </dd>
            </div>
            {dinero ? (
              <div className="min-w-0">
                <dt className="text-[13px] text-[rgb(var(--color-cta-fg)/0.85)]">Vendido hoy</dt>
                <dd className="truncate text-2xl font-semibold tabular-nums tracking-tight">{formatoPesos(dinero.hoyCents)}</dd>
              </div>
            ) : (
              <div>
                <dt className="text-[13px] text-[rgb(var(--color-cta-fg)/0.85)]">Próx. 7 días</dt>
                <dd className="text-2xl font-semibold tabular-nums tracking-tight">{upcoming.length}</dd>
              </div>
            )}
          </dl>
        </div>

        {active.length > 0 && (
          <div className="relative mt-7" style={{ '--i': 3 } as React.CSSProperties}>
            <div
              role="img"
              aria-label={`${plural(active.length, 'cita', 'citas')} entre ${formatTime(new Date(t0).toISOString(), tz)} y ${formatTime(new Date(t1).toISOString(), tz)}, ${done} ya pasaron`}
              className="dash-track relative h-3 rounded-full bg-[rgb(var(--color-cta-fg)/0.12)]"
            >
              {active.map((b) => {
                const s = new Date(b.starts_at).getTime();
                const e = new Date(b.ends_at).getTime();
                const past = b.status === 'completed' || e <= now.getTime();
                const live = !past && s <= now.getTime();
                return (
                  <span
                    key={b.id}
                    className={`absolute inset-y-0 rounded-full ${
                      past
                        ? 'bg-[rgb(var(--color-cta-fg)/0.9)]'
                        : live
                          ? 'bg-[rgb(var(--color-cta-fg)/0.65)]'
                          : 'bg-[rgb(var(--color-cta-fg)/0.3)]'
                    }`}
                    style={{ left: `${pct(s)}%`, width: `max(6px, ${pct(e) - pct(s)}%)` }}
                  />
                );
              })}
              {nowPct !== null && (
                <span
                  className="absolute -inset-y-1.5 w-[3px] -translate-x-1/2 rounded-full bg-[rgb(var(--color-cta-fg))] shadow-[0_0_0_3px_rgb(var(--color-primary))]"
                  style={{ left: `${nowPct}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="mt-2 flex justify-between text-xs tabular-nums text-[rgb(var(--color-cta-fg)/0.85)]" aria-hidden="true">
              <span>{formatTime(new Date(t0).toISOString(), tz)}</span>
              <span>{formatTime(new Date(t1).toISOString(), tz)}</span>
            </div>
          </div>
        )}
      </section>

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12">
        {/* Columna lateral primero en el DOM para que en el teléfono lo
            que pide atención quede justo debajo de la pieza del día. */}
        <aside className="flex min-w-0 flex-col gap-8 lg:order-2" aria-label="Pendientes y dinero">
          <section>
            <SectionHeading title="Pendientes" meta={alertas.length || undefined} />
            {alertas.length ? (
              <ul className="flex flex-col gap-2">
                {alertas.map((a) => {
                  const Icon = a.icon;
                  return (
                    <li key={a.key}>
                      <Link
                        href={a.href}
                        className="dash-row group flex min-h-[3.5rem] items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            a.tone === 'warning'
                              ? 'bg-warning-soft text-warning dark:text-[#FBBF24]'
                              : 'bg-primary text-[rgb(var(--color-cta-fg))] dark:bg-[rgb(var(--tenant-dark-glow)/0.2)] dark:text-ink'
                          }`}
                          aria-hidden="true"
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-snug text-ink">{a.title}</span>
                          {a.detail && <span className="block truncate text-[13px] text-muted">{a.detail}</span>}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success dark:text-[#4ADE80]">
                  <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                </span>
                Nada pendiente. Todo en orden.
              </p>
            )}
          </section>

          {dinero && (
            <section>
              <SectionHeading
                title="Dinero"
                action={
                  <Link
                    href={`${base}/caja`}
                    className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-sm text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Abrir caja
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              />
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="text-[2rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">
                  {formatoPesos(dinero.semanaCents)}
                </p>
                <p className="mt-1.5 text-sm text-muted">vendido esta semana</p>
                {/* Siete días de ventas reales, hoy al final y en el color
                    del negocio. Barras con borde para que una marca crema
                    no desaparezca sobre la tarjeta blanca. */}
                <div className="mt-5 flex h-20 items-end gap-1.5" role="img" aria-label="Ventas de los últimos 7 días">
                  {dinero.dias.map((d, i) => (
                    <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <span
                        className={`dash-bar w-full rounded-md ring-1 ring-inset ring-ink/10 ${
                          i === 6
                            ? 'bg-primary dark:bg-[rgb(var(--tenant-dark-glow))]'
                            : 'bg-primary/40 dark:bg-[rgb(var(--tenant-dark-glow)/0.4)]'
                        }`}
                        style={
                          {
                            height: `${Math.max(6, (d.cents / diasMax) * 100)}%`,
                            '--i': i,
                          } as React.CSSProperties
                        }
                      />
                      <span className={`text-[11px] ${i === 6 ? 'font-semibold text-ink' : 'text-muted'}`}>
                        {i === 6 ? 'hoy' : weekdayShort(d.key).slice(0, 2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </aside>

        <div className="min-w-0 lg:order-1">
          <section>
            <SectionHeading title="Agenda de hoy" meta={active.length || undefined} />
            <AgendaList
              bookings={today}
              timezone={tz}
              now={now}
              hideDayHeader
              emptyTitle="Nada agendado para hoy"
              emptyHint="Las citas que tus clientes reserven desde tu página van a aparecer aquí, en el orden del día."
            />
          </section>

          <section className="mt-12">
            <SectionHeading
              title="Próximos días"
              meta={upcoming.length || undefined}
              action={
                <Link
                  href={`${base}/calendar`}
                  className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-sm text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Agenda completa
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            />
            {/* La semana de un vistazo: qué días vienen llenos. */}
            <ol className="mb-5 grid grid-cols-7 gap-1.5" aria-label="Citas por día, próximos 7 días">
              {week.map((d) => (
                <li
                  key={d.key}
                  className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-1 pb-2 pt-2.5"
                  aria-label={`${weekdayShort(d.key)} ${Number(d.key.slice(8))}: ${plural(d.count, 'cita', 'citas')}`}
                >
                  <span className="text-[11px] capitalize text-muted">{weekdayShort(d.key)}</span>
                  <span className="text-sm font-semibold tabular-nums text-ink">{Number(d.key.slice(8))}</span>
                  <span className="flex h-8 w-1.5 items-end overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden="true">
                    <span
                      className="w-full rounded-full bg-primary ring-1 ring-inset ring-ink/10 dark:bg-[rgb(var(--tenant-dark-glow))]"
                      style={{ height: `${(d.count / weekMax) * 100}%` }}
                    />
                  </span>
                  <span className={`text-[11px] tabular-nums ${d.count ? 'font-medium text-ink' : 'text-muted'}`}>
                    {d.count}
                  </span>
                </li>
              ))}
            </ol>
            <AgendaList
              bookings={upcoming}
              timezone={tz}
              now={now}
              emptyTitle="Semana libre por ahora"
              emptyHint="No hay citas en los próximos siete días."
            />
          </section>
        </div>
      </div>
    </div>
  );
}
