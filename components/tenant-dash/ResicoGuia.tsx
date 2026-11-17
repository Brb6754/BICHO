'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calculator, Check, ChevronDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { formatoPesos, pesosACentavos } from '@/lib/caja/resumen';
import { REVISADO, TABLA_MENSUAL, formatoTasa, isrMensualResico } from '@/lib/resico/isr';
import { PASOS_RESICO, type PasoResico } from '@/lib/resico/pasos';
import { marcarPasoResico } from '@/app/t/[slug]/dashboard/resico/actions';

// IMPUESTOS (RESICO) — "¿cuánto voy a pagar?" primero, porque es la
// pregunta que da miedo; luego los trámites que le faltan, y al final
// las explicaciones, plegadas por pregunta para que no sea un muro.
// Fuentes y fecha de verificación: lib/resico/isr.ts y lib/resico/pasos.ts.

export function ResicoGuia({
  slug,
  hechos,
  facturacion = false,
  ventasCajaCents = null,
  soloLectura = false,
}: {
  slug: string;
  hechos: PasoResico[];
  /** Si el negocio tiene Facturación, el paso del sello digital enlaza a ella. */
  facturacion?: boolean;
  /** Ventas del mes en Caja, para precargar la calculadora. null = sin Caja. */
  ventasCajaCents?: number | null;
  /** El panel de demostración: se marca en pantalla, no se guarda. */
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [marcados, setMarcados] = useState<Set<PasoResico>>(new Set(hechos));
  const [guardando, setGuardando] = useState<PasoResico | null>(null);
  const [ingresos, setIngresos] = useState('');

  async function alternar(paso: PasoResico) {
    const hecho = !marcados.has(paso);
    const siguiente = new Set(marcados);
    if (hecho) siguiente.add(paso);
    else siguiente.delete(paso);
    setMarcados(siguiente);
    if (soloLectura) return;
    setGuardando(paso);
    const r = await marcarPasoResico(slug, paso, hecho);
    setGuardando(null);
    if (!r.ok) {
      setMarcados(marcados);
      toast(r.error, 'error');
    } else {
      toast(hecho ? 'Paso marcado como listo' : 'Paso desmarcado');
      router.refresh();
    }
  }

  const cents = pesosACentavos(ingresos);
  const calculo = cents === null ? null : isrMensualResico(cents);
  const total = PASOS_RESICO.length;
  const listos = PASOS_RESICO.filter((p) => marcados.has(p.id)).length;
  const siguiente = PASOS_RESICO.find((p) => !marcados.has(p.id));

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* 1. La calculadora: lo que viene a ver. */}
      <section id="calculadora" className="scroll-mt-24 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-ink/70" aria-hidden="true" />
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">¿Cuánto pagaría de impuestos este mes?</h2>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-3">
            <div>
                <FormField
                  label="¿Cuánto cobraste este mes con factura?"
                  hint="Sin contar el IVA. Incluye la factura global de lo que vendiste sin factura."
                  className="flex-1"
                >
                  <Input
                    inputMode="decimal"
                    placeholder="Ej. 32,000"
                    value={ingresos}
                    onChange={(e) => setIngresos(e.target.value)}
                    className="w-full text-lg tabular-nums"
                  />
                </FormField>
              <div className="mt-1 flex flex-wrap items-center">
                <HelpTip title="¿Qué es el IVA?" label="¿Qué es el IVA?">
                  Es el 16% que se le suma al precio en la factura. No es tuyo: lo cobras y se lo pasas al SAT. Por eso
                  aquí se escribe lo que cobraste sin ese 16%. Ejemplo: si la factura dice $1,160, aquí van $1,000.
                </HelpTip>
                <HelpTip title="¿Qué es la factura global?" label="¿Y la factura global?">
                  Es una sola factura al mes (o a la semana) por todo lo que vendiste a clientas que no te pidieron
                  factura. Con eso, todo lo que cobras queda facturado.
                </HelpTip>
              </div>
            </div>
            {ventasCajaCents !== null && ventasCajaCents > 0 && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setIngresos(String(ventasCajaCents / 100))}
                >
                  Usar mis ventas del mes en Caja ({formatoPesos(ventasCajaCents)})
                </Button>
                <p className="mt-1.5 text-[13px] text-muted">
                  Caja cuenta todo lo vendido. Ajusta la cantidad si incluye IVA.
                </p>
              </div>
            )}
          </div>

          <div aria-live="polite">
            {ingresos.trim() !== '' && cents === null ? (
              <p className="rounded-2xl bg-error-soft p-4 text-sm text-error">
                Escribe solo la cantidad, por ejemplo 32000 o 32,000.50.
              </p>
            ) : calculo && !calculo.ok ? (
              <p className="rounded-2xl bg-warning-soft p-4 text-sm leading-relaxed text-ink">
                Con más de $3,500,000 ya no te toca el RESICO. En ese caso habla con un contador para ver qué te conviene.
              </p>
            ) : calculo?.ok && cents !== null ? (
              <div className="rounded-2xl bg-paper p-5 ring-1 ring-border">
                <p className="text-sm text-muted">Pagarías más o menos</p>
                <p className="mt-1 text-[2.5rem] font-bold leading-none tracking-tight tabular-nums text-ink">
                  {formatoPesos(calculo.isrCents)}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  Es el {formatoTasa(calculo.tasaBps)} de {formatoPesos(cents)}. Se paga a más tardar el{' '}
                  <span className="font-medium text-ink">día 17 del mes siguiente</span>.
                </p>
                <p className="mt-3 flex items-center text-[13px] leading-relaxed text-muted">
                  Es el impuesto sobre lo que ganas (ISR).
                  <HelpTip title="¿Qué es el ISR?">
                    El Impuesto Sobre la Renta: lo que pagas por lo que ganas con tu negocio. En RESICO es un porcentaje
                    chiquito (del 1% al 2.5%) de lo que cobraste con factura, y no restas gastos.
                  </HelpTip>
                </p>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-5 text-[15px] leading-relaxed text-muted">
                Escribe cuánto cobraste y aquí te decimos, en pesos, cuánto pagarías. En RESICO casi siempre es poco: del 1%
                al 2.5%.
              </p>
            )}
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Es un estimado para que sepas más o menos cuánto apartar. No incluye el IVA ni otras obligaciones y no es
              asesoría fiscal: antes de decidir, confírmalo con un contador.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Los trámites. */}
      <section className="rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7" aria-labelledby="tramites-titulo">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tramites-titulo" className="text-[17px] font-semibold tracking-tight text-ink">
            Tus trámites para estar en regla
          </h2>
          <p className="text-sm font-medium tabular-nums text-muted">
            {listos} de {total} listos
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.08]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={listos}
          aria-label="Trámites listos"
        >
          <div
            className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none"
            style={{ width: `${(listos / total) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-[13px] text-muted">
          {siguiente ? `Lo que sigue: ${siguiente.titulo.toLowerCase()}.` : '¡Todo listo! Ya estás en regla.'}
          {soloLectura && ' (Demo: puedes marcar, pero no se guarda.)'}
        </p>

        <ol className="mt-5 flex flex-col gap-3">
          {PASOS_RESICO.map((p, i) => {
            const hecho = marcados.has(p.id);
            const esSiguiente = siguiente?.id === p.id;
            return (
              <li
                key={p.id}
                className={`rounded-2xl p-4 ring-1 ${esSiguiente ? 'bg-paper ring-primary/40' : 'bg-paper ring-border'}`}
              >
                <details open={esSiguiente} className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums ${
                        hecho ? 'bg-success text-white' : 'bg-ink/[0.07] text-ink'
                      }`}
                    >
                      {hecho ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`flex-1 text-[15px] font-medium ${hecho ? 'text-muted line-through decoration-ink/30' : 'text-ink'}`}>
                      {p.titulo}
                    </span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-2 pl-10 text-sm leading-relaxed text-muted">{p.texto}</p>
                  {p.id === 'csd' && facturacion && (
                    <Link
                      href="/dashboard/facturas"
                      className="ml-10 mt-2 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
                    >
                      Con tu sello digital ya puedes hacer facturas aquí
                    </Link>
                  )}
                  <div className="pl-10">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={hecho}
                      disabled={guardando === p.id}
                      onClick={() => alternar(p.id)}
                      className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 ${
                        hecho ? 'bg-primary/10 text-ink ring-primary/40' : 'text-ink ring-border hover:bg-ink/[0.04]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 items-center justify-center rounded-md ring-1 ${
                          hecho ? 'bg-primary text-[rgb(var(--color-cta-fg))] ring-primary' : 'ring-border'
                        }`}
                      >
                        {hecho && <Check className="h-3.5 w-3.5" />}
                      </span>
                      {p.hecho}
                    </button>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 3. Las explicaciones, plegadas por pregunta. */}
      <section aria-labelledby="dudas-titulo">
        <h2 id="dudas-titulo" className="mb-3 text-[17px] font-semibold tracking-tight text-ink">
          Dudas comunes
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-3xl bg-surface ring-1 ring-border">
          <Pregunta titulo="¿Qué es el RESICO?">
            <p>
              Es la forma más sencilla de pagar impuestos si eres persona física y vendes, das servicios o rentas. Se llama
              Régimen Simplificado de Confianza. Pagas un porcentaje chiquito (del 1% al 2.5%) de lo que cobraste con
              factura, sin contar el IVA. No tienes que restar gastos ni guardar cuentas complicadas.
            </p>
          </Pregunta>
          <Pregunta titulo="¿Puedo entrar?">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Sí, si lo que cobraste el año pasado no pasó de $3,500,000. Si vas empezando, si calculas que este año no lo vas a pasar.</li>
              <li>No pueden entrar, entre otros, quienes son socios de una empresa (persona moral).</li>
              <li>Si en el año pasas de $3,500,000, sales del RESICO desde el mes siguiente.</li>
              <li>Si dejas de presentar 3 o más pagos mensuales en un año, o no presentas la anual, también sales.</li>
            </ul>
          </Pregunta>
          <Pregunta titulo="¿Qué me toca hacer cada mes y cada año?">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Hacer factura de todo lo que cobras. Si la clienta no la pide, una factura global junta esas ventas.</li>
              <li>Pedir y guardar las facturas de tus gastos.</li>
              <li>Declarar y pagar tu impuesto cada mes, a más tardar el día 17 del mes siguiente.</li>
              <li>Presentar la declaración anual en abril.</li>
              <li>Si tienes empleados, retenerles su impuesto y pagarlo cada mes, también el día 17.</li>
              <li>Si le cobras a una empresa, te retiene el 1.25% y te da la factura de esa retención.</li>
            </ul>
          </Pregunta>
          <Pregunta titulo="¿Cuándo me conviene hablar con un contador?">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Antes de inscribirte o de cambiarte de régimen.</li>
              <li>Si tienes empleados o vas a contratar.</li>
              <li>Si además tienes sueldo, rentas u otros ingresos.</li>
              <li>Si tus ventas se acercan a $3,500,000 al año.</li>
              <li>Para el IVA: el RESICO es solo del impuesto sobre lo que ganas, y el IVA se calcula aparte.</li>
              <li>Si te llega cualquier aviso del SAT a tu buzón.</li>
            </ul>
          </Pregunta>
          <Pregunta titulo="¿De dónde sale el porcentaje?">
            <p>Depende de cuánto cobraste en el mes. Se aplica a todo lo del mes, no por partes:</p>
            <table className="mt-3 w-full text-left tabular-nums">
              <thead>
                <tr className="text-ink">
                  <th className="py-1.5 font-medium">Si cobraste hasta</th>
                  <th className="py-1.5 font-medium">Pagas</th>
                </tr>
              </thead>
              <tbody>
                {TABLA_MENSUAL.map((t) => (
                  <tr key={t.hastaCents} className="border-t border-border">
                    <td className="py-2">{formatoPesos(t.hastaCents)}</td>
                    <td className="py-2">{formatoTasa(t.tasaBps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Pregunta>
        </div>
      </section>

      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Información de referencia, revisada en {REVISADO} contra la Ley del ISR (arts. 113-E a 113-J) y sat.gob.mx. Las
          reglas y el límite pueden cambiar cada año; para 2027 hay una propuesta de reforma en trámite.
        </span>
      </p>
    </div>
  );
}

function Pregunta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[15px] font-medium text-ink hover:bg-ink/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40">
        {titulo}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="px-5 pb-5 text-sm leading-relaxed text-muted">{children}</div>
    </details>
  );
}
