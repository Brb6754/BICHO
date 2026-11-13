import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { formatTime } from '@/lib/dates/tenantTime';
import { CuentaArriba } from './CuentaArriba';
import { enCuanto, plural, weekdayShort, type Dia, type ResumenProps } from './comun';

// PÓSTER — innovador: siempre oscuro, un mosaico de piezas de tamaños
// distintos y la hora de la siguiente cita impresa como cartel. La marca
// no pinta superficies: entra como luz detrás de la pieza principal y
// como el color de los datos. Los números cuentan al entrar, una vez.

function Pieza({ className = '', children, href, label }: { className?: string; children: React.ReactNode; href?: string; label: string }) {
  const clase = `rs-pieza group relative flex min-w-0 flex-col overflow-hidden rounded-[28px] p-5 sm:p-6 ${className}`;
  return href ? (
    <Link href={href} aria-label={label} className={`${clase} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--tenant-dark-glow))]`}>
      <ArrowUpRight className="rs-pieza-flecha absolute right-5 top-5 h-5 w-5" aria-hidden="true" />
      {children}
    </Link>
  ) : (
    <section aria-label={label} className={clase}>
      {children}
    </section>
  );
}

export function ResumenPoster({ p, d }: { p: ResumenProps; d: Dia }) {
  const { tz, active, done, next, inProgress, week, weekMax, avance } = d;
  const dinero = p.dinero;
  const display = 'font-[family-name:var(--font-central)]';
  return (
    <div className="rs-poster">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className={`${display} text-[2.75rem] font-bold leading-[0.9] tracking-[-0.045em] text-ink sm:text-[4.5rem]`}>{d.saludo}</h1>
          <p className="mt-3 text-[15px] text-muted">
            {p.tenantName}, <span>{d.fecha}</span>
          </p>
        </div>
        {p.action && <div className="shrink-0">{p.action}</div>}
      </header>

      {p.setup}

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {/* La pieza principal: la hora como cartel. */}
        <Pieza label="Siguiente cita" className="rs-pieza-luz col-span-2 min-h-[18rem] lg:row-span-2 lg:min-h-[26rem]">
          <p className="text-[15px] font-medium text-muted">
            {next ? (inProgress ? `En curso, termina ${formatTime(next.ends_at, tz)}` : enCuanto(new Date(next.starts_at).getTime() - p.now.getTime())) : 'Hoy'}
          </p>
          {next ? (
            <>
              <p className={`${display} mt-auto text-[5.5rem] font-bold leading-[0.8] tracking-[-0.06em] tabular-nums text-ink sm:text-[8.5rem] xl:text-[10rem]`}>
                {formatTime(next.starts_at, tz)}
              </p>
              <p className="mt-5 truncate text-xl font-semibold text-ink sm:text-2xl">{next.service_types?.name ?? 'Cita'}</p>
              <p className="truncate text-[15px] text-muted">
                con {next.customers?.name ?? 'cliente'}
                {next.resources?.name ? `, ${next.resources.name}` : ''}
              </p>
            </>
          ) : (
            <p className={`${display} mt-auto text-[3.5rem] font-bold leading-[0.9] tracking-[-0.05em] text-ink sm:text-[5rem]`}>
              {active.length ? 'Terminaste por hoy' : 'Día libre'}
            </p>
          )}
        </Pieza>

        <Pieza label="Citas hoy" href={`${p.base}/calendar`} className="min-h-[11rem]">
          <p className="text-sm text-muted">Citas hoy</p>
          <p className={`${display} rs-dato mt-auto text-[4rem] font-bold leading-none tracking-[-0.05em] sm:text-[5rem]`}>
            <CuentaArriba valor={active.length} />
          </p>
        </Pieza>

        <Pieza label="Atendidas" className="min-h-[11rem]">
          <p className="text-sm text-muted">Atendidas</p>
          <p className={`${display} mt-auto text-[4rem] font-bold leading-none tracking-[-0.05em] text-ink sm:text-[5rem]`}>
            <CuentaArriba valor={Math.round(avance * 100)} />
            <span className="text-[0.45em] text-muted">%</span>
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {done} de {active.length}
          </p>
        </Pieza>

        {dinero ? (
          <Pieza label="Vendido hoy" href={`${p.base}/caja`} className="col-span-2 min-h-[11rem] lg:col-span-1">
            <p className="text-sm text-muted">Vendido hoy</p>
            <p className={`${display} rs-dato mt-auto break-words text-[2.75rem] font-bold leading-none tracking-[-0.05em] sm:text-[3rem]`}>
              <CuentaArriba valor={dinero.hoyCents} pesos />
            </p>
          </Pieza>
        ) : (
          <Pieza label="Próximos 7 días" href={`${p.base}/calendar`} className="col-span-2 min-h-[11rem] lg:col-span-1">
            <p className="text-sm text-muted">Próximos 7 días</p>
            <p className={`${display} rs-dato mt-auto text-[4rem] font-bold leading-none tracking-[-0.05em]`}>
              <CuentaArriba valor={p.upcoming.length} />
            </p>
          </Pieza>
        )}

        <Pieza label={p.alertas.length ? `${p.alertas.length} pendientes` : 'Pendientes'} href={p.alertas[0]?.href} className="col-span-2 min-h-[11rem] lg:col-span-1">
          <p className="text-sm text-muted">Pendientes</p>
          <p className={`${display} mt-auto text-[4rem] font-bold leading-none tracking-[-0.05em] text-ink`}>{p.alertas.length}</p>
          <p className="mt-1 line-clamp-2 text-[13px] text-muted">{p.alertas[0]?.title ?? 'Todo en orden'}</p>
        </Pieza>

        <Pieza label="La semana" className="col-span-2 min-h-[13rem] lg:col-span-4">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm text-muted">La semana que viene</p>
            <p className={`${display} text-2xl font-bold tabular-nums text-ink`}>{plural(p.upcoming.length, 'cita', 'citas')}</p>
          </div>
          <ol className="mt-5 flex h-28 flex-1 items-end gap-2 sm:gap-3">
            {week.map((w, i) => (
              <li key={w.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" aria-label={`${weekdayShort(w.key)}: ${plural(w.count, 'cita', 'citas')}`}>
                <span className={`dash-bar w-full rounded-xl ${w.count ? 'rs-bar-luz' : 'bg-white/[0.06]'}`} style={{ height: `${Math.max(6, (w.count / weekMax) * 100)}%`, '--i': i } as React.CSSProperties} />
                <span className="text-xs capitalize text-muted">{weekdayShort(w.key).slice(0, 2)}</span>
              </li>
            ))}
          </ol>
        </Pieza>

        <Pieza label="Agenda de hoy" className="col-span-2">
          <h2 className={`${display} mb-4 text-2xl font-bold tracking-tight text-ink`}>Agenda de hoy</h2>
          <AgendaList bookings={p.today} timezone={tz} now={p.now} hideDayHeader emptyTitle="Nada agendado para hoy" emptyHint="Las citas que tus clientes reserven van a aparecer aquí." />
        </Pieza>
        <Pieza label="Próximos días" className="col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className={`${display} text-2xl font-bold tracking-tight text-ink`}>Próximos días</h2>
            <Link href={`${p.base}/calendar`} className="rs-pill rs-pill-contorno">
              Agenda completa
            </Link>
          </div>
          <AgendaList bookings={p.upcoming} timezone={tz} now={p.now} emptyTitle="Semana libre por ahora" emptyHint="No hay citas en los próximos siete días." />
        </Pieza>
      </div>
    </div>
  );
}
