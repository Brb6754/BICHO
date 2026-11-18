'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, HandCoins, Pencil } from 'lucide-react';
import { Avatar, Barra, CheckAnimado } from '@/components/tenant-dash/dinero/Visual';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { formatoPesos } from '@/lib/caja/resumen';
import { bpATexto, type FilaComision, type PeriodoComision, type Rango } from '@/lib/comisiones/calculo';
import type { CitaDetalle, PagoComision } from '@/lib/comisiones/datos';
import { guardarPorcentaje, marcarPagado } from '@/app/t/[slug]/dashboard/comisiones/actions';

// COMISIONES — "¿cuánto le pago a cada quien?" en una pantalla.
// Pensada para el celular: cuánto le toca al equipo arriba, una tarjeta
// por persona con su monto grande y UN botón ("Ya le pagué"). El
// porcentaje se pone una vez, así que vive detrás de "Cambiar %".

const PERIODOS: { id: PeriodoComision; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'quincena', label: 'Quincena' },
  { id: 'mes', label: 'Mes' },
  { id: 'rango', label: 'Fechas' },
];

type Res = { ok: true } | { ok: false; error: string };

function fecha(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d, 12)))
    .replace('.', '');
}

const DESCRIPCION_COMISIONES = 'Cuánto le toca a cada quien y a quién ya le pagaste.';

function AyudaComisiones() {
  return (
    <HelpTip title="¿Cómo se calcula?">
      A cada persona le toca su porcentaje de lo que cobró en citas que marcaste como «Vino». Ejemplo: vendió $5,000 y
      su comisión es 30% → le toca $1,500.
    </HelpTip>
  );
}

export function ComisionesBoard({
  slug,
  basePath,
  periodo,
  rango,
  hoy,
  filas,
  pagos,
  detalle = [],
  cajaActiva,
  soloLectura = false,
}: {
  slug: string;
  /** Ruta PÚBLICA de esta pantalla (/dashboard/comisiones o /panel/comisiones), sin /t/{slug}. */
  basePath: string;
  periodo: PeriodoComision;
  rango: Rango;
  hoy: string;
  filas: FilaComision[];
  pagos: PagoComision[];
  /** Las citas que forman cada importe (del periodo). */
  detalle?: CitaDetalle[];
  cajaActiva: boolean;
  /** El panel de demostración: se ve todo, no se guarda nada. */
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [editandoPct, setEditandoPct] = useState<string | null>(null);
  const [pagando, setPagando] = useState<FilaComision | null>(null);
  const [viendo, setViendo] = useState<FilaComision | null>(null);
  // Demo: "Ya le pagué" se ve funcionar, pero no se guarda.
  const [pagadosDemo, setPagadosDemo] = useState<Set<string>>(new Set());
  const [pcts, setPcts] = useState<Record<string, string>>(() =>
    Object.fromEntries(filas.map((f) => [f.resourceId, bpATexto(f.pctBp)]))
  );

  const pagado = new Set([
    ...pagos.filter((p) => p.desde === rango.desde && p.hasta === rango.hasta).map((p) => p.resourceId),
    ...pagadosDemo,
  ]);
  const total = filas.reduce((s, f) => s + f.comisionCents, 0);
  const pendiente = filas.filter((f) => !pagado.has(f.resourceId)).reduce((s, f) => s + f.comisionCents, 0);
  const abierto = rango.hasta >= hoy;

  function correr(id: string, accion: () => Promise<Res>, listo: string, despues?: () => void) {
    setOcupado(id);
    startTransition(async () => {
      const r = await accion();
      setOcupado(null);
      if (!r.ok) return toast(r.error, 'error');
      toast(listo);
      despues?.();
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader title="Comisiones" description={DESCRIPCION_COMISIONES} help={<AyudaComisiones />} />

      {/* Periodo: enlaces a la ruta pública, el servidor recalcula. */}
      <nav aria-label="Periodo" className="mt-6 grid grid-cols-4 gap-1 rounded-full bg-ink/[0.05] p-1">
        {PERIODOS.map((p) => (
          <Link
            key={p.id}
            href={`${basePath}?periodo=${p.id}`}
            aria-current={periodo === p.id ? 'page' : undefined}
            className={`flex min-h-12 items-center justify-center rounded-full text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              periodo === p.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {periodo === 'rango' && (
        <form action={basePath} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="periodo" value="rango" />
          <FormField label="Desde">
            <Input type="date" name="desde" defaultValue={rango.desde} required />
          </FormField>
          <FormField label="Hasta">
            <Input type="date" name="hasta" defaultValue={rango.hasta} required />
          </FormField>
          <Button type="submit" variant="outline" className="min-h-11">
            Ver esas fechas
          </Button>
        </form>
      )}

      <section className="mt-4 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7" aria-label="Total de comisiones">
        <p className="text-[15px] font-medium text-muted">
          Le toca a tu equipo del {fecha(rango.desde)} al {fecha(rango.hasta)}
        </p>
        <p className="mt-1 text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-ink sm:text-[3.5rem]">
          {formatoPesos(total)}
        </p>
        {total > 0 && (
          <div className="mt-5">
            <Barra
              pct={((total - pendiente) / total) * 100}
              tono="success"
              label="Cuánto ya pagaste de las comisiones"
              grueso
            />
            <div className="mt-2.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[15px]">
              <span className="inline-flex items-center gap-2 text-ink">
                <span aria-hidden="true" className="h-3 w-3 rounded-full bg-success" />
                Pagado <span className="font-semibold tabular-nums">{formatoPesos(total - pendiente)}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-ink">
                <span aria-hidden="true" className="h-3 w-3 rounded-full bg-ink/[0.15]" />
                Falta <span className="font-semibold tabular-nums">{formatoPesos(pendiente)}</span>
              </span>
            </div>
          </div>
        )}
        <p className="mt-3 text-[15px] text-muted">
          {total === 0 ? (
            'Todavía no hay comisiones en estas fechas.'
          ) : pendiente === 0 ? (
            <span className="inline-flex items-center gap-2 font-semibold text-success">
              <CheckAnimado chico /> Ya les pagaste a todos.
            </span>
          ) : null}
        </p>
        {abierto && total > 0 && (
          <p className="mt-1 text-[13px] text-muted">
            Cuenta hasta hoy. Estas fechas cierran el {fecha(rango.hasta)}.
          </p>
        )}
        {pendiente > 0 && (
          <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-ink/[0.04] px-4 py-3 text-[15px] leading-snug text-ink">
            <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
            <span>
              ¿Ya le diste su dinero a alguien? Toca <strong className="font-semibold">«Ya le pagué»</strong> en su tarjeta y
              queda anotado.
            </span>
          </p>
        )}
      </section>

      {filas.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-surface ring-1 ring-border">
          <EmptyState
            icon={HandCoins}
            title="Todavía no tienes a nadie en tu equipo"
            description="Da de alta a quien atiende y aquí verás cuánto le toca a cada quien."
            why="Se calcula solo con las citas que marcas como «Vino»: se acabaron las cuentas en la libreta."
            action={
              !soloLectura && (
                <Link
                  href="/dashboard/resources"
                  className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  Agregar a quien atiende
                </Link>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filas.map((f) => {
            const yaPagado = pagado.has(f.resourceId);
            const sinCitas = f.citas === 0;
            const sinPct = f.pctBp === 0 && !sinCitas;
            const editando = editandoPct === f.resourceId;
            return (
              <li
                key={f.resourceId}
                className={`animate-fade-in rounded-3xl bg-surface p-5 ring-1 ${yaPagado ? 'ring-success/30' : 'ring-border'} ${sinCitas ? 'opacity-60' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setViendo(f)}
                  disabled={sinCitas}
                  className="-m-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default disabled:hover:bg-transparent"
                  aria-label={sinCitas ? undefined : `Ver las citas de ${f.nombre}`}
                >
                  <Avatar nombre={f.nombre} grande />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-semibold text-ink">{f.nombre}</p>
                    <p className="mt-0.5 text-[15px] text-muted tabular-nums">
                      {sinCitas
                        ? 'Sin citas en estas fechas'
                        : `${f.citas} ${f.citas === 1 ? 'cita' : 'citas'} · vendió ${formatoPesos(f.vendidoCents)}`}
                    </p>
                  </div>
                  {!sinCitas && (
                    <span className="shrink-0 rounded-full bg-ink/[0.06] px-3 py-1 text-[13px] font-semibold tabular-nums text-ink">
                      {bpATexto(f.pctBp)}%
                    </span>
                  )}
                </button>

                <p className="mt-4 text-[15px] font-medium text-muted">{yaPagado ? 'Ya le pagaste' : 'Le toca'}</p>
                <p className="text-[2.5rem] font-bold leading-none tracking-tight tabular-nums text-ink">
                  {formatoPesos(f.comisionCents)}
                </p>
                {f.comisionCents > 0 && (
                  <div className="mt-3">
                    <Barra
                      pct={yaPagado ? 100 : 0}
                      tono="success"
                      label={yaPagado ? `Comisión de ${f.nombre} pagada` : `Comisión de ${f.nombre} pendiente`}
                    />
                    <p className="mt-1.5 text-[13px] font-medium text-muted">
                      {yaPagado ? 'Pagado completo' : 'Pendiente de pagar'}
                    </p>
                  </div>
                )}

                {sinPct && !editando && (
                  <p className="mt-3 rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-ink">
                    Todavía no tiene porcentaje, por eso le toca $0. Ponle el suyo.
                  </p>
                )}

                {editando ? (
                  <form
                    className="mt-4 flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      correr(
                        `pct-${f.resourceId}`,
                        () => guardarPorcentaje(slug, f.resourceId, pcts[f.resourceId] ?? ''),
                        `Comisión de ${f.nombre} guardada`,
                        () => setEditandoPct(null)
                      );
                    }}
                  >
                    <FormField label={`Comisión de ${f.nombre}`} hint="Ej. 30 o 12.5">
                      <Input
                        inputMode="decimal"
                        value={pcts[f.resourceId] ?? ''}
                        onChange={(e) => setPcts({ ...pcts, [f.resourceId]: e.target.value })}
                        className="w-28 tabular-nums"
                        autoFocus
                      />
                    </FormField>
                    <span className="mb-[1.6rem] text-[15px] text-muted" aria-hidden="true">
                      %
                    </span>
                    <div className="mb-[1.35rem] flex gap-2">
                      <Button type="submit" isLoading={ocupado === `pct-${f.resourceId}`} disabled={pending} className="min-h-11">
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                          setPcts({ ...pcts, [f.resourceId]: bpATexto(f.pctBp) });
                          setEditandoPct(null);
                        }}
                      >
                        No cambiar
                      </Button>
                    </div>
                  </form>
                ) : (
                  (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      {yaPagado ? (
                        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-success-soft py-1 pl-1.5 pr-4 text-[15px] font-semibold text-success">
                          <CheckAnimado /> Ya le pagaste
                        </span>
                      ) : f.comisionCents > 0 ? (
                        <Button type="button" onClick={() => setPagando(f)} disabled={pending} className="min-h-12 text-[15px] font-semibold max-sm:flex-1 max-sm:basis-36">
                          <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /> Ya le pagué
                        </Button>
                      ) : (
                        <span />
                      )}
                      {!sinCitas && (
                        <Button type="button" variant="outline" onClick={() => setViendo(f)} className="min-h-11 max-sm:flex-1 max-sm:basis-36">
                          {f.citas === 1 ? 'Ver su cita' : `Ver sus ${f.citas} citas`}
                        </Button>
                      )}
                      {!soloLectura && (
                        <Button
                          type="button"
                          variant={sinPct ? 'primary' : 'outline'}
                          onClick={() => setEditandoPct(f.resourceId)}
                          className="min-h-11"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          {sinPct ? 'Poner su %' : 'Cambiar %'}
                        </Button>
                      )}
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-10">
        <h2 className="text-[17px] font-semibold tracking-tight text-ink">Pagos que ya hiciste</h2>
        {pagos.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Cuando le pagues a alguien, tócale «Ya le pagué» y aquí queda el registro.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-3xl bg-surface ring-1 ring-border">
            {pagos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{p.nombre}</p>
                  <p className="text-[13px] text-muted">
                    {fecha(p.desde)} – {fecha(p.hasta)} · {p.citas} {p.citas === 1 ? 'cita' : 'citas'} · {bpATexto(p.pctBp)}%
                    {p.enCaja && ' · anotado en Caja'}
                  </p>
                </div>
                <p className="font-semibold tabular-nums text-ink">{formatoPesos(p.comisionCents)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {viendo && (
        <CitasDePersona
          fila={viendo}
          citas={detalle.filter((c) => c.resourceId === viendo.resourceId)}
          rango={rango}
          yaPagado={pagado.has(viendo.resourceId)}
          onClose={() => setViendo(null)}
          onPagar={() => {
            setPagando(viendo);
            setViendo(null);
          }}
        />
      )}

      {pagando && (
        <ConfirmarPago
          fila={pagando}
          rango={rango}
          abierto={abierto}
          cajaActiva={cajaActiva}
          ocupado={ocupado === `pago-${pagando.resourceId}`}
          onClose={() => setPagando(null)}
          onConfirm={(enCaja) =>
            soloLectura
              ? (setPagadosDemo((s) => new Set(s).add(pagando.resourceId)),
                toast(`Pago a ${pagando.nombre} anotado (demo, no se guarda)`),
                setPagando(null))
              : correr(
              `pago-${pagando.resourceId}`,
              () =>
                marcarPagado(slug, {
                  resourceId: pagando.resourceId,
                  desde: rango.desde,
                  hasta: rango.hasta,
                  registrarEnCaja: cajaActiva && enCaja,
                }),
              `Pago a ${pagando.nombre} anotado`,
              () => setPagando(null)
            )
          }
        />
      )}
    </div>
  );
}

// De dónde sale el importe: cada cita con su precio y lo que le toca de
// ella, y la cuenta completa abajo (vendió × su % = le toca).
function CitasDePersona({
  fila,
  citas,
  rango,
  yaPagado,
  onClose,
  onPagar,
}: {
  fila: FilaComision;
  citas: CitaDetalle[];
  rango: Rango;
  yaPagado: boolean;
  onClose: () => void;
  onPagar: () => void;
}) {
  const ordenadas = [...citas].sort((a, b) => `${b.dia}${b.hora ?? ''}`.localeCompare(`${a.dia}${a.hora ?? ''}`));
  return (
    <Modal open onClose={onClose} title={`Citas de ${fila.nombre}`} size="lg">
      <p className="text-[15px] text-muted">
        Del {fecha(rango.desde)} al {fecha(rango.hasta)}, solo las que marcaste como «Vino».
      </p>
      {ordenadas.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-ink/[0.04] px-4 py-3 text-[15px] text-ink">No hay citas en estas fechas.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-2xl ring-1 ring-border">
          {ordenadas.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{c.servicio}</p>
                <p className="truncate text-[13px] text-muted">
                  {fecha(c.dia)}
                  {c.hora && ` · ${c.hora}`}
                  {c.cliente && ` · ${c.cliente}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[15px] font-semibold tabular-nums text-ink">{formatoPesos(c.precioCents)}</p>
                <p className="text-[13px] tabular-nums text-muted">
                  le toca {formatoPesos(Math.round((c.precioCents * fila.pctBp) / 10_000))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 rounded-2xl bg-ink/[0.04] p-4">
        <p className="text-[15px] text-ink tabular-nums">
          Vendió {formatoPesos(fila.vendidoCents)} × {bpATexto(fila.pctBp)}%
        </p>
        <p className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-medium text-muted">{yaPagado ? 'Ya le pagaste' : 'Le toca'}</span>
          <span className="text-[1.75rem] font-bold leading-none tabular-nums text-ink">{formatoPesos(fila.comisionCents)}</span>
        </p>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="min-h-11">
          Cerrar
        </Button>
        {!yaPagado && fila.comisionCents > 0 && (
          <Button type="button" onClick={onPagar} className="min-h-11">
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> Ya le pagué
          </Button>
        )}
      </div>
    </Modal>
  );
}

// Marcar un pago no se deshace desde aquí: se confirma diciendo el monto,
// el nombre y las fechas, y el gasto en Caja se decide en el mismo paso.
function ConfirmarPago({
  fila,
  rango,
  abierto,
  cajaActiva,
  ocupado,
  onClose,
  onConfirm,
}: {
  fila: FilaComision;
  rango: Rango;
  abierto: boolean;
  cajaActiva: boolean;
  ocupado: boolean;
  onClose: () => void;
  onConfirm: (enCaja: boolean) => void;
}) {
  const [enCaja, setEnCaja] = useState(true);
  return (
    <Modal open onClose={onClose} title={`¿Ya le pagaste a ${fila.nombre}?`}>
      <p className="text-[15px] leading-relaxed text-muted">
        <span className="font-semibold text-ink tabular-nums">{formatoPesos(fila.comisionCents)}</span> por sus citas del{' '}
        {fecha(rango.desde)} al {fecha(rango.hasta)}. Queda anotado como pagado.
        {abierto && ' Las citas de los días que faltan ya no entran en este pago.'}
      </p>
      {cajaActiva && (
        <label className="mt-4 flex min-h-11 items-center gap-3 text-[15px] text-ink">
          <input
            type="checkbox"
            checked={enCaja}
            onChange={(e) => setEnCaja(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[rgb(var(--color-primary))]"
          />
          Anotarlo también como gasto de sueldos en tu Caja
        </label>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="min-h-11">
          Todavía no
        </Button>
        <Button type="button" onClick={() => onConfirm(enCaja)} isLoading={ocupado} className="min-h-11">
          Sí, ya le pagué
        </Button>
      </div>
    </Modal>
  );
}
