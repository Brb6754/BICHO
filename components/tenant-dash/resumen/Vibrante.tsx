import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, CalendarDays, CalendarCheck2, CalendarRange, CircleCheckBig, Wallet } from 'lucide-react';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { formatoPesos } from '@/lib/caja/resumen';
import { Medidor, plural, weekdayShort, type Dia, type ResumenProps } from './comun';

// VIBRANTE — innovador: la mitad de arriba ES la marca (fondo sólido,
// título gigante, el número del día enorme y un medidor), y abajo una
// banda negra con el historial y tarjetas de colores saturados. Los
// colores de estado de esa banda son fijos a propósito: rojo, azul y
// lima significan lo mismo en cualquier negocio.

function Puntos({ total, llenos }: { total: number; llenos: number }) {
  return (
    <span className="flex flex-wrap gap-1" aria-hidden="true">
      {Array.from({ length: Math.min(total, 10) }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < llenos ? 'bg-primary rs-punto' : 'bg-ink/15'}`} />
      ))}
    </span>
  );
}

function Tile({ icon: Icon, valor, label, puntos }: { icon: LucideIcon; valor: React.ReactNode; label: string; puntos: React.ReactNode }) {
  return (
    <div className="rs-tile flex min-h-[9.5rem] min-w-0 flex-col rounded-[24px] bg-surface p-4 text-ink sm:p-5">
      <span className="rs-tile-icono flex h-11 w-11 items-center justify-center rounded-full" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-auto truncate pt-3 text-[2rem] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[2.4rem]">{valor}</p>
      <p className="mt-1 truncate text-[13px] text-muted">{label}</p>
      <div className="mt-2.5">{puntos}</div>
    </div>
  );
}

/** Línea de 7 puntos con un globo sobre el valor más alto. */
function Historial({ valores, etiquetas, formato }: { valores: number[]; etiquetas: string[]; formato: (n: number) => string }) {
  const max = Math.max(1, ...valores);
  const pts = valores.map((v, i) => [8 + (i * 284) / (valores.length - 1), 92 - (v / max) * 70] as const);
  const linea = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const iTop = valores.indexOf(Math.max(...valores));
  const [tx, ty] = pts[iTop];
  return (
    <div>
      <div className="relative">
        <svg viewBox="0 0 300 100" className="h-40 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
          <path d={`${linea} L 292 100 L 8 100 Z`} className="rs-vib-area" />
          <path d={linea} fill="none" className="rs-vib-linea" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#0B0B0B] bg-white" style={{ left: `${(tx / 300) * 100}%`, top: `${ty}%` }} aria-hidden="true" />
        <span className="rs-vib-globo absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-sm font-bold tabular-nums text-[#0B0B0B]" style={{ left: `clamp(3rem, ${(tx / 300) * 100}%, calc(100% - 3rem))`, top: `calc(${ty}% - 2.75rem)` }}>
          {formato(valores[iTop])}
        </span>
      </div>
      <ol className="mt-2 flex justify-between text-xs capitalize text-white/60" aria-hidden="true">
        {etiquetas.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ol>
    </div>
  );
}

const TARJETAS = {
  rojo: 'bg-[#E5484D] text-white',
  azul: 'bg-[#3E63DD] text-white',
  lima: 'bg-[#C5F04A] text-[#0B0B0B]',
};

function Tarjeta({ tono, href, titulo, detalle, valor }: { tono: keyof typeof TARJETAS; href: string; titulo: string; detalle?: string; valor?: React.ReactNode }) {
  return (
    <Link href={href} className={`rs-vib-tarjeta group relative flex min-h-[8.5rem] min-w-0 flex-col rounded-[24px] p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${TARJETAS[tono]}`}>
      <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
      {valor !== undefined && <span className="text-[2.25rem] font-bold leading-none tracking-[-0.04em] tabular-nums">{valor}</span>}
      <span className="mt-auto pr-6 pt-3 text-[15px] font-semibold leading-snug">{titulo}</span>
      {detalle && <span className="mt-0.5 line-clamp-2 text-[13px] opacity-85">{detalle}</span>}
    </Link>
  );
}

export function ResumenVibrante({ p, d }: { p: ResumenProps; d: Dia }) {
  const { tz, active, done, week, avance } = d;
  const dinero = p.dinero;
  const tabs = [
    { href: p.base, label: 'Hoy', activo: true },
    { href: `${p.base}/calendar`, label: 'Agenda' },
    ...(dinero ? [{ href: `${p.base}/caja`, label: 'Caja' }] : []),
    { href: `${p.base}/customers`, label: 'Clientes' },
  ];
  const historial = dinero
    ? { valores: dinero.dias.map((x) => x.cents), etiquetas: dinero.dias.map((x, i) => (i === 6 ? 'hoy' : weekdayShort(x.key).slice(0, 2))), formato: formatoPesos, titulo: 'Ventas, últimos 7 días' }
    : { valores: week.map((w) => w.count), etiquetas: week.map((w) => weekdayShort(w.key).slice(0, 2)), formato: (n: number) => plural(n, 'cita', 'citas'), titulo: 'Citas, próximos 7 días' };
  const [rojo, ...otras] = p.alertas;

  return (
    <div>
      <section aria-label="Tu día" className="rs-vib-hero relative -mx-4 overflow-hidden bg-primary px-5 pb-6 pt-5 text-[rgb(var(--color-cta-fg))] sm:mx-0 sm:rounded-[36px] sm:px-8 sm:pb-8 sm:pt-6 lg:px-10 lg:pb-10">
        <nav aria-label="Vistas" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {tabs.map((t) => (
            <Link key={t.label} href={t.href} aria-current={t.activo ? 'page' : undefined} className={`rs-vib-tab ${t.activo ? 'rs-vib-tab-activa' : ''}`}>
              {t.label}
            </Link>
          ))}
        </nav>

        {p.setup}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
          <div className="min-w-0" style={{ '--i': 1 } as React.CSSProperties}>
            <h1 className="font-[family-name:var(--font-ia)] text-[2.6rem] font-bold leading-[0.95] tracking-[-0.035em] sm:text-[4rem] xl:text-[4.75rem]">{d.saludo}</h1>
            <p className="mt-3 text-[15px] opacity-85">
              {p.tenantName}, <span>{d.fecha}</span>
            </p>
            <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold opacity-85">{dinero ? 'Vendido hoy' : 'Citas hoy'}</p>
                <p className="mt-1 break-words font-[family-name:var(--font-ia)] text-[4.25rem] font-bold leading-[0.85] tracking-[-0.05em] tabular-nums sm:text-[6rem]">
                  {dinero ? formatoPesos(dinero.hoyCents) : active.length}
                </p>
              </div>
              <div className="w-36 shrink-0 sm:w-44">
                <div className="relative">
                  <Medidor valor={avance} grosor={12} className="w-full" />
                  <p className="absolute inset-x-0 bottom-0 text-center text-2xl font-bold leading-none tabular-nums">{Math.round(avance * 100)}%</p>
                </div>
                <p className="mt-1.5 text-center text-xs opacity-85">del día atendido</p>
              </div>
            </div>
            {p.action && <div className="mt-6">{p.action}</div>}
          </div>

          <div className="grid grid-cols-2 gap-3" style={{ '--i': 2 } as React.CSSProperties}>
            <Tile icon={CalendarCheck2} valor={active.length} label="Citas hoy" puntos={<Puntos total={active.length} llenos={done} />} />
            <Tile icon={CircleCheckBig} valor={done} label="Atendidas" puntos={<Puntos total={active.length} llenos={done} />} />
            <Tile icon={CalendarRange} valor={p.upcoming.length} label="Próximos 7 días" puntos={<Puntos total={7} llenos={d.diasConCitas} />} />
            {dinero ? (
              <Tile icon={Wallet} valor={<span className="text-[0.7em]">{formatoPesos(dinero.semanaCents)}</span>} label="Esta semana" puntos={<Puntos total={7} llenos={dinero.dias.filter((x) => x.cents > 0).length} />} />
            ) : (
              <Tile icon={CalendarDays} valor={d.canceladas} label="Canceladas hoy" puntos={<Puntos total={p.today.length} llenos={d.canceladas} />} />
            )}
          </div>
        </div>
      </section>

      <section aria-label="Historial y pendientes" className="rs-vib-banda relative -mx-4 mt-4 rounded-t-[36px] bg-[#0B0B0B] px-5 pb-10 pt-7 text-white sm:mx-0 sm:px-8 lg:px-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold">{historial.titulo}</h2>
            <div className="mt-10">
              <Historial valores={historial.valores} etiquetas={historial.etiquetas} formato={historial.formato} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-start">
            {rojo ? (
              <div className="col-span-2">
                <Tarjeta tono="rojo" href={rojo.href} titulo={rojo.title} detalle={rojo.detail} />
              </div>
            ) : (
              <div className="col-span-2 rounded-[24px] border border-white/15 p-5 text-[15px] text-white/80">Nada pendiente. Todo en orden.</div>
            )}
            {otras.slice(0, 1).map((a) => (
              <div key={a.key} className="col-span-2">
                <Tarjeta tono="azul" href={a.href} titulo={a.title} detalle={a.detail} />
              </div>
            ))}
            {!otras.length && <Tarjeta tono="azul" href={`${p.base}/calendar`} valor={p.upcoming.length} titulo="Citas que vienen" />}
            <Tarjeta tono="lima" href={`${p.base}/customers`} titulo="Tus clientes" detalle="Busca, escribe, agenda" />
            {otras.length > 0 && <Tarjeta tono="azul" href={`${p.base}/calendar`} valor={p.upcoming.length} titulo="Citas que vienen" />}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2">
          <section>
            <SectionHeading title="Agenda de hoy" meta={active.length || undefined} />
            <AgendaList bookings={p.today} timezone={tz} now={p.now} hideDayHeader emptyTitle="Nada agendado para hoy" emptyHint="Las citas que tus clientes reserven desde tu página van a aparecer aquí." />
          </section>
          <section>
            <SectionHeading
              title="Próximos días"
              meta={p.upcoming.length || undefined}
              action={
                <Link href={`${p.base}/calendar`} className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-full px-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
                  Agenda completa
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            />
            <AgendaList bookings={p.upcoming} timezone={tz} now={p.now} emptyTitle="Semana libre por ahora" emptyHint="No hay citas en los próximos siete días." />
          </section>
        </div>
      </section>
    </div>
  );
}
