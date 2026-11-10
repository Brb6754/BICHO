'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight, Banknote, CalendarCheck, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { addDaysKey, dayLabel } from '@/lib/dates/tenantTime';
import {
  CATEGORIAS_GASTO,
  METODOS,
  cambioPct,
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

// CAJA — "¿estoy ganando dinero?" contestado en una pantalla.
//
// Lenguaje de mostrador, no de contador: vendiste, gastaste, te quedó.
// Pensada para el celular: el número grande arriba, los dos botones que
// se usan diario debajo, y el detalle después.

const PERIODOS: { id: Periodo; label: string; anterior: string }[] = [
  { id: 'hoy', label: 'Hoy', anterior: 'ayer' },
  { id: 'semana', label: 'Semana', anterior: 'la semana pasada a estas alturas' },
  { id: 'mes', label: 'Mes', anterior: 'el mes pasado a estas alturas' },
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

type Editando =
  | { modo: 'nuevo'; tipo: 'venta' | 'gasto' }
  | { modo: 'editar'; mov: Movimiento };

function etiquetaDia(key: string, hoy: string): string {
  if (key === hoy) return 'Hoy';
  if (key === addDaysKey(hoy, -1)) return 'Ayer';
  return dayLabel(key, new Date(0), 'UTC');
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
  const [fondo, setFondo] = useState('');

  const rango = rangoDe(periodo, hoy);
  const actual = useMemo(() => resumir(movimientos, rango.desde, rango.hasta), [movimientos, rango.desde, rango.hasta]);
  const anterior = useMemo(
    () => resumir(movimientos, rango.prevDesde, rango.prevHasta),
    [movimientos, rango.prevDesde, rango.prevHasta]
  );
  const corte = corteDeCaja(movimientos, hoy, pesosACentavos(fondo) ?? 0);
  const delPeriodo = movimientos
    .filter((m) => m.dia >= rango.desde && m.dia <= rango.hasta)
    .sort((a, b) => (a.dia === b.dia ? 0 : a.dia < b.dia ? 1 : -1));

  const info = PERIODOS.find((p) => p.id === periodo)!;
  const pct = cambioPct(actual.quedoCents, anterior.quedoCents);
  const maxServicio = actual.porServicio[0]?.cents ?? 0;

  return (
    <div className="mt-6">
      {/* Periodo */}
      <div role="tablist" aria-label="Periodo" className="grid grid-cols-3 gap-1 rounded-full bg-ink/[0.05] p-1">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={periodo === p.id}
            onClick={() => setPeriodo(p.id)}
            className={`rounded-full py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              periodo === p.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* El número que importa */}
      <section className="mt-4 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7">
        <p className="text-sm font-medium text-muted">Te quedó</p>
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
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink/[0.05] px-3 py-1 text-[13px] text-muted">
          {pct === null ? (
            <>
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              Sin datos de {info.anterior} para comparar
            </>
          ) : (
            <>
              {pct >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-error" aria-hidden="true" />
              )}
              <span className={`font-semibold ${pct >= 0 ? 'text-success' : 'text-error'}`}>
                {pct >= 0 ? `${pct}% más` : `${Math.abs(pct)}% menos`}
              </span>
              que {info.anterior}
            </>
          )}
        </p>
      </section>

      {!soloLectura && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button type="button" onClick={() => setEditando({ modo: 'nuevo', tipo: 'venta' })} className="py-3.5">
            <Plus className="h-4 w-4" aria-hidden="true" /> Venta
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setEditando({ modo: 'nuevo', tipo: 'gasto' })}
            className="py-3.5"
          >
            <Minus className="h-4 w-4" aria-hidden="true" /> Gasto
          </Button>
        </div>
      )}

      {/* Corte del día */}
      <section className="mt-6 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-[15px] font-semibold text-ink">Corte de caja de hoy</h2>
        </div>
        <p className="mt-3 text-sm text-muted">En el cajón debería haber</p>
        <p className="mt-1 text-[2rem] font-bold leading-none tracking-tight tabular-nums text-ink">
          {formatoPesos(corte.esperadoCents)}
        </p>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt>
              <label htmlFor="caja-fondo" className="text-muted">
                Con qué abriste (cambio)
              </label>
            </dt>
            <dd>
              <Input
                id="caja-fondo"
                inputMode="decimal"
                placeholder="$0"
                value={fondo}
                onChange={(e) => setFondo(e.target.value)}
                className="w-28 text-right tabular-nums"
              />
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">+ Cobrado en efectivo</dt>
            <dd className="font-medium tabular-nums text-ink">{formatoPesos(corte.ventasEfectivoCents)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">− Pagado en efectivo</dt>
            <dd className="font-medium tabular-nums text-ink">{formatoPesos(corte.gastosEfectivoCents)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Lo de tarjeta y transferencia no está en el cajón: llega al banco.
        </p>
      </section>

      {/* Detalle */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
          <h2 className="text-[15px] font-semibold text-ink">Qué se vendió</h2>
          {actual.porServicio.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Todavía no hay ventas en este periodo.</p>
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
      <section className="mt-6">
        <h2 className="text-[15px] font-semibold text-ink">
          Movimientos <span className="font-normal text-muted">({delPeriodo.length})</span>
        </h2>
        {delPeriodo.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Sin movimientos. Las citas que marques como completadas aparecen aquí solas.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {delPeriodo.slice(0, 150).map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={soloLectura}
                  onClick={() => setEditando({ modo: 'editar', mov: m })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink/[0.03] focus-visible:bg-ink/[0.04] focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-ink">
                      {m.concepto || (m.categoria ? CATEGORIA_LABEL[m.categoria] : 'Venta')}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                      {m.bookingId && <CalendarCheck className="h-3.5 w-3.5" aria-label="De una cita" />}
                      {periodo !== 'hoy' && `${etiquetaDia(m.dia, hoy)} · `}
                      {m.tipo === 'gasto' && m.categoria ? `${CATEGORIA_LABEL[m.categoria]} · ` : ''}
                      {METODO_LABEL[m.metodo]}
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

      {editando && (
        <FormMovimiento slug={slug} hoy={hoy} editando={editando} onClose={() => setEditando(null)} />
      )}
    </div>
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

  async function correr(accion: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setGuardando(true);
    setError(null);
    const r = await accion();
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
    onClose();
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (deCita && mov?.bookingId) {
      const bookingId = mov.bookingId;
      return correr(() => ajustarVentaDeCita(slug, bookingId, { monto, metodo }));
    }
    return correr(() =>
      guardarMovimiento(slug, { id: mov?.id, tipo, concepto, monto, metodo, categoria, dia })
    );
  }

  function borrar() {
    if (!mov) return;
    const pregunta = deCita
      ? '¿Quitar esta venta? La cita sigue en la agenda, solo deja de contar como dinero.'
      : '¿Borrar este movimiento?';
    if (!window.confirm(pregunta)) return;
    const { bookingId, id } = mov;
    return correr(() => (bookingId ? quitarVentaDeCita(slug, bookingId) : borrarMovimiento(slug, id)));
  }

  const titulo = mov
    ? deCita
      ? 'Venta de una cita'
      : tipo === 'venta'
        ? 'Editar venta'
        : 'Editar gasto'
    : tipo === 'venta'
      ? 'Nueva venta'
      : 'Nuevo gasto';

  return (
    <Modal open onClose={onClose} title={titulo} size="lg">
      <form onSubmit={guardar} className="flex flex-col gap-4">
        {deCita ? (
          <p className="text-sm text-muted">
            {mov?.servicio} · {etiquetaDia(mov?.dia ?? hoy, hoy)}. Cambia el monto si hiciste descuento, o cómo te
            pagaron.
          </p>
        ) : (
          <div>
            <Label htmlFor="caja-concepto">{tipo === 'venta' ? '¿Qué vendiste?' : '¿En qué? (opcional)'}</Label>
            <Input
              id="caja-concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              maxLength={120}
              placeholder={tipo === 'venta' ? 'Corte, cera, shampoo…' : 'Tintes, garrafón…'}
              className="w-full"
              autoFocus
            />
          </div>
        )}

        <div>
          <Label htmlFor="caja-monto">¿Cuánto?</Label>
          <Input
            id="caja-monto"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="$0"
            className="w-full text-lg tabular-nums"
            required
            autoFocus={deCita}
          />
        </div>

        {tipo === 'gasto' && (
          <fieldset>
            <legend className="mb-1 block text-xs font-medium text-muted">¿De qué fue?</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_GASTO.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={categoria === c}
                  onClick={() => setCategoria(c)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition ${
                    categoria === c ? 'bg-primary/[0.14] text-ink ring-primary/40' : 'text-muted ring-border hover:text-ink'
                  }`}
                >
                  {CATEGORIA_LABEL[c]}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-1 block text-xs font-medium text-muted">
            {tipo === 'venta' ? '¿Cómo te pagaron?' : '¿Cómo pagaste?'}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {METODOS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metodo === m}
                onClick={() => setMetodo(m)}
                className={`rounded-xl px-2 py-2.5 text-sm font-medium ring-1 transition ${
                  metodo === m ? 'bg-primary/[0.14] text-ink ring-primary/40' : 'text-muted ring-border hover:text-ink'
                }`}
              >
                {METODO_LABEL[m]}
              </button>
            ))}
          </div>
        </fieldset>

        {!deCita && (
          <div>
            <Label htmlFor="caja-dia">Día</Label>
            <Input
              id="caja-dia"
              type="date"
              value={dia}
              max={hoy}
              onChange={(e) => setDia(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {mov ? (
            <Button type="button" variant="ghost" onClick={borrar} disabled={guardando}>
              {deCita ? 'Quitar venta' : 'Borrar'}
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" isLoading={guardando}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
