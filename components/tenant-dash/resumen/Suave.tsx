import Link from 'next/link';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { formatTime } from '@/lib/dates/tenantTime';
import { formatoPesos } from '@/lib/caja/resumen';
import { ListaPendientes, Pastilla, enCuanto, plural, weekdayShort, type Dia, type ResumenProps } from './comun';

// SUAVE — tradicional y tranquilo: gris perla, tarjetas con relieve
// apenas visible y UN solo dato encendido en el color de acento. Todo lo
// demás va en tinta, para que ese dato sea lo primero que se ve.

function Burbujas({ d }: { d: Dia }) {
  const datos = [
    { label: 'Atendidas', n: d.done, clase: 'rs-burbuja-marca' },
    { label: 'Por atender', n: d.active.length - d.done, clase: 'rs-burbuja-acento' },
    { label: 'Canceladas', n: d.canceladas, clase: 'rs-burbuja-neutra' },
  ];
  const total = datos.reduce((s, x) => s + x.n, 0);
  // Área proporcional (raíz), con un mínimo para que el número quepa.
  const tam = (n: number) => (total ? Math.round(56 + 84 * Math.sqrt(n / total)) : 72);
  return (
    <div>
      <div className="flex h-44 items-center justify-center" role="img" aria-label={datos.map((x) => `${x.label}: ${x.n}`).join(', ')}>
        {datos
          .filter((x) => x.n > 0 || !total)
          .map((x, i) => (
            <span
              key={x.label}
              className={`rs-burbuja ${x.clase} flex shrink-0 items-center justify-center rounded-full text-xl font-semibold tabular-nums`}
              style={{ width: tam(x.n), height: tam(x.n), marginLeft: i ? -tam(x.n) * 0.22 : 0, zIndex: 3 - i } as React.CSSProperties}
            >
              {total ? x.n : 0}
            </span>
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-muted">
        {datos.map((x) => (
          <li key={x.label} className="flex items-center gap-1.5">
            <span className={`rs-burbuja ${x.clase} h-2.5 w-2.5 rounded-full`} aria-hidden="true" />
            {x.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Meta({ label, valor, total, texto }: { label: string; valor: number; total: number; texto: string }) {
  const pct = total ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-muted">{texto}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className="rs-meta block h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}

export function ResumenSuave({ p, d }: { p: ResumenProps; d: Dia }) {
  const { tz, active, done, next, inProgress, week, weekMax } = d;
  const dinero = p.dinero;
  const ventasMax = dinero ? Math.max(1, ...dinero.dias.map((x) => x.cents)) : 1;
  const mejorDia = dinero ? Math.max(...dinero.dias.map((x) => x.cents)) : 0;
  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="text-[15px] text-muted">{d.fecha}</p>
          <h1 className="mt-1 text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[2.75rem]">
            {d.saludo}, {p.tenantName}
          </h1>
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

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* El dato encendido. */}
        <section className="rs-card rs-destacado relative flex min-h-[15rem] flex-col p-6" aria-label={dinero ? 'Vendido hoy' : 'Citas hoy'}>
          <p className="text-[15px] font-semibold">{dinero ? 'Vendido hoy' : 'Citas hoy'}</p>
          <Link href={`${p.base}/${dinero ? 'caja' : 'calendar'}`} aria-label={dinero ? 'Abrir caja' : 'Abrir agenda'} className="rs-flecha absolute right-4 top-4">
            <ArrowUpRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
          <p className="mt-auto break-words text-[3.25rem] font-semibold leading-[0.95] tracking-[-0.045em] tabular-nums sm:text-[4rem]">
            {dinero ? formatoPesos(dinero.hoyCents) : active.length}
          </p>
          <p className="mt-3 text-sm font-medium opacity-80">
            {next
              ? inProgress
                ? `Cita en curso hasta las ${formatTime(next.ends_at, tz)}`
                : `Siguiente: ${formatTime(next.starts_at, tz)}, ${enCuanto(new Date(next.starts_at).getTime() - p.now.getTime()).toLowerCase()}`
              : active.length
                ? 'Terminaste por hoy'
                : 'Hoy no hay citas'}
          </p>
        </section>

        <section className="rs-card p-6" aria-label="Cómo va el día">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">Cómo va el día</h2>
          <Burbujas d={d} />
        </section>

        <section className="rs-card flex flex-col gap-5 p-6 md:col-span-2 xl:col-span-1" aria-label="Metas">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">Metas</h2>
          <Meta label="Citas atendidas" valor={done} total={active.length} texto={`${done} de ${active.length}`} />
          <Meta label="Días con citas esta semana" valor={d.diasConCitas} total={7} texto={`${d.diasConCitas} de 7`} />
          {dinero ? (
            <Meta label="Hoy contra tu mejor día" valor={dinero.hoyCents} total={mejorDia} texto={formatoPesos(dinero.hoyCents)} />
          ) : (
            <Meta label="Pendientes resueltos" valor={p.alertas.length ? 0 : 1} total={1} texto={p.alertas.length ? `${p.alertas.length} abiertos` : 'Todo en orden'} />
          )}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rs-card p-6" aria-label="La semana">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">La semana</h2>
            <ul className="flex gap-4 text-[13px] text-muted">
              {dinero && (
                <li className="flex items-center gap-1.5">
                  <span className="rs-bar-acento h-2.5 w-2.5 rounded-full" aria-hidden="true" />
                  Vendido la semana pasada
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <span className="rs-bar-sec h-2.5 w-2.5 rounded-full" aria-hidden="true" />
                Citas que vienen
              </li>
            </ul>
          </div>
          {/* Mismo día de la semana lado a lado: el martes pasado contra el que viene. */}
          <ol className="mt-6 flex h-48 items-end justify-between gap-2 sm:gap-4">
            {week.map((w, i) => {
              const venta = dinero?.dias[i];
              return (
                <li
                  key={w.key}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  aria-label={`${weekdayShort(w.key)}: ${plural(w.count, 'cita', 'citas')}${venta ? `, ${formatoPesos(venta.cents)} vendidos el anterior` : ''}`}
                >
                  <span className="flex h-full w-full items-end justify-center gap-1">
                    {venta && <span className="dash-bar rs-bar-acento w-full max-w-[1.1rem] rounded-full" style={{ height: `${Math.max(4, (venta.cents / ventasMax) * 100)}%`, '--i': i } as React.CSSProperties} />}
                    <span className="dash-bar rs-bar-sec w-full max-w-[1.1rem] rounded-full" style={{ height: `${Math.max(4, (w.count / weekMax) * 100)}%`, '--i': i + 1 } as React.CSSProperties} />
                  </span>
                  <span className="text-xs capitalize text-muted">{weekdayShort(w.key).slice(0, 2)}</span>
                </li>
              );
            })}
          </ol>
        </section>
        <section aria-label="Pendientes">
          <SectionHeading title="Pendientes" meta={p.alertas.length || undefined} />
          <ListaPendientes alertas={p.alertas} />
        </section>
      </div>

      <section className="mt-12">
        <SectionHeading title="Agenda de hoy" meta={active.length || undefined} />
        <AgendaList bookings={p.today} timezone={tz} now={p.now} hideDayHeader emptyTitle="Nada agendado para hoy" emptyHint="Las citas que tus clientes reserven desde tu página van a aparecer aquí, en el orden del día." />
      </section>
      <section className="mt-12">
        <SectionHeading title="Próximos días" meta={p.upcoming.length || undefined} action={<Pastilla href={`${p.base}/calendar`} tono="contorno">Agenda completa</Pastilla>} />
        <AgendaList bookings={p.upcoming} timezone={tz} now={p.now} emptyTitle="Semana libre por ahora" emptyHint="No hay citas en los próximos siete días." />
      </section>
    </div>
  );
}
