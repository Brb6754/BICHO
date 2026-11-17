'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, HandCoins, Pencil } from 'lucide-react';
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
import type { PagoComision } from '@/lib/comisiones/datos';
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

const DESCRIPCION_COMISIONES = 'Cuánto le toca a cada quien por lo que vendió, y a quién ya le pagaste.';

function AyudaComisiones() {
  return (
    <HelpTip title="¿Cómo se calcula?">
      A cada persona le toca su porcentaje de lo que cobró en citas que marcaste como «Asistió». Ejemplo: vendió $5,000 y
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
  cajaActiva: boolean;
  /** El panel de demostración: se ve todo, no se guarda nada. */
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [editandoPct, setEditandoPct] = useState<string | null>(null);
  const [pagando, setPagando] = useState<FilaComision | null>(null);
  const [pcts, setPcts] = useState<Record<string, string>>(() =>
    Object.fromEntries(filas.map((f) => [f.resourceId, bpATexto(f.pctBp)]))
  );

  const pagado = new Set(
    pagos.filter((p) => p.desde === rango.desde && p.hasta === rango.hasta).map((p) => p.resourceId)
  );
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
            className={`flex min-h-11 items-center justify-center rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
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
        <p className="text-sm font-medium text-muted">
          Le toca a tu equipo del {fecha(rango.desde)} al {fecha(rango.hasta)}
        </p>
        <p className="mt-1 text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-ink sm:text-[3.5rem]">
          {formatoPesos(total)}
        </p>
        <p className="mt-3 text-[15px] text-muted">
          {total === 0 ? (
            'Todavía no hay comisiones en estas fechas.'
          ) : pendiente === 0 ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-success">
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Ya les pagaste a todos.
            </span>
          ) : pendiente === total ? (
            <>
              Falta pagar <span className="font-semibold text-ink tabular-nums">{formatoPesos(pendiente)}</span>.
            </>
          ) : (
            <>
              Ya pagaste <span className="font-semibold text-ink tabular-nums">{formatoPesos(total - pendiente)}</span>,
              falta <span className="font-semibold text-ink tabular-nums">{formatoPesos(pendiente)}</span>.
            </>
          )}
        </p>
        {abierto && total > 0 && (
          <p className="mt-2 text-[13px] text-muted">
            Cuenta hasta hoy. Estas fechas cierran el {fecha(rango.hasta)}.
          </p>
        )}
      </section>

      {filas.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-surface ring-1 ring-border">
          <EmptyState
            icon={HandCoins}
            title="Todavía no tienes a nadie en tu equipo"
            description="Da de alta a quien atiende y aquí verás cuánto le toca a cada quien."
            why="Se calcula solo con las citas que marcas como «Asistió»: se acabaron las cuentas en la libreta."
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
        <ul className="mt-6 flex flex-col gap-3">
          {filas.map((f) => {
            const yaPagado = pagado.has(f.resourceId);
            const sinCitas = f.citas === 0;
            const sinPct = f.pctBp === 0 && !sinCitas;
            const editando = editandoPct === f.resourceId;
            return (
              <li
                key={f.resourceId}
                className={`rounded-3xl bg-surface p-5 ring-1 ring-border ${sinCitas ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-semibold text-ink">{f.nombre}</p>
                    <p className="mt-0.5 text-[13px] text-muted tabular-nums">
                      {sinCitas
                        ? 'Sin citas en estas fechas'
                        : `${f.citas} ${f.citas === 1 ? 'cita' : 'citas'} · vendió ${formatoPesos(f.vendidoCents)} · su comisión ${bpATexto(f.pctBp)}%`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold leading-none tabular-nums text-ink">{formatoPesos(f.comisionCents)}</p>
                    <p className="mt-1 text-[13px] text-muted">{yaPagado ? 'pagado' : 'le toca'}</p>
                  </div>
                </div>

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
                  (yaPagado || !soloLectura) && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      {yaPagado ? (
                        <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-success-soft px-4 text-sm font-semibold text-success">
                          <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Ya le pagaste
                        </span>
                      ) : f.comisionCents > 0 ? (
                        <Button type="button" onClick={() => setPagando(f)} disabled={pending} className="min-h-11 max-sm:flex-1">
                          Ya le pagué
                        </Button>
                      ) : (
                        <span />
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

      {pagando && (
        <ConfirmarPago
          fila={pagando}
          rango={rango}
          abierto={abierto}
          cajaActiva={cajaActiva}
          ocupado={ocupado === `pago-${pagando.resourceId}`}
          onClose={() => setPagando(null)}
          onConfirm={(enCaja) =>
            correr(
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
