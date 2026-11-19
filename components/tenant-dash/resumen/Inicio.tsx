import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarDays,
  CalendarCheck2,
  CalendarOff,
  CalendarPlus,
  CalendarRange,
  CircleCheckBig,
  Search,
  FileText,
  Handshake,
  HandCoins,
  HeartHandshake,
  Landmark,
  Lock,
  MessageCircle,
  Megaphone,
  Package,
  ReceiptText,
  Sparkles,
  Stamp,
  Tag,
  Wallet,
  Zap,
} from 'lucide-react';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { formatTime } from '@/lib/dates/tenantTime';
import { formatoPesos } from '@/lib/caja/resumen';
import { ACENTO_COPILOTO, COLOR_MODULO, colorDe, type ClaveColor, type TileModulo } from '@/lib/branding/moduloColores';
import { AbrirHoja, HojaFormulario } from '@/components/tenant-dash/fichas/Hoja';
import { CAMPO, Campo } from '@/components/tenant-dash/fichas/visual';
import { CuentaArriba } from './CuentaArriba';
import { CuentaRegresiva } from './CuentaRegresiva';
import { plural, type Dia, type ResumenProps } from './comun';
import { readableFgRgb } from '@/lib/branding/colors';

// EL INICIO — un solo diseño, blanco con colores, del teléfono al escritorio.
//
// El orden es el de la mañana de la dueña: primero lo que pide atención
// (con el botón para resolverlo ahí mismo), luego su siguiente cita en
// grande con la cuenta regresiva, los números del día en tarjetas que se
// tocan, las tres tareas de todos los días y, al final, sus módulos con
// el color de cada uno (el mismo de los anuncios). Mismas cuentas (armar),
// cero consultas: el panel real y la demo le pasan sus datos.
//
// En la demo, "Agendar cita" y "Bloquear un rato" abren su hoja con un
// formulario de ejemplo que confirma "Ejemplo: …" sin guardar nada.

const ICONO: Record<ClaveColor, LucideIcon> = {
  agenda: CalendarDays,
  recordatorios: MessageCircle,
  regresan: HeartHandshake,
  lealtad: Stamp,
  caja: Wallet,
  inventario: Package,
  comisiones: HandCoins,
  facturacion: ReceiptText,
  resico: Landmark,
  copiloto: Sparkles,
  servicios: Tag,
  cotizaciones: FileText,
  reuniones: Handshake,
  posts: Megaphone,
  whatsapp: MessageCircle,
  boost: Zap,
};

// La cuadrícula va por USO: lo que se abre todos los días arriba, lo de
// una vez al mes abajo, y lo que el plan no incluye siempre al final.
const POR_USO: ClaveColor[] = [
  'agenda',
  'caja',
  'regresan',
  'whatsapp',
  'servicios',
  'lealtad',
  'comisiones',
  'inventario',
  'boost',
  'posts',
  'cotizaciones',
  'reuniones',
  'copiloto',
  'facturacion',
  'resico',
];

export function ordenarPorUso(modulos: TileModulo[]): TileModulo[] {
  const rango = (t: TileModulo) => (t.bloqueado ? 100 : 0) + (POR_USO.indexOf(t.clave) + 1 || 50);
  return [...modulos].sort((a, b) => rango(a) - rango(b));
}

// Qué dice el botón de cada pendiente: lo que va a hacer, no "Ver".
const RESOLVER: Record<string, string> = {
  inventario: 'Ver qué falta',
  regresan: 'Escribirles',
};

function Pendiente({ titulo, detalle, href, icon: Icon, tono, boton }: { titulo: string; detalle?: string; href: string; icon: LucideIcon; tono: 'warning' | 'brand'; boton: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-[5.5rem] flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl border-2 border-warning/40 bg-warning-soft p-4 transition-transform duration-150 active:scale-[0.99] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-5"
      >
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tono === 'warning' ? 'bg-warning text-white' : 'bg-primary text-[rgb(var(--color-cta-fg))]'}`}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1 basis-48">
          <span className="block text-[17px] font-semibold leading-snug text-ink">{titulo}</span>
          {detalle && <span className="mt-0.5 block text-[15px] text-ink/75">{detalle}</span>}
        </span>
        <span className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-white max-sm:w-full max-sm:justify-center">
          {boton}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

function Numero({ href, color, icon: Icon, valor, pesos, label, detalle }: { href: string; color: string; icon: LucideIcon; valor: number; pesos?: boolean; label: string; detalle: string }) {
  return (
    <Link
      href={href}
      className="group flex min-h-[9rem] flex-col rounded-3xl border border-border p-4 shadow-xs transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-5"
      style={{ background: `color-mix(in srgb, ${color} 8%, rgb(var(--color-surface)))` }}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: color, color: `rgb(${readableFgRgb(color)})` }} aria-hidden="true">
        <Icon className="h-[22px] w-[22px]" />
      </span>
      <span className="mt-auto pt-3 text-[2.25rem] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[2.6rem]">
        <CuentaArriba valor={valor} pesos={pesos} />
      </span>
      <span className="mt-1.5 text-[16px] font-semibold text-ink">{label}</span>
      <span className="text-[14px] text-ink/70">{detalle}</span>
    </Link>
  );
}

function Atajo({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-[rgb(var(--color-cta-fg))]" aria-hidden="true">
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-[15px] font-semibold leading-tight text-ink">{children}</span>
    </>
  );
}

const ATAJO =
  'flex min-h-[7rem] flex-col items-center justify-center gap-2.5 rounded-3xl border border-border bg-surface px-2 py-4 text-center shadow-xs transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function Tile({ t, ancho }: { t: TileModulo; ancho: boolean }) {
  const Icon = ICONO[t.clave];
  const { bg, fg } = colorDe(t.clave);
  const base = `group relative flex min-h-[7.25rem] flex-col justify-between rounded-3xl p-4 transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:ring-primary ${ancho ? 'min-h-[5.5rem] flex-row items-center justify-start gap-4' : ''}`;

  if (t.bloqueado) {
    return (
      <Link
        href={t.href}
        aria-label={`${t.label}: incluido en el plan ${t.bloqueado.plan}`}
        className={`${base} border border-dashed border-border-strong text-ink`}
        style={{ background: `color-mix(in srgb, ${bg} 12%, rgb(var(--color-surface)))` }}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink/70 shadow-xs" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
        <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-muted" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold leading-tight">{t.label}</span>
          <span className="mt-0.5 block text-[13px] text-muted">Plan {t.bloqueado.plan}</span>
        </span>
      </Link>
    );
  }

  const copiloto = t.clave === 'copiloto';
  return (
    <Link
      href={t.href}
      className={`${base} ${copiloto ? 'ring-1 ring-inset' : ''}`}
      style={{
        background: bg,
        color: `rgb(${fg})`,
        boxShadow: `0 1px 2px rgb(0 0 0 / 0.08), 0 10px 20px -12px ${bg}`,
        ...(copiloto ? { '--tw-ring-color': `${ACENTO_COPILOTO}66` } : {}),
      } as React.CSSProperties}
    >
      <Icon className="h-7 w-7 shrink-0" strokeWidth={2.1} style={copiloto ? { color: ACENTO_COPILOTO } : undefined} aria-hidden="true" />
      <span className="block text-[16px] font-semibold leading-tight">{t.label}</span>
    </Link>
  );
}

const HORAS_DEMO = Array.from({ length: 21 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

export function Inicio({ p, d, modulos }: { p: ResumenProps; d: Dia; modulos: TileModulo[] }) {
  const { tz, active, done, next, inProgress } = d;
  const restantes = active.length - done;
  const ordenados = ordenarPorUso(modulos);
  const sinCitas = !next && active.length === 0 && p.upcoming.length === 0;
  const demo = p.demo;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-[2.5rem]">{d.saludo}</h1>
          <p className="mt-1.5 text-[16px] text-muted">
            <span className="font-medium text-ink">{p.tenantName}</span> · <span className="first-letter:uppercase">{d.fecha}</span>
          </p>
        </div>
        {!sinCitas && p.action && <div className="max-sm:w-full">{p.action}</div>}
      </header>

      {p.setup}

      {p.alertas.length > 0 && (
        <section aria-labelledby="inicio-pendientes" className="mt-6">
          <h2 id="inicio-pendientes" className="mb-3 text-[19px] font-semibold tracking-tight text-ink">
            Lo que pide tu atención
          </h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {p.alertas.map((a) => (
              <Pendiente key={a.key} titulo={a.title} detalle={a.detail} href={a.href} icon={a.icon} tono={a.tone} boton={RESOLVER[a.key] ?? 'Resolver'} />
            ))}
          </ul>
        </section>
      )}

      {p.apartados}

      <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* La siguiente cita, en grande y con los colores del negocio. */}
        <Link
          href={`${p.base}/calendar`}
          className="group relative flex min-h-[12rem] flex-col overflow-hidden rounded-[2rem] bg-primary p-5 text-[rgb(var(--color-cta-fg))] shadow-sm transition-transform duration-150 active:scale-[0.99] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 sm:p-6"
          aria-label="Abrir la agenda"
        >
          {next ? (
            <>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[rgb(var(--color-cta-fg)/0.14)] px-3.5 py-1.5 text-[15px] font-semibold">
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
                </span>
                <CuentaRegresiva inicio={next.starts_at} fin={next.ends_at} terminaA={formatTime(next.ends_at, tz)} ahora={p.now.toISOString()} />
              </span>
              <span className="mt-auto pt-5 text-[1rem] font-medium opacity-85">{inProgress ? 'Cita en curso' : 'Tu siguiente cita'}</span>
              <span className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <span className="text-[3.25rem] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[4rem]">{formatTime(next.starts_at, tz)}</span>
                <span className="min-w-0 text-[19px] font-semibold leading-tight">{next.service_types?.name ?? 'Cita'}</span>
              </span>
              <span className="mt-1.5 text-[16px] opacity-90">
                con {next.customers?.name ?? 'cliente'}
                {next.resources?.name ? ` · atiende ${next.resources.name}` : ''}
              </span>
            </>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-cta-fg)/0.14)]" aria-hidden="true">
                <CalendarCheck2 className="h-6 w-6" />
              </span>
              <span className="mt-auto pt-5 text-[1.6rem] font-semibold leading-tight">{active.length ? 'Ya acabaste las citas de hoy' : 'Hoy no tienes citas'}</span>
              <span className="mt-1 text-[16px] opacity-90">
                {p.upcoming.length ? `${plural(p.upcoming.length, 'cita', 'citas')} en los próximos 7 días` : 'Comparte tu link para que te reserven'}
              </span>
            </>
          )}
          <ArrowRight className="absolute right-5 top-5 h-6 w-6 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Numero href={`${p.base}/calendar`} color={COLOR_MODULO.agenda} icon={CalendarDays} valor={active.length} label={active.length === 1 ? 'Cita hoy' : 'Citas hoy'} detalle={active.length ? `${restantes} por atender` : 'Agenda libre'} />
          <Numero href={`${p.base}/calendar`} color={COLOR_MODULO.recordatorios} icon={CircleCheckBig} valor={done} label="Atendidas" detalle={active.length ? `de ${active.length} de hoy` : 'Todavía nada'} />
          <Numero href={`${p.base}/calendar`} color={COLOR_MODULO.comisiones} icon={CalendarRange} valor={p.upcoming.length} label="Próximos 7 días" detalle={`${plural(d.diasConCitas, 'día', 'días')} con citas`} />
          {p.dinero ? (
            <Numero href={`${p.base}/caja`} color={COLOR_MODULO.caja} icon={Wallet} valor={p.dinero.hoyCents} pesos label="Vendido hoy" detalle={`${formatoPesos(p.dinero.semanaCents)} esta semana`} />
          ) : (
            <Numero href={`${p.base}/customers`} color={COLOR_MODULO.regresan} icon={HeartHandshake} valor={p.alertas.length} label="Pendientes" detalle={p.alertas.length ? 'Piden tu atención' : 'Todo en orden'} />
          )}
        </div>
      </div>

      {sinCitas && p.action && <div className="mt-4 flex justify-center">{p.action}</div>}

      <nav aria-label="Atajos" className="mt-4 grid grid-cols-3 gap-3">
        {demo ? (
          <>
            <AbrirHoja id="demo-agendar" variant="outline" className={`${ATAJO} !h-auto !min-h-[7rem] !rounded-3xl !px-2`}>
              <Atajo icon={CalendarPlus}>Agendar cita</Atajo>
            </AbrirHoja>
            <AbrirHoja id="demo-bloquear" variant="outline" className={`${ATAJO} !h-auto !min-h-[7rem] !rounded-3xl !px-2`}>
              <Atajo icon={CalendarOff}>Bloquear un rato</Atajo>
            </AbrirHoja>
          </>
        ) : (
          <>
            <Link href={`${p.base}/calendar?nueva=1#agendar`} className={ATAJO}>
              <Atajo icon={CalendarPlus}>Agendar cita</Atajo>
            </Link>
            <Link href={`${p.base}/schedule#bloquear`} className={ATAJO}>
              <Atajo icon={CalendarOff}>Bloquear un rato</Atajo>
            </Link>
          </>
        )}
        <Link href={`${p.base}/customers#buscar`} className={ATAJO}>
          <Atajo icon={Search}>Buscar cliente</Atajo>
        </Link>
      </nav>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section>
          <SectionHeading
            title="Agenda de hoy"
            meta={active.length || undefined}
            action={
              <Link href={`${p.base}/calendar`} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[15px] font-medium text-ink underline-offset-4 hover:underline">
                Ver toda
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
          <AgendaList bookings={p.today} timezone={tz} now={p.now} hideDayHeader emptyTitle="Nada agendado para hoy" emptyHint="Las citas que te reserven aparecen aquí, en el orden del día." />
        </section>

        {modulos.length > 0 && (
          <section aria-labelledby="inicio-modulos">
            <SectionHeading title="Tu negocio" />
            <ul className="grid grid-cols-2 gap-3">
              {ordenados.map((t, i) => {
                // Con número impar, el último ocupa el renglón entero en vez de dejar un hueco.
                const ancho = ordenados.length % 2 === 1 && i === ordenados.length - 1;
                return (
                  <li key={t.clave} className={ancho ? 'col-span-2' : ''}>
                    <Tile t={t} ancho={ancho} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {demo && (
        <>
          <HojaFormulario id="demo-agendar" titulo="Agendar una cita" success={`cita agendada`} enviar="Agendar cita">
            <p className="-mt-1 rounded-2xl bg-ink/[0.04] px-4 py-3 text-[15px] text-muted">Es un ejemplo: pruébalo, no se guarda nada.</p>
            <Campo label="¿Quién viene?">
              <input type="text" name="nombre" required placeholder="Ej. Lupita Pérez" className={CAMPO} />
            </Campo>
            <Campo label="Su teléfono">
              <input type="tel" name="telefono" inputMode="tel" placeholder="Ej. 618 123 4567" className={CAMPO} />
            </Campo>
            <Campo label="¿Qué servicio?">
              <select name="servicio" className={CAMPO}>
                {demo.servicios.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Campo>
            {demo.personas.length > 1 && (
              <Campo label="¿Con quién?">
                <select name="persona" className={CAMPO}>
                  {demo.personas.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Campo>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Día">
                <input type="date" name="dia" defaultValue={demo.hoyKey} min={demo.hoyKey} className={CAMPO} />
              </Campo>
              <Campo label="Hora">
                <select name="hora" defaultValue="12:00" className={CAMPO}>
                  {HORAS_DEMO.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </Campo>
            </div>
          </HojaFormulario>

          <HojaFormulario id="demo-bloquear" titulo="Bloquear un rato" success="esas horas quedaron bloqueadas" enviar="Bloquear">
            <p className="-mt-1 rounded-2xl bg-ink/[0.04] px-4 py-3 text-[15px] text-muted">Es un ejemplo: pruébalo, no se guarda nada.</p>
            <Campo label="¿Qué día?">
              <input type="date" name="dia" defaultValue={demo.hoyKey} min={demo.hoyKey} className={CAMPO} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Desde las">
                <input type="time" name="desde" defaultValue="14:00" className={CAMPO} />
              </Campo>
              <Campo label="Hasta las">
                <input type="time" name="hasta" defaultValue="18:00" className={CAMPO} />
              </Campo>
            </div>
            <label className="flex min-h-12 items-center gap-3 text-[16px] text-ink">
              <input type="checkbox" name="todo" className="h-6 w-6 shrink-0 accent-primary" />
              Todo el día
            </label>
            <Campo label="Motivo (solo lo ves tú)">
              <input type="text" name="motivo" placeholder="Ej. Cita médica, vacaciones" className={CAMPO} />
            </Campo>
          </HojaFormulario>
        </>
      )}
    </div>
  );
}
