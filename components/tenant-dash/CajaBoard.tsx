'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight, Banknote, CalendarCheck, Minus, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { addDaysKey, dayLabel } from '@/lib/dates/tenantTime';
import {
  CATEGORIAS_GASTO,
  METODOS,
  corteDeCaja,
  formatoPesos,
  pesosACentavos,
  rangoDe,
  resumir,
  type CategoriaGasto,
  type Metodo,
  type Movimiento,
  type Periodo,
} from '@/lib/caja/resumen';
import {
  ajustarVentaDeCita,
  borrarMovimiento,
  guardarMovimiento,
  quitarVentaDeCita,
} from '@/app/t/[slug]/dashboard/caja/actions';

// CAJA — "¿estoy ganando dinero?" y "¿cuánto debe haber en el cajón?"
// contestados en una pantalla.
//
// Lenguaje de mostrador, no de contador: vendiste, gastaste, te quedó.
// Pensada para el celular: el número grande arriba, el corte del día
// justo debajo (se hace todos los días al cerrar) y el detalle después.

const PERIODOS: { id: Periodo; label: string; anterior: string; titulo: string }[] = [
  { id: 'hoy', label: 'Hoy', anterior: 'ayer', titulo: 'de hoy' },
  { id: 'semana', label: 'Semana', anterior: 'la semana pasada a estas alturas', titulo: 'de esta semana' },
  { id: 'mes', label: 'Mes', anterior: 'el mes pasado a estas alturas', titulo: 'de este mes' },
];

const METODO_LABEL: Record<Metodo, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

const CATEGORIA_LABEL: Record<CategoriaGasto, string> = {
  renta: 'Renta',
  productos: 'Productos',
  sueldos: 'Sueldos',
  servicios: 'Luz, agua, internet',
  otro: 'Otro',
};

const CHIP =
  'inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-medium ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const chip = (activo: boolean) =>
  `${CHIP} ${activo ? 'bg-primary/[0.14] text-ink ring-primary/40' : 'text-muted ring-border hover:text-ink'}`;

type Editando = { modo: 'nuevo'; tipo: 'venta' | 'gasto' } | { modo: 'editar'; mov: Movimiento };

function etiquetaDia(key: string, hoy: string): string {
  if (key === hoy) return 'Hoy';
  if (key === addDaysKey(hoy, -1)) return 'Ayer';
  return dayLabel(key, new Date(0), 'UTC');
}

// El cambio con que abrió se recuerda por día en este teléfono: si
// recarga la página a media tarde no tiene que volver a escribirlo.
// Si el navegador no deja guardar, simplemente no se recuerda.
function useRecordado(clave: string): [string, (v: string) => void] {
  const [valor, setValor] = useState('');
  useEffect(() => {
    try {
      setValor(localStorage.getItem(clave) ?? '');
    } catch {
      /* sin almacenamiento: se queda vacío */
    }
  }, [clave]);
  return [
    valor,
    (v: string) => {
      setValor(v);
      try {
        if (v) localStorage.setItem(clave, v);
        else localStorage.removeItem(clave);
      } catch {
        /* idem */
      }
    },
  ];
}

export function CajaBoard({
  slug,
  hoy,
  movimientos,
  soloLectura = false,
}: {
  slug: string;
  hoy: string;
  movimientos: Movimiento[];
  /** El panel de demostración: se ve todo, no se guarda nada. */
  soloLectura?: boolean;
}) {
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [editando, setEditando] = useState<Editando | null>(null);

  const rango = rangoDe(periodo, hoy);
  const actual = useMemo(() => resumir(movimientos, rango.desde, rango.hasta), [movimientos, rango.desde, rango.hasta]);
  const anterior = useMemo(
    () => resumir(movimientos, rango.prevDesde, rango.prevHasta),
    [movimientos, rango.prevDesde, rango.prevHasta],
  );
  const delPeriodo = movimientos
    .filter((m) => m.dia >= rango.desde && m.dia <= rango.hasta)
    .sort((a, b) => (a.dia === b.dia ? 0 : a.dia < b.dia ? 1 : -1));

  const info = PERIODOS.find((p) => p.id === periodo)!;
  // La comparación en pesos, no en porcentaje: "156% más que ayer" en
  // un día chico asusta o presume sin decir nada. "$1,200 más" se entiende.
  const sinAnterior = anterior.vendidoCents === 0 && anterior.gastadoCents === 0;
  const diferencia = actual.quedoCents - anterior.quedoCents;
  const maxServicio = actual.porServicio[0]?.cents ?? 0;

  const nuevo = (tipo: 'venta' | 'gasto') => setEditando({ modo: 'nuevo', tipo });

  return (
    <div>
      <PageHeader
        title="Caja"
        description="Cuánto vendiste, cuánto gastaste y cuánto debe haber en el cajón."
        action={
          !soloLectura && (
            <Button type="button" onClick={() => nuevo('venta')} className="min-h-11">
              <Plus className="h-4 w-4" aria-hidden="true" /> Anotar venta
            </Button>
          )
        }
        actions={
          !soloLectura && (
            <Button type="button" variant="outline" onClick={() => nuevo('gasto')} className="min-h-11 max-sm:flex-1">
              <Minus className="h-4 w-4" aria-hidden="true" /> Anotar gasto
            </Button>
          )
        }
      />

      {/* Periodo */}
      <div role="tablist" aria-label="Periodo" className="mt-6 grid grid-cols-3 gap-1 rounded-full bg-ink/[0.05] p-1">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={periodo === p.id}
            onClick={() => setPeriodo(p.id)}
            className={`min-h-11 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              periodo === p.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* El número que importa */}
      <section
        className="mt-4 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7"
        aria-label={`Lo que te quedó ${info.titulo}`}
      >
        <p className="text-sm font-medium text-muted">Te quedó {info.titulo}</p>
        <p
          className={`mt-1 text-[2.75rem] font-bold leading-none tracking-tight tabular-nums sm:text-[3.5rem] ${
            actual.quedoCents < 0 ? 'text-error' : 'text-ink'
          }`}
        >
          {formatoPesos(actual.quedoCents)}
        </p>
        <p className="mt-3 text-[15px] text-muted">
          Vendiste <span className="font-semibold text-ink tabular-nums">{formatoPesos(actual.vendidoCents)}</span> y
          gastaste <span className="font-semibold text-ink tabular-nums">{formatoPesos(actual.gastadoCents)}</span>.
        </p>
        <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full bg-ink/[0.05] px-3 py-1.5 text-[13px] text-muted">
          {sinAnterior ? (
            <>Todavía no hay datos de {info.anterior} para comparar</>
          ) : diferencia === 0 ? (
            <>Igual que {info.anterior}</>
          ) : (
            <>
              {diferencia > 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-error" aria-hidden="true" />
              )}
              <span className={`font-semibold tabular-nums ${diferencia > 0 ? 'text-success' : 'text-error'}`}>
                {formatoPesos(Math.abs(diferencia))} {diferencia > 0 ? 'más' : 'menos'}
              </span>
              que {info.anterior}
            </>
          )}
        </p>
      </section>

      <CorteDelDia slug={slug} hoy={hoy} movimientos={movimientos} />

      {/* Detalle */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <h2 className="text-[15px] font-semibold text-ink">Qué se vendió</h2>
          {actual.porServicio.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Todavía no hay ventas {info.titulo}.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {actual.porServicio.map((s) => (
                <li key={s.nombre}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {s.nombre} <span className="text-muted">×{s.veces}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-ink">{formatoPesos(s.cents)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-ink/[0.06]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${maxServicio ? Math.max(4, (s.cents / maxServicio) * 100) : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <h2 className="text-[15px] font-semibold text-ink">Cómo te pagaron</h2>
          <ul className="mt-4 space-y-3">
            {METODOS.map((m) => {
              const cents = actual.porMetodo[m];
              const parte = actual.vendidoCents ? Math.round((cents / actual.vendidoCents) * 100) : 0;
              return (
                <li key={m}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-ink">
                      {METODO_LABEL[m]} <span className="text-muted">{parte}%</span>
                    </span>
                    <span className="font-semibold tabular-nums text-ink">{formatoPesos(cents)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-ink/[0.06]">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${parte}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Movimientos */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">
            Movimientos {info.titulo} <span className="font-normal text-muted tabular-nums">({delPeriodo.length})</span>
          </h2>
          {!soloLectura && delPeriodo.length > 0 && (
            <p className="text-[13px] text-muted">Toca uno para corregir el monto o cómo te pagaron.</p>
          )}
        </div>
        {delPeriodo.length === 0 ? (
          <div className="mt-2 rounded-3xl bg-surface ring-1 ring-border">
            <EmptyState
              icon={Wallet}
              title={periodo === 'hoy' ? 'Hoy todavía no hay movimientos' : `Sin movimientos ${info.titulo}`}
              description="Cuando marques una cita como «Asistió» en tu agenda, su cobro aparece aquí solo, con el precio del servicio."
              why="Así al cerrar sabes cuánto vendiste y cuánto debe haber en el cajón, sin hacer cuentas."
              action={
                !soloLectura && (
                  <Button type="button" onClick={() => nuevo('venta')} className="min-h-11">
                    <Plus className="h-4 w-4" aria-hidden="true" /> Anotar una venta
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {delPeriodo.slice(0, 150).map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={soloLectura}
                  onClick={() => setEditando({ modo: 'editar', mov: m })}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink/[0.03] focus-visible:bg-ink/[0.04] focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-ink">
                      {m.concepto || (m.categoria ? CATEGORIA_LABEL[m.categoria] : 'Venta')}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
                      {m.bookingId && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Cita ·
                        </span>
                      )}
                      {periodo !== 'hoy' && <span>{etiquetaDia(m.dia, hoy)} ·</span>}
                      {m.tipo === 'gasto' && m.categoria && <span>{CATEGORIA_LABEL[m.categoria]} ·</span>}
                      <span>{METODO_LABEL[m.metodo]}</span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[15px] font-semibold tabular-nums ${
                      m.tipo === 'gasto' ? 'text-error' : 'text-ink'
                    }`}
                  >
                    {m.tipo === 'gasto' ? '−' : '+'}
                    {formatoPesos(m.montoCents)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editando && <FormMovimiento slug={slug} hoy={hoy} editando={editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

// EL CORTE DEL DÍA — se lee de un vistazo: un número grande ("debe
// haber") y la cuenta que lo explica en renglones de suma y resta. El
// cambio con que abrió no es un campo obligatorio en medio del resumen:
// es un renglón opcional que se agrega solo si lo usa. Y para cerrar,
// un campo "¿cuánto contaste?" que dice si cuadra.
function CorteDelDia({ slug, hoy, movimientos }: { slug: string; hoy: string; movimientos: Movimiento[] }) {
  const [fondo, setFondo] = useRecordado(`caja-fondo:${slug}:${hoy}`);
  const [conFondo, setConFondo] = useState(false);
  const [contado, setContado] = useState('');

  const fondoCents = pesosACentavos(fondo) ?? 0;
  const corte = corteDeCaja(movimientos, hoy, fondoCents);
  const deHoy = resumir(movimientos, hoy, hoy);
  const alBanco = deHoy.porMetodo.tarjeta + deHoy.porMetodo.transferencia;
  const mostrarFondo = conFondo || fondoCents > 0;

  const contadoLimpio = contado.replace(/[\s$,]/g, '');
  const contadoCents = contadoLimpio === '0' ? 0 : pesosACentavos(contado);
  const diferencia = contadoCents === null ? null : contadoCents - corte.esperadoCents;

  return (
    <section className="mt-6 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7" aria-labelledby="corte-titulo">
      <div className="flex items-center gap-1">
        <Banknote className="h-5 w-5 text-ink/70" aria-hidden="true" />
        <h2 id="corte-titulo" className="ml-1 text-[17px] font-semibold tracking-tight text-ink">
          Corte de hoy
        </h2>
        <HelpTip title="¿Qué es el corte de caja?">
          Es contar el efectivo al cerrar y ver si coincide con lo que vendiste. Aquí solo cuenta el efectivo: lo de
          tarjeta y transferencia llega a tu banco, no al cajón.
        </HelpTip>
      </div>

      <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <p className="text-sm text-muted">En el cajón debe haber</p>
          <p className="mt-1 text-[2.25rem] font-bold leading-none tracking-tight tabular-nums text-ink sm:text-[2.75rem]">
            {formatoPesos(corte.esperadoCents)}
          </p>

          <dl className="mt-5 divide-y divide-border border-y border-border text-[15px]">
            {mostrarFondo && (
              <div className="flex min-h-12 items-center justify-between gap-3 py-1.5">
                <dt>
                  <label htmlFor="caja-fondo" className="text-muted">
                    Cambio con que abriste
                  </label>
                </dt>
                <dd>
                  <Input
                    id="caja-fondo"
                    inputMode="decimal"
                    placeholder="$0"
                    value={fondo}
                    onChange={(e) => setFondo(e.target.value)}
                    autoFocus={conFondo && !fondo}
                    className="w-28 text-right tabular-nums"
                  />
                </dd>
              </div>
            )}
            <div className="flex min-h-12 items-center justify-between gap-3">
              <dt className="text-muted">
                <span aria-hidden="true">+ </span>Te pagaron en efectivo
              </dt>
              <dd className="font-semibold tabular-nums text-ink">{formatoPesos(corte.ventasEfectivoCents)}</dd>
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3">
              <dt className="text-muted">
                <span aria-hidden="true">− </span>Pagaste en efectivo
              </dt>
              <dd className="font-semibold tabular-nums text-ink">{formatoPesos(corte.gastosEfectivoCents)}</dd>
            </div>
          </dl>

          {!mostrarFondo && (
            <button
              type="button"
              onClick={() => setConFondo(true)}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full text-left text-sm font-medium text-ink underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" /> ¿Dejaste cambio en el cajón al abrir? Súmalo
            </button>
          )}

          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            {alBanco > 0 ? (
              <>
                Además te llegan al banco{' '}
                <span className="font-semibold text-ink tabular-nums">{formatoPesos(alBanco)}</span> de tarjeta y
                transferencia.
              </>
            ) : (
              'Lo que te paguen con tarjeta o transferencia no va al cajón: llega a tu banco.'
            )}
          </p>
        </div>

        {/* Cerrar el día: contar y comparar. */}
        <div className="rounded-2xl bg-paper p-4 ring-1 ring-border">
          <FormField label="¿Cuánto contaste en el cajón?" hint="Cuenta los billetes y monedas al cerrar.">
            <Input
              inputMode="decimal"
              placeholder="$0"
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              className="w-full text-lg tabular-nums"
            />
          </FormField>
          {contado.trim() !== '' && (
            <p
              role="status"
              className={`mt-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold ${
                diferencia === null
                  ? 'bg-ink/[0.05] font-normal text-muted'
                  : diferencia === 0
                    ? 'bg-success-soft text-success'
                    : 'bg-warning-soft text-ink'
              }`}
            >
              {diferencia === null
                ? 'Escribe solo números, por ejemplo 1250.'
                : diferencia === 0
                  ? '¡Cuadra! El cajón está completo.'
                  : diferencia > 0
                    ? `Sobran ${formatoPesos(diferencia)}. ¿Falta anotar alguna venta?`
                    : `Faltan ${formatoPesos(-diferencia)}. ¿Falta anotar algún gasto o un pago con tarjeta?`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function FormMovimiento({
  slug,
  hoy,
  editando,
  onClose,
}: {
  slug: string;
  hoy: string;
  editando: Editando;
  onClose: () => void;
}) {
  const router = useRouter();
  const mov = editando.modo === 'editar' ? editando.mov : null;
  const tipo = mov?.tipo ?? (editando.modo === 'nuevo' ? editando.tipo : 'venta');
  const deCita = Boolean(mov?.bookingId);

  const [concepto, setConcepto] = useState(mov?.concepto ?? '');
  const [monto, setMonto] = useState(mov ? String(mov.montoCents / 100) : '');
  const [metodo, setMetodo] = useState<Metodo>(mov?.metodo ?? 'efectivo');
  const [categoria, setCategoria] = useState<CategoriaGasto>(mov?.categoria ?? 'productos');
  const [dia, setDia] = useState(mov?.dia ?? hoy);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  async function correr(accion: () => Promise<{ ok: true } | { ok: false; error: string }>, listo: string) {
    setGuardando(true);
    setError(null);
    const r = await accion();
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    toast(listo);
    router.refresh();
    onClose();
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (deCita && mov?.bookingId) {
      const bookingId = mov.bookingId;
      return correr(() => ajustarVentaDeCita(slug, bookingId, { monto, metodo }), 'Cobro corregido');
    }
    return correr(
      () => guardarMovimiento(slug, { id: mov?.id, tipo, concepto, monto, metodo, categoria, dia }),
      mov ? 'Cambios guardados' : tipo === 'venta' ? 'Venta anotada' : 'Gasto anotado',
    );
  }

  function borrar() {
    if (!mov) return;
    const { bookingId, id } = mov;
    return correr(
      () => (bookingId ? quitarVentaDeCita(slug, bookingId) : borrarMovimiento(slug, id)),
      bookingId ? 'Venta quitada de la caja' : 'Movimiento borrado',
    );
  }

  const titulo = mov
    ? deCita
      ? 'Cobro de una cita'
      : tipo === 'venta'
        ? 'Corregir venta'
        : 'Corregir gasto'
    : tipo === 'venta'
      ? 'Anotar venta'
      : 'Anotar gasto';

  return (
    <Modal open onClose={onClose} title={titulo} size="lg">
      <form onSubmit={guardar} className="flex flex-col gap-4">
        {deCita ? (
          <p className="text-[15px] leading-relaxed text-muted">
            <span className="font-medium text-ink">{mov?.servicio}</span> · {etiquetaDia(mov?.dia ?? hoy, hoy)}. Se
            anotó solo al marcar la cita. Cambia el monto si le hiciste descuento (0 si fue cortesía), o cómo te pagó.
          </p>
        ) : (
          <FormField label={tipo === 'venta' ? '¿Qué vendiste?' : '¿En qué gastaste?'} optional={tipo === 'gasto'}>
            <Input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              maxLength={120}
              placeholder={tipo === 'venta' ? 'Ej. corte, cera, shampoo' : 'Ej. tintes, garrafón'}
              className="w-full"
              required={tipo === 'venta'}
              autoFocus
            />
          </FormField>
        )}

        <FormField label="¿Cuánto?" hint="En pesos. Ej. 250 o 1,250.50">
          <Input
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="$0"
            className="w-full text-lg tabular-nums"
            required
            autoFocus={deCita}
          />
        </FormField>

        {tipo === 'gasto' && (
          <fieldset>
            <legend className="mb-1.5 block text-[13px] font-medium text-ink">¿De qué fue?</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_GASTO.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={categoria === c}
                  onClick={() => setCategoria(c)}
                  className={`${chip(categoria === c)} rounded-full px-4`}
                >
                  {CATEGORIA_LABEL[c]}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-1.5 block text-[13px] font-medium text-ink">
            {tipo === 'venta' ? '¿Cómo te pagaron?' : '¿Cómo pagaste?'}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {METODOS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metodo === m}
                onClick={() => setMetodo(m)}
                className={chip(metodo === m)}
              >
                {METODO_LABEL[m]}
              </button>
            ))}
          </div>
        </fieldset>

        {/* La fecha casi siempre es hoy: plegada para no estorbar. */}
        {!deCita && (
          <details className="group" open={dia !== hoy}>
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-muted underline decoration-dotted underline-offset-4 hover:text-ink">
              {dia === hoy ? 'Es de otro día' : `Día: ${etiquetaDia(dia, hoy)}`}
            </summary>
            <FormField label="¿Qué día fue?" className="mt-2">
              <Input type="date" value={dia} max={hoy} onChange={(e) => setDia(e.target.value)} className="w-full" />
            </FormField>
          </details>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-error-soft px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {mov ? (
            confirmarBorrar ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink">
                  {deCita ? '¿Quitarla de la caja? La cita sigue en tu agenda.' : '¿Borrar este movimiento?'}
                </span>
                <Button type="button" variant="danger" onClick={borrar} disabled={guardando} className="min-h-11">
                  {deCita ? 'Sí, quitarla' : 'Sí, borrar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmarBorrar(false)} className="min-h-11">
                  No
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmarBorrar(true)}
                disabled={guardando}
                className="min-h-11"
              >
                {deCita ? 'Quitar de la caja' : 'Borrar'}
              </Button>
            )
          ) : (
            <span />
          )}
          <Button type="submit" isLoading={guardando} className="min-h-11 max-sm:w-full">
            {guardando ? 'Guardando…' : mov ? 'Guardar cambios' : tipo === 'venta' ? 'Anotar venta' : 'Anotar gasto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
