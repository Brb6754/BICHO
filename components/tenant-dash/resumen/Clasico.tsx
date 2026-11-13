import Link from 'next/link';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { formatTime } from '@/lib/dates/tenantTime';
import { formatoPesos } from '@/lib/caja/resumen';
import { ListaPendientes, Medidor, Pastilla, enCuanto, plural, weekdayShort, type Dia, type ResumenProps } from './comun';

// CLÁSICO — tablero tradicional: marco blanco grande sobre gris, cuatro
// tarjetas de dato con el número gigante (la primera rellena en la
// marca), la semana como barras-píldora y el avance del día en un
// medidor. Lo que todo dueño reconoce sin que se le explique.

function Kpi({
  label,
  valor,
  detalle,
  href,
  destacada = false,
}: {
  label: string;
  valor: React.ReactNode;
  detalle: string;
  href: string;
  destacada?: boolean;
}) {
  return (
    <div className={`rs-card rs-kpi relative flex min-h-[10.5rem] flex-col p-5 sm:p-6 ${destacada ? 'rs-kpi-marca' : ''}`}>
      <p className="pr-12 text-[15px] font-medium">{label}</p>
      <Link href={href} aria-label={`Abrir ${label.toLowerCase()}`} className="rs-flecha absolute right-4 top-4">
        <ArrowUpRight className="h-[18px] w-[18px]" aria-hidden="true" />
      </Link>
      <p className="mt-auto pt-4 text-[2.75rem] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[3.25rem]">{valor}</p>
      <p className="rs-kpi-detalle mt-2 text-[13px]">{detalle}</p>
    </div>
  );
}

export function ResumenClasico({ p, d }: { p: ResumenProps; d: Dia }) {
  const { tz, active, done, next, inProgress, week, weekMax, avance } = d;
  const hoy = p.dinero ? p.dinero.hoyCents : null;
  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[2.75rem]">{d.saludo}</h1>
          <p className="mt-2 text-[15px] text-muted">
            <span className="font-medium text-ink">{p.tenantName}</span>, <span>{d.fecha}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pastilla href={`${p.base}/calendar`}>
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Abrir agenda
          </Pastilla>
          {p.action}
        </div>
      </header>

      {p.setup}

      <section aria-label="Datos del día" className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi
          destacada
          label="Citas hoy"
          valor={active.length}
          detalle={next ? (inProgress ? 'Una en curso ahora' : `La siguiente ${enCuanto(new Date(next.starts_at).getTime() - p.now.getTime()).toLowerCase()}`) : 'Sin más por hoy'}
          href={`${p.base}/calendar`}
        />
        <Kpi label="Atendidas" valor={<>{done}<span className="text-[0.45em] font-medium text-muted">/{active.length}</span></>} detalle={active.length ? `${Math.round(avance * 100)}% del día` : 'Todavía nada'} href={`${p.base}/calendar`} />
        <Kpi label="Próximos 7 días" valor={p.upcoming.length} detalle={`${plural(d.diasConCitas, 'día', 'días')} con citas`} href={`${p.base}/calendar`} />
        {hoy !== null ? (
          <Kpi label="Vendido hoy" valor={<span className="text-[0.8em]">{formatoPesos(hoy)}</span>} detalle={`${formatoPesos(p.dinero!.semanaCents)} en la semana`} href={`${p.base}/caja`} />
        ) : (
          <Kpi label="Pendientes" valor={p.alertas.length} detalle={p.alertas.length ? 'Piden tu atención' : 'Todo en orden'} href={`${p.base}/customers`} />
        )}
      </section>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rs-card p-5 sm:p-6" aria-label="Tu semana">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">Tu semana</h2>
            <p className="text-[13px] text-muted">citas por día</p>
          </div>
          <ol className="mt-6 flex h-44 items-end justify-between gap-2 sm:gap-3" aria-label="Citas por día, próximos 7 días">
            {week.map((w, i) => {
              const alto = w.count ? Math.max(22, (w.count / weekMax) * 100) : 100;
              const tope = w.count === weekMax && w.count > 0;
              return (
                <li key={w.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" aria-label={`${weekdayShort(w.key)} ${Number(w.key.slice(8))}: ${plural(w.count, 'cita', 'citas')}`}>
                  {w.count > 0 && <span className="text-xs font-semibold tabular-nums text-ink">{w.count}</span>}
                  <span
                    className={`dash-bar w-full max-w-[3.25rem] rounded-full ${w.count ? (tope ? 'rs-bar-marca' : 'rs-bar-marca-suave') : 'rs-bar-vacia'}`}
                    style={{ height: `${alto}%`, '--i': i } as React.CSSProperties}
                  />
                  <span className="text-xs capitalize text-muted">{weekdayShort(w.key).slice(0, 2)}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rs-card flex flex-col p-5 sm:p-6" aria-label="Avance de hoy">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">Avance de hoy</h2>
          <div className="relative mx-auto mt-5 w-full max-w-[16rem]">
            <Medidor valor={avance} className="rs-medidor-marca w-full" />
            <div className="absolute inset-x-0 bottom-0 text-center">
              <p className="text-[2.5rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-ink">{Math.round(avance * 100)}%</p>
              <p className="mt-1 text-[13px] text-muted">del día atendido</p>
            </div>
          </div>
          <dl className="mt-auto grid grid-cols-2 gap-3 pt-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="rs-bar-marca h-2.5 w-2.5 rounded-full" aria-hidden="true" />
              <dt className="text-muted">Atendidas</dt>
              <dd className="ml-auto font-semibold tabular-nums text-ink">{done}</dd>
            </div>
            <div className="flex items-center gap-2">
              <span className="rs-bar-vacia h-2.5 w-2.5 rounded-full" aria-hidden="true" />
              <dt className="text-muted">Por atender</dt>
              <dd className="ml-auto font-semibold tabular-nums text-ink">{active.length - done}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside className="flex min-w-0 flex-col gap-8 lg:order-2" aria-label="Pendientes y dinero">
          <section>
            <SectionHeading title="Pendientes" meta={p.alertas.length || undefined} />
            <ListaPendientes alertas={p.alertas} />
          </section>
          {next && (
            <section className="rs-card p-5" aria-label="Siguiente cita">
              <p className="text-[13px] font-medium text-muted">{inProgress ? `En curso, termina ${formatTime(next.ends_at, tz)}` : 'Siguiente cita'}</p>
              <p className="mt-2 text-[2.25rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-ink">{formatTime(next.starts_at, tz)}</p>
              <p className="mt-2 truncate font-semibold text-ink">{next.service_types?.name ?? 'Cita'}</p>
              <p className="truncate text-sm text-muted">con {next.customers?.name ?? 'cliente'}</p>
            </section>
          )}
        </aside>
        <div className="min-w-0 lg:order-1">
          <section>
            <SectionHeading title="Agenda de hoy" meta={active.length || undefined} />
            <AgendaList bookings={p.today} timezone={tz} now={p.now} hideDayHeader emptyTitle="Nada agendado para hoy" emptyHint="Las citas que tus clientes reserven desde tu página van a aparecer aquí, en el orden del día." />
          </section>
          <section className="mt-12">
            <SectionHeading title="Próximos días" meta={p.upcoming.length || undefined} action={<Pastilla href={`${p.base}/calendar`} tono="contorno">Agenda completa</Pastilla>} />
            <AgendaList bookings={p.upcoming} timezone={tz} now={p.now} emptyTitle="Semana libre por ahora" emptyHint="No hay citas en los próximos siete días." />
          </section>
        </div>
      </div>
    </div>
  );
}
