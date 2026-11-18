'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarHeart, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { ShareLink } from '@/components/tenant-dash/ui/ShareLink';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { dayKey, dayLabel, formatTime } from '@/lib/dates/tenantTime';
import {
  aHora,
  colorPersona,
  diaCorto,
  horasVisibles,
  mesDe,
  minutosDelDia,
  mismoMes,
  moverFecha,
  posicionar,
  semanaDe,
  tituloPeriodo,
  ESTADOS,
  type Vista,
} from '@/lib/agenda/calendario';
import { EtiquetaEstado, HojaCita } from './HojaCita';
import { primerNombre } from '@/lib/regresan/mensajes';
import { AgendarDemo } from './AgendarDemo';

// LA AGENDA como calendario: Día / Semana / Mes.
//
// Reemplaza la lista de texto. Quien la usa es la dueña de un salón, en el
// celular y entre clientas: lo que necesita ver es su día como un día —
// horas hacia abajo, una columna por persona, cada cita un bloque con el
// nombre de la clienta grande— y tocar para actuar. Todo lo demás (letra
// de 16 px, botones de 48 px, palabras y no iconitos) sale de ahí.
//
// Los datos llegan del servidor por mes completo (rangoDeCarga). Moverse
// dentro de ese mes es local; salir de él pide el mes nuevo con ?fecha=.

const LLAVE_VISTA = 'bicho:agenda-vista';
const PX_DIA = 112; // 56 px por media hora: cada hueco se puede tocar
const PX_SEMANA = 80;
const DIAS_SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

type Persona = { id: string; name: string; color: string };
type Columna = {
  key: string;
  dia: string;
  quien?: string;
  nombre?: string;
  titulo: React.ReactNode;
  citas: AgendaBooking[];
};

const fondoPersona = (color: string) => `color-mix(in srgb, ${color} 15%, white)`;
const bordePersona = (color: string) => `color-mix(in srgb, ${color} 60%, white)`;

export function AgendaCalendario({
  citas,
  personas: personasBase,
  timezone: tz,
  ahora: ahoraIso,
  fecha: fechaInicial,
  rango,
  slug,
  negocio,
  linkReservas,
  puedeAgendar,
  cajaHref,
  demo,
}: {
  citas: AgendaBooking[];
  personas: { id: string; name: string }[];
  timezone: string | null;
  ahora: string;
  fecha: string;
  rango: { desde: string; hasta: string };
  slug: string;
  negocio: string;
  linkReservas: string;
  puedeAgendar: boolean;
  /** null si el negocio no tiene Caja. */
  cajaHref: string | null;
  /** Demo: los servicios para el formulario de ejemplo. Nada se guarda. */
  demo?: { servicios: { id: string; name: string; duration_minutes: number }[] };
}) {
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();
  const [cargando, startTransition] = useTransition();
  const [vista, setVista] = useState<Vista>('dia');
  const [listo, setListo] = useState(false);
  const [fecha, setFecha] = useState(fechaInicial);
  const [filtro, setFiltro] = useState('');
  const [citaId, setCitaId] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => new Date(ahoraIso));
  // Solo demo: citas de ejemplo, estados cambiados y cobros simulados.
  const [extra, setExtra] = useState<AgendaBooking[]>([]);
  const [estados, setEstados] = useState<Record<string, string>>({});
  const [cobradas, setCobradas] = useState<Record<string, boolean>>({});

  // La última vista elegida en ESTE aparato; si no hay, Día en el
  // teléfono y Semana en la compu.
  useEffect(() => {
    let guardada: string | null = null;
    try {
      guardada = localStorage.getItem(LLAVE_VISTA);
    } catch {}
    setVista(
      guardada === 'dia' || guardada === 'semana' || guardada === 'mes'
        ? guardada
        : window.matchMedia('(min-width: 1024px)').matches
          ? 'semana'
          : 'dia'
    );
    setListo(true);
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  function cambiarVista(v: Vista) {
    setVista(v);
    try {
      localStorage.setItem(LLAVE_VISTA, v);
    } catch {}
  }

  // Fuera del mes que mandó el servidor: pedir ese mes.
  useEffect(() => {
    if (demo || (fecha >= rango.desde && fecha <= rango.hasta)) return;
    startTransition(() => router.replace(`?fecha=${fecha}`, { scroll: false }));
  }, [fecha, rango.desde, rango.hasta, demo, router]);

  const personas: Persona[] = useMemo(
    () => personasBase.map((p, i) => ({ ...p, color: colorPersona(i) })),
    [personasBase]
  );
  const personaDe = (id?: string) => personas.find((p) => p.id === id) ?? null;

  const todas = useMemo(
    () => [...citas, ...extra].map((c) => (estados[c.id] ? { ...c, status: estados[c.id] } : c)),
    [citas, extra, estados]
  );
  const visibles = useMemo(() => (filtro ? todas.filter((c) => c.resource_id === filtro) : todas), [todas, filtro]);
  const porDia = useMemo(() => {
    const m = new Map<string, AgendaBooking[]>();
    for (const c of visibles) {
      const k = dayKey(c.starts_at, tz);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(c);
    }
    return m;
  }, [visibles, tz]);
  const activas = (k: string) => (porDia.get(k) ?? []).filter((c) => c.status !== 'cancelled');

  const hoy = dayKey(ahora, tz);
  const nowMin = minutosDelDia(ahora.toISOString(), tz);
  const semana = semanaDe(fecha);
  const diasPeriodo =
    vista === 'dia' ? [fecha] : vista === 'semana' ? semana : mesDe(fecha).flat().filter((k) => mismoMes(k, fecha));
  const enPeriodo = diasPeriodo.reduce((n, k) => n + activas(k).length, 0);

  const largo = dayLabel(fecha, new Date(0), tz);
  const relativo = dayLabel(fecha, ahora, tz);
  const titulo =
    vista === 'dia'
      ? relativo === largo
        ? largo.charAt(0).toUpperCase() + largo.slice(1)
        : `${relativo}, ${largo}`
      : tituloPeriodo(fecha, vista);

  // ---- Agendar: el mismo ?nueva=1 que el botón del encabezado ----
  function abrirAgendar(dia: string, hora: string, quien?: string) {
    const q = new URLSearchParams({ fecha, nueva: '1', dia, hora });
    if (quien) q.set('quien', quien);
    router.push(`?${q}`, { scroll: false });
  }
  function cerrarAgendarDemo() {
    const q = new URLSearchParams(search.toString());
    for (const k of ['nueva', 'dia', 'hora', 'quien']) q.delete(k);
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  }
  const agendarDemoAbierto = Boolean(demo && search.get('nueva'));
  const onHueco = puedeAgendar ? abrirAgendar : undefined;

  // ---- Swipe: ‹ › con el dedo, sin librerías ----
  const toque = useRef<{ x: number; y: number; bloqueado: boolean } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    const scroller = (e.target as HTMLElement).closest('[data-scroll-x]') as HTMLElement | null;
    // Si lo que tocó se desliza de lado (columnas, tira de días), el
    // dedo es para eso y no para cambiar de día.
    toque.current = { x: t.clientX, y: t.clientY, bloqueado: !!scroller && scroller.scrollWidth > scroller.clientWidth + 4 };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const ini = toque.current;
    toque.current = null;
    if (!ini || ini.bloqueado) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - ini.x;
    const dy = t.clientY - ini.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) setFecha(moverFecha(fecha, vista, dx < 0 ? 1 : -1));
  }

  // ---- Columnas del Día ----
  function columnasDelDia(dia: string): Columna[] {
    const lista = filtro ? personas.filter((p) => p.id === filtro) : personas;
    const delDia = porDia.get(dia) ?? [];
    if (!lista.length) return [{ key: 'todas', dia, titulo: <span className="text-base font-semibold">Citas</span>, citas: delDia }];
    return lista.map((p) => ({
      key: p.id,
      dia,
      quien: p.id,
      nombre: p.name,
      titulo: (
        <span className="flex items-center justify-center gap-2 text-base font-semibold text-ink">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
          <span className="break-words">{p.name}</span>
        </span>
      ),
      citas: delDia.filter((c) => c.resource_id === p.id),
    }));
  }

  const columnasSemana: Columna[] = semana.map((k) => {
    const { semana: s, numero } = diaCorto(k);
    const esHoy = k === hoy;
    return {
      key: k,
      dia: k,
      titulo: (
        <button
          type="button"
          onClick={() => {
            setFecha(k);
            cambiarVista('dia');
          }}
          aria-label={`Ver el ${dayLabel(k, new Date(0), tz)}`}
          className="flex w-full flex-col items-center rounded-xl py-1 transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span className="text-[13px] font-medium capitalize text-muted">{s}</span>
          <span
            className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold tabular-nums ${
              esHoy ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : 'text-ink'
            }`}
          >
            {numero}
          </span>
        </button>
      ),
      citas: porDia.get(k) ?? [],
    };
  });

  const nav =
    'inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 text-base font-semibold text-ink transition hover:bg-ink/[0.04] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-4';
  const citaAbierta = citaId ? (todas.find((c) => c.id === citaId) ?? null) : null;
  const personaAbierta = citaAbierta ? personaDe(citaAbierta.resource_id) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Selector de vista + título del periodo */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Cómo ver tu agenda" className="grid grid-cols-3 gap-1 rounded-full bg-ink/[0.06] p-1 lg:order-2 lg:w-[22rem]">
          {(
            [
              ['dia', 'Día'],
              ['semana', 'Semana'],
              ['mes', 'Mes'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={vista === v}
              onClick={() => cambiarVista(v)}
              className={`min-h-12 rounded-full text-base font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                vista === v ? 'bg-primary text-[rgb(var(--color-cta-fg))] shadow-sm' : 'text-ink/75 hover:bg-surface/70 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="lg:order-1">
          <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-ink sm:text-2xl">{titulo}</h2>
          <p className="mt-1 text-base text-muted" aria-live="polite">
            {cargando
              ? 'Cargando tus citas…'
              : enPeriodo === 0
                ? 'Sin citas'
                : `${enPeriodo} ${enPeriodo === 1 ? 'cita' : 'citas'}`}
          </p>
        </div>
      </div>

      {/* Navegación y filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:flex">
          <button type="button" className={nav} onClick={() => setFecha(moverFecha(fecha, vista, -1))}>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Anterior
          </button>
          <button type="button" className={`${nav} px-5`} onClick={() => setFecha(hoy)}>
            Hoy
          </button>
          <button type="button" className={nav} onClick={() => setFecha(moverFecha(fecha, vista, 1))}>
            Siguiente
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[15px] font-medium text-ink">Ir a una fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && setFecha(e.target.value)}
              className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </label>
          {personas.length > 1 && (
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[15px] font-medium text-ink">Quién atiende</span>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              >
                <option value="">Todo el equipo</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Sin citas: amable, con qué hacer */}
      {listo && !cargando && enPeriodo === 0 && (
        <div className="flex flex-col gap-3 rounded-3xl border border-primary/20 bg-primary/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CalendarHeart className="mt-0.5 h-6 w-6 shrink-0 text-ink/70" aria-hidden="true" />
            <div>
              <p className="text-lg font-semibold text-ink">
                {vista === 'dia'
                  ? fecha === hoy
                    ? 'Hoy no tienes citas'
                    : 'Este día no tienes citas'
                  : vista === 'semana'
                    ? 'Esta semana no tienes citas'
                    : 'Este mes no tienes citas'}
              </p>
              <p className="mt-0.5 text-base leading-relaxed text-ink/80">
                Comparte tu link para que tus clientas reserven solas
                {puedeAgendar ? ', o toca una hora libre para agendar tú.' : '.'}
              </p>
            </div>
          </div>
          <ShareLink url={linkReservas} slug={slug} negocio={negocio} className="shrink-0" />
        </div>
      )}

      {vista !== 'mes' && puedeAgendar && (
        <p className="text-base text-muted">Toca una cita para ver qué hacer con ella, o una hora libre para agendar.</p>
      )}

      {/* El calendario */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`transition-opacity duration-300 ${listo ? '' : 'opacity-0'} ${cargando ? 'opacity-60' : ''}`}
      >
        <div key={`${vista}-${vista === 'mes' ? fecha.slice(0, 7) : vista === 'semana' ? semana[0] : fecha}`} className="animate-fade-in">
          {vista === 'dia' && (
            <Linea
              columnas={columnasDelDia(fecha)}
              pxHora={PX_DIA}
              minCol="10rem"
              tz={tz}
              hoy={hoy}
              nowMin={nowMin}
              onHueco={onHueco}
              onCita={setCitaId}
              personaDe={personaDe}
            />
          )}

          {vista === 'semana' && (
            <>
              {/* Teléfono: tira de días + el día elegido */}
              <div className="flex flex-col gap-4 lg:hidden">
                <div data-scroll-x className="flex snap-x gap-2 overflow-x-auto pb-1">
                  {semana.map((k) => {
                    const n = activas(k).length;
                    const sel = k === fecha;
                    const { semana: s, numero } = diaCorto(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={sel}
                        onClick={() => setFecha(k)}
                        className={`flex min-h-[5rem] min-w-[4.5rem] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border px-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          sel
                            ? 'border-primary bg-primary text-[rgb(var(--color-cta-fg))]'
                            : k === hoy
                              ? 'border-primary/60 bg-surface text-ink'
                              : 'border-border bg-surface text-ink'
                        }`}
                      >
                        <span className="text-[13px] font-medium capitalize">{k === hoy ? 'hoy' : s}</span>
                        <span className="text-xl font-semibold tabular-nums">{numero}</span>
                        <span className="text-[13px]">{n ? `${n} ${n === 1 ? 'cita' : 'citas'}` : 'libre'}</span>
                      </button>
                    );
                  })}
                </div>
                <Linea
                  columnas={columnasDelDia(fecha)}
                  pxHora={PX_DIA}
                  minCol="10rem"
                  tz={tz}
                  hoy={hoy}
                  nowMin={nowMin}
                  onHueco={onHueco}
                  onCita={setCitaId}
                  personaDe={personaDe}
                />
              </div>
              {/* Compu: la cuadrícula de 7 días */}
              <div className="hidden lg:block">
                <Linea
                  columnas={columnasSemana}
                  pxHora={PX_SEMANA}
                  minCol="7.5rem"
                  tz={tz}
                  hoy={hoy}
                  nowMin={nowMin}
                  onHueco={onHueco}
                  onCita={setCitaId}
                  personaDe={personaDe}
                />
              </div>
            </>
          )}

          {vista === 'mes' && (
            <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
              <div className="grid grid-cols-7 border-b border-border">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="py-2.5 text-center text-[13px] font-semibold capitalize text-muted sm:text-[15px]">
                    {d}
                  </div>
                ))}
              </div>
              {mesDe(fecha).map((sem) => (
                <div key={sem[0]} className="grid grid-cols-7">
                  {sem.map((k, i) => {
                    const lista = activas(k);
                    const n = lista.length;
                    const fuera = !mismoMes(k, fecha);
                    const { numero } = diaCorto(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setFecha(k);
                          cambiarVista('dia');
                        }}
                        aria-label={`${dayLabel(k, ahora, tz)}: ${n ? `${n} ${n === 1 ? 'cita' : 'citas'}` : 'sin citas'}`}
                        className={`flex min-h-[5rem] min-w-0 flex-col items-center gap-1 border-t border-border p-1 text-center transition-colors hover:bg-primary/[0.05] focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 lg:min-h-[7.5rem] lg:items-stretch lg:p-2 lg:text-left ${
                          i > 0 ? 'border-l' : ''
                        } ${fuera ? 'bg-ink/[0.02]' : ''}`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-semibold tabular-nums ${
                            k === hoy ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : fuera ? 'text-muted/60' : 'text-ink'
                          }`}
                        >
                          {numero}
                        </span>
                        {n > 0 && (
                          <span className="rounded-lg bg-primary/10 px-1 py-0.5 text-[13px] font-semibold leading-tight text-ink lg:hidden">
                            {n} {n === 1 ? 'cita' : 'citas'}
                          </span>
                        )}
                        <span className="hidden flex-col gap-0.5 lg:flex">
                          {lista.slice(0, 3).map((c) => (
                            <span key={c.id} className="flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-ink">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: personaDe(c.resource_id)?.color ?? '#9CA3AF' }}
                                aria-hidden="true"
                              />
                              <span className="tabular-nums text-muted">{formatTime(c.starts_at, tz)}</span>
                              <span className="truncate font-semibold">{primerNombre(c.customers?.name ?? 'Clienta')}</span>
                            </span>
                          ))}
                          {n > 3 && <span className="text-[13px] font-semibold text-muted">y {n - 3} más</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4 text-[15px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
        {personas.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-semibold text-ink">Quién atiende:</span>
            {personas.map((p) => (
              <span key={p.id} className="flex items-center gap-2 text-ink">
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
                {p.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">Cómo va:</span>
          {['confirmed', 'completed', 'no_show', 'cancelled'].map((s) => (
            <EtiquetaEstado key={s} status={s} chica />
          ))}
        </div>
      </div>

      <HojaCita
        cita={citaAbierta}
        persona={personaAbierta}
        timezone={tz}
        ahora={ahora}
        slug={slug}
        negocio={negocio}
        cajaHref={cajaHref}
        onClose={() => setCitaId(null)}
        demo={
          demo && citaAbierta
            ? {
                cobrada: Boolean(cobradas[citaAbierta.id]),
                estado: (id, status, aviso) => {
                  setEstados((e) => ({ ...e, [id]: status }));
                  toast(aviso);
                },
                cobrar: (id) => {
                  setCobradas((c) => ({ ...c, [id]: true }));
                  toast('Ejemplo: cita cobrada. En tu panel el cobro queda en Caja con el precio del servicio.');
                },
              }
            : undefined
        }
      />

      {demo && agendarDemoAbierto && (
        <AgendarDemo
          servicios={demo.servicios}
          personas={personasBase}
          timezone={tz}
          dia={/^\d{4}-\d{2}-\d{2}$/.test(search.get('dia') ?? '') ? search.get('dia')! : fecha}
          hora={search.get('hora') ?? '10:00'}
          quien={search.get('quien') ?? undefined}
          onClose={cerrarAgendarDemo}
          onAgendar={(c) => {
            setExtra((e) => [...e, c]);
            setFecha(dayKey(c.starts_at, tz));
            cerrarAgendarDemo();
          }}
        />
      )}
    </div>
  );
}

// La línea de tiempo: horas hacia abajo, una columna por persona (Día) o
// por día (Semana en la compu). Las columnas se deslizan de lado en el
// teléfono si no caben.
function Linea({
  columnas,
  pxHora,
  minCol,
  tz,
  hoy,
  nowMin,
  onHueco,
  onCita,
  personaDe,
}: {
  columnas: Columna[];
  pxHora: number;
  minCol: string;
  tz: string | null;
  hoy: string;
  nowMin: number;
  onHueco?: (dia: string, hora: string, quien?: string) => void;
  onCita: (id: string) => void;
  personaDe: (id?: string) => Persona | null;
}) {
  const { desde, hasta } = horasVisibles(columnas.flatMap((c) => c.citas), tz);
  const alto = (hasta - desde) * pxHora;
  const medias = (hasta - desde) * 2;
  const hayHoy = columnas.some((c) => c.dia === hoy) && nowMin >= desde * 60 && nowMin <= hasta * 60;
  const yAhora = ((nowMin - desde * 60) / 60) * pxHora;
  const lineas = `repeating-linear-gradient(to bottom, rgb(var(--color-border-base) / 0.14) 0 1px, transparent 1px ${pxHora}px), repeating-linear-gradient(to bottom, rgb(var(--color-border-base) / 0.06) 0 1px, transparent 1px ${pxHora / 2}px)`;

  return (
    <div data-scroll-x className="overflow-x-auto overscroll-x-contain rounded-3xl border border-border bg-surface shadow-sm">
      <div className="grid" style={{ gridTemplateColumns: `3.75rem repeat(${columnas.length}, minmax(${minCol}, 1fr))` }}>
        <div className="sticky left-0 z-30 border-b border-border bg-surface" />
        {columnas.map((c) => (
          <div key={c.key} className="border-b border-l border-border px-2 py-3 text-center">
            {c.titulo}
          </div>
        ))}

        {/* Horas */}
        <div className="sticky left-0 z-20 bg-surface" style={{ height: alto }}>
          {Array.from({ length: hasta - desde }, (_, i) => (
            <span
              key={i}
              className="absolute right-2 text-[15px] tabular-nums text-muted"
              style={{ top: i * pxHora + 4 }}
            >
              {desde + i}:00
            </span>
          ))}
          {hayHoy && (
            <span
              className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-error px-1.5 py-0.5 text-[13px] font-semibold tabular-nums text-white"
              style={{ top: yAhora }}
            >
              {aHora(nowMin)}
            </span>
          )}
        </div>

        {columnas.map((c) => (
          <div key={c.key} className="relative border-l border-border" style={{ height: alto, backgroundImage: lineas }}>
            {onHueco &&
              Array.from({ length: medias }, (_, i) => {
                const min = desde * 60 + i * 30;
                if (c.dia < hoy || (c.dia === hoy && min + 30 <= nowMin)) return null;
                const hora = aHora(min);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onHueco(c.dia, hora, c.quien)}
                    aria-label={`Agendar a las ${hora}${c.nombre ? ` con ${c.nombre}` : ''}`}
                    className="group absolute inset-x-0 flex items-center justify-center transition-colors duration-150 hover:bg-primary/[0.06] focus-visible:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 active:bg-primary/10"
                    style={{ top: (i * pxHora) / 2, height: pxHora / 2 }}
                  >
                    <span className="text-[15px] font-semibold text-ink/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100">
                      Agendar {hora}
                    </span>
                  </button>
                );
              })}

            {posicionar(c.citas, tz, desde).map((b) => {
              const cita = b.cita;
              const persona = personaDe(cita.resource_id);
              const color = persona?.color ?? '#9CA3AF';
              const cancelada = cita.status === 'cancelled';
              // Encimadas en una columna angosta: solo el nombre de pila,
              // que cabe entero (el completo está al tocarla), sin partir
              // palabras a la mitad.
              const angosta = b.carriles > 1;
              const nombre = cita.customers?.name ?? 'Clienta';
              return (
                <button
                  key={cita.id}
                  type="button"
                  onClick={() => onCita(cita.id)}
                  aria-label={`${nombre}, ${formatTime(cita.starts_at, tz)}, ${cita.service_types?.name ?? 'Servicio'}${persona ? `, con ${persona.name}` : ''}${cita.status !== 'confirmed' ? `, ${ESTADOS[cita.status] ?? ''}` : ''}`}
                  className={`absolute flex flex-col items-start gap-0.5 overflow-hidden rounded-xl border py-1.5 text-left ${angosta ? 'px-1' : 'px-2.5'} shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-[box-shadow,transform] duration-200 hover:z-[5] hover:shadow-[0_6px_16px_-6px_rgb(0_0_0/0.25)] active:scale-[0.99] focus-visible:z-[5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                    cancelada ? 'z-[1] border-dashed border-border-strong bg-surface' : 'z-[2]'
                  }`}
                  style={{
                    top: (b.inicio / 60) * pxHora + 1,
                    minHeight: Math.max(44, (b.duracion / 60) * pxHora - 2),
                    left: `calc(${(b.carril * 100) / b.carriles}% + 3px)`,
                    width: `calc(${100 / b.carriles}% - 6px)`,
                    ...(cancelada ? {} : { backgroundColor: fondoPersona(color), borderColor: bordePersona(color) }),
                  }}
                >
                  <span
                    className={`w-full font-bold leading-5 break-words ${angosta ? 'text-[15px] [hyphens:auto]' : 'text-base'} ${cancelada ? 'text-muted line-through decoration-ink/40' : 'text-ink'}`}
                  >
                    {angosta ? primerNombre(nombre) : nombre}
                  </span>
                  <span className="w-full truncate text-sm leading-5 text-ink/80">
                    <span className="tabular-nums">{formatTime(cita.starts_at, tz)}</span> · {cita.service_types?.name ?? 'Servicio'}
                  </span>
                  {persona && !angosta && (
                    <span className="flex max-w-full items-center gap-1.5 text-[13px] font-medium leading-5 text-ink/75">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                      <span className="truncate">con {persona.name}</span>
                    </span>
                  )}
                  {cita.status !== 'confirmed' && <EtiquetaEstado status={cita.status} chica />}
                </button>
              );
            })}

            {c.dia === hoy && hayHoy && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-[4] h-0.5 bg-error" style={{ top: yAhora }}>
                <span className="absolute -left-1.5 -top-[5px] h-3 w-3 rounded-full bg-error" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
