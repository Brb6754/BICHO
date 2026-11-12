'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, HandCoins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatoPesos } from '@/lib/caja/resumen';
import { bpATexto, type FilaComision, type PeriodoComision, type Rango } from '@/lib/comisiones/calculo';
import type { PagoComision } from '@/lib/comisiones/datos';
import { guardarPorcentaje, marcarPagado } from '@/app/t/[slug]/dashboard/comisiones/actions';

// COMISIONES — "¿cuánto le pago a cada quien?" en una pantalla.
// Pensada para el celular: el total arriba, una tarjeta por persona.

const PERIODOS: { id: PeriodoComision; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'quincena', label: 'Quincena' },
  { id: 'mes', label: 'Mes' },
  { id: 'rango', label: 'Rango' },
];

function fecha(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
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
  const [error, setError] = useState<string | null>(null);
  const [enCaja, setEnCaja] = useState(true);
  const [pcts, setPcts] = useState<Record<string, string>>(() =>
    Object.fromEntries(filas.map((f) => [f.resourceId, bpATexto(f.pctBp)]))
  );

  const pagado = new Set(
    pagos.filter((p) => p.desde === rango.desde && p.hasta === rango.hasta).map((p) => p.resourceId)
  );
  const total = filas.reduce((s, f) => s + f.comisionCents, 0);
  const pendiente = filas.filter((f) => !pagado.has(f.resourceId)).reduce((s, f) => s + f.comisionCents, 0);

  function correr(id: string, accion: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setOcupado(id);
    setError(null);
    startTransition(async () => {
      const r = await accion();
      if (!r.ok) setError(r.error);
      else router.refresh();
      setOcupado(null);
    });
  }

  return (
    <div className="mt-6">
      {/* Periodo: enlaces a la ruta pública, el servidor recalcula. */}
      <nav aria-label="Periodo" className="grid grid-cols-4 gap-1 rounded-full bg-ink/[0.05] p-1">
        {PERIODOS.map((p) => (
          <Link
            key={p.id}
            href={`${basePath}?periodo=${p.id}`}
            aria-current={periodo === p.id ? 'page' : undefined}
            className={`rounded-full py-2 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
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
          <div className="flex flex-col gap-1">
            <Label htmlFor="com-desde">Desde</Label>
            <Input id="com-desde" type="date" name="desde" defaultValue={rango.desde} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="com-hasta">Hasta</Label>
            <Input id="com-hasta" type="date" name="hasta" defaultValue={rango.hasta} required />
          </div>
          <Button type="submit" variant="outline">
            Ver
          </Button>
        </form>
      )}

      <section className="mt-4 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7">
        <p className="text-sm font-medium text-muted">
          Comisiones del {fecha(rango.desde)} al {fecha(rango.hasta)}
        </p>
        <p className="mt-1 text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-ink sm:text-[3.5rem]">
          {formatoPesos(total)}
        </p>
        <p className="mt-3 text-[15px] text-muted">
          Falta pagar <span className="font-semibold text-ink tabular-nums">{formatoPesos(pendiente)}</span>.
          {rango.hasta >= hoy && ' El periodo todavía no termina: las citas que falten no entran si lo pagas hoy.'}
        </p>
        {cajaActiva && !soloLectura && (
          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={enCaja}
              onChange={(e) => setEnCaja(e.target.checked)}
              className="h-4 w-4 accent-[rgb(var(--color-primary))]"
            />
            Registrar cada pago como gasto en Caja (sueldos)
          </label>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-error-soft px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {filas.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={HandCoins}
            title="Todavía no hay nadie en Quién atiende"
            description="Da de alta a tu equipo en Quién atiende y aquí verás cuánto le toca a cada quien."
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {filas.map((f) => {
            const yaPagado = pagado.has(f.resourceId);
            return (
              <li key={f.resourceId} className="rounded-3xl bg-surface p-5 ring-1 ring-border">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">{f.nombre}</p>
                    <p className="mt-0.5 text-sm text-muted tabular-nums">
                      {f.citas} {f.citas === 1 ? 'cita' : 'citas'} · vendió {formatoPesos(f.vendidoCents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular-nums text-ink">{formatoPesos(f.comisionCents)}</p>
                    <p className="text-xs text-muted">al {bpATexto(f.pctBp)}%</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  {!soloLectura && (
                    <div className="flex items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`pct-${f.resourceId}`}>Comisión %</Label>
                        <Input
                          id={`pct-${f.resourceId}`}
                          inputMode="decimal"
                          value={pcts[f.resourceId] ?? ''}
                          onChange={(e) => setPcts({ ...pcts, [f.resourceId]: e.target.value })}
                          className="w-24"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending || pcts[f.resourceId] === bpATexto(f.pctBp)}
                        isLoading={ocupado === `pct-${f.resourceId}`}
                        onClick={() =>
                          correr(`pct-${f.resourceId}`, () => guardarPorcentaje(slug, f.resourceId, pcts[f.resourceId] ?? ''))
                        }
                      >
                        Guardar
                      </Button>
                    </div>
                  )}
                  <div className="ml-auto">
                    {yaPagado ? (
                      <Badge>
                        <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Pagado
                      </Badge>
                    ) : (
                      !soloLectura &&
                      f.comisionCents > 0 && (
                        <Button
                          type="button"
                          disabled={pending}
                          isLoading={ocupado === `pago-${f.resourceId}`}
                          onClick={() =>
                            correr(`pago-${f.resourceId}`, () =>
                              marcarPagado(slug, {
                                resourceId: f.resourceId,
                                desde: rango.desde,
                                hasta: rango.hasta,
                                registrarEnCaja: cajaActiva && enCaja,
                              })
                            )
                          }
                        >
                          Marcar como pagado
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold text-ink">Pagos registrados</h2>
        {pagos.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Todavía no has marcado ningún pago.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-3xl bg-surface ring-1 ring-border">
            {pagos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{p.nombre}</p>
                  <p className="text-muted">
                    {fecha(p.desde)} – {fecha(p.hasta)} · {p.citas} {p.citas === 1 ? 'cita' : 'citas'} · {bpATexto(p.pctBp)}%
                    {p.enCaja && ' · en Caja'}
                  </p>
                </div>
                <p className="font-semibold tabular-nums text-ink">{formatoPesos(p.comisionCents)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
