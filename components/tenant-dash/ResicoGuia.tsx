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
import { Anillo, CheckAnimado } from '@/components/tenant-dash/dinero/Visual';
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
      {/* 1. La calculadora: lo que viene a ver. Dice desde el título que es
          solo el ISR, y lo que NO incluye se ve siempre, no solo al calcular. */}
      <section id="calculadora" className="scroll-mt-24 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-ink">
            <Calculator className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="flex items-center text-[19px] font-semibold tracking-tight text-ink">
            Calcula tu ISR del mes
            <HelpTip title="¿Qué es el ISR?">
              El Impuesto Sobre la Renta: lo que pagas por lo que ganas con tu negocio. En RESICO es un porcentaje chiquito
              (del 1% al 2.5%) de lo que cobraste con factura, y no restas gastos.
            </HelpTip>
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-3">
            <FormField label="¿Cuánto cobraste este mes con factura, sin IVA?">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted" aria-hidden="true">
                  $
                </span>
                <Input
                  inputMode="decimal"
                  placeholder="32,000"
                  value={ingresos}
                  onChange={(e) => setIngresos(e.target.value)}
                  className="h-14 w-full pl-9 text-xl font-semibold tabular-nums"
                />
              </div>
            </FormField>
            <div className="-mt-1 flex flex-wrap items-center">
              <HelpTip title="¿Por qué sin IVA?" label="¿Por qué sin IVA?">
                El IVA es el 16% que se le suma al precio en la factura. No es tuyo: lo cobras y se lo pasas al SAT. Si la
                factura dice $1,160, aquí van $1,000. Incluye también la factura global de lo que vendiste sin factura.
              </HelpTip>
            </div>
            {ventasCajaCents !== null && ventasCajaCents > 0 && (
              <Button
                type="button"
                variant="outline"
                className="min-h-12 self-start"
                onClick={() => setIngresos(String(ventasCajaCents / 100))}
              >
                Usar mis ventas del mes en Caja ({formatoPesos(ventasCajaCents)})
              </Button>
            )}

            <div className="rounded-2xl bg-warning-soft px-4 py-3.5">
              <p className="text-[15px] font-semibold text-ink">Esta cuenta NO incluye:</p>
              <ul className="mt-1.5 space-y-1 text-[15px] text-ink/85">
                <li className="flex gap-2">
                  <span aria-hidden="true">·</span> El IVA (el 16%), que se declara aparte.
                </li>
                <li className="flex gap-2">
                  <span aria-hidden="true">·</span> Lo que retienes a tus empleados, si tienes.
                </li>
                <li className="flex gap-2">
                  <span aria-hidden="true">·</span> Multas, recargos ni otros impuestos.
                </li>
              </ul>
            </div>
          </div>

          <div aria-live="polite">
            {ingresos.trim() !== '' && cents === null ? (
              <p className="rounded-2xl bg-error-soft p-4 text-[15px] text-error">
                Escribe solo la cantidad, por ejemplo 32000 o 32,000.50.
              </p>
            ) : calculo && !calculo.ok ? (
              <p className="rounded-2xl bg-warning-soft p-4 text-[15px] leading-relaxed text-ink">
                Con más de $3,500,000 ya no te toca el RESICO. En ese caso habla con un contador para ver qué te conviene.
              </p>
            ) : calculo?.ok && cents !== null ? (
              <div key={calculo.tasaBps} className="animate-fade-in rounded-2xl bg-primary/[0.06] p-5 ring-1 ring-primary/20">
                <p className="text-[15px] font-medium text-muted">Tu ISR de este mes, más o menos</p>
                <p className="mt-1 text-[3rem] font-bold leading-none tracking-tight tabular-nums text-ink">
                  {formatoPesos(calculo.isrCents)}
                </p>
                <p className="mt-2 text-[15px] text-ink">
                  Se paga a más tardar el <span className="font-semibold">día 17 del mes siguiente</span>.
                </p>
                <Tramos ingresosCents={cents} tasaBps={calculo.tasaBps} />
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-border p-5">
                <p className="text-[15px] leading-relaxed text-muted">
                  Escribe cuánto cobraste y aquí sale, en pesos, tu ISR. En RESICO casi siempre es poco: del 1% al 2.5%.
                </p>
                <Tramos ingresosCents={null} tasaBps={null} />
              </div>
            )}
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Es un estimado para apartar el dinero, no asesoría fiscal. Confírmalo con un contador.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Los trámites: anillo de avance y una lista que se palomea. */}
      <section className="rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7" aria-labelledby="tramites-titulo">
        <div className="flex items-center gap-5">
          <Anillo hechos={listos} total={total}>
            <span className="text-[1.6rem] font-bold leading-none tabular-nums text-ink">
              {listos}/{total}
            </span>
            <span className="mt-1 text-[12px] font-medium text-muted">listos</span>
          </Anillo>
          <div className="min-w-0">
            <h2 id="tramites-titulo" className="text-[19px] font-semibold tracking-tight text-ink">
              Tus trámites para estar en regla
            </h2>
            <p className="mt-1 text-[15px] text-muted">
              {siguiente ? (
                <>
                  Lo que sigue: <span className="font-medium text-ink">{siguiente.titulo.toLowerCase()}</span>.
                </>
              ) : (
                <span className="font-semibold text-success">¡Todo listo! Ya estás en regla.</span>
              )}
            </p>
            {soloLectura && <p className="mt-1 text-[13px] text-muted">Demo: puedes palomear, pero no se guarda.</p>}
          </div>
        </div>

        <ol className="mt-6 flex flex-col gap-2.5">
          {PASOS_RESICO.map((p, i) => {
            const hecho = marcados.has(p.id);
            const esSiguiente = siguiente?.id === p.id;
            return (
              <li
                key={p.id}
                className={`rounded-2xl ring-1 transition-colors motion-reduce:transition-none ${
                  hecho ? 'bg-success-soft ring-success/25' : esSiguiente ? 'bg-surface ring-2 ring-primary/40' : 'bg-surface ring-border'
                }`}
              >
                <div className="flex items-center gap-3 p-3 pr-4">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={hecho}
                    aria-label={`${p.hecho}: ${p.titulo}`}
                    disabled={guardando === p.id}
                    onClick={() => alternar(p.id)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
                  >
                    {hecho ? (
                      <CheckAnimado />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums text-muted ring-2 ring-ink/20"
                      >
                        {i + 1}
                      </span>
                    )}
                  </button>
                  <details open={esSiguiente} className="group min-w-0 flex-1">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                      <span className={`flex-1 text-[16px] font-medium ${hecho ? 'text-ink/70' : 'text-ink'}`}>{p.titulo}</span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="pb-1 pt-1 text-[15px] leading-relaxed text-muted">{p.texto}</p>
                    {p.id === 'csd' && facturacion && (
                      <Link
                        href="/dashboard/facturas"
                        className="inline-flex min-h-11 items-center text-[15px] font-medium text-ink underline underline-offset-4"
                      >
                        Con tu sello digital ya puedes hacer facturas aquí
                      </Link>
                    )}
                    {!hecho && (
                      <button
                        type="button"
                        onClick={() => alternar(p.id)}
                        disabled={guardando === p.id}
                        className="mb-1 mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-[15px] font-semibold text-[rgb(var(--color-cta-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> {p.hecho}
                      </button>
                    )}
                  </details>
                </div>
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

// En qué tramo de la tabla vas: cinco escalones iguales (el último es
// enorme y a escala real se comería la barra), el tuyo pintado y un
// marcador de cuánto llevas dentro de él.
function Tramos({ ingresosCents, tasaBps }: { ingresosCents: number | null; tasaBps: number | null }) {
  const i = tasaBps === null ? -1 : TABLA_MENSUAL.findIndex((t) => t.tasaBps === tasaBps);
  const desde = i > 0 ? TABLA_MENSUAL[i - 1].hastaCents : 0;
  const dentro =
    i < 0 || ingresosCents === null ? 0 : Math.min(1, Math.max(0, (ingresosCents - desde) / (TABLA_MENSUAL[i].hastaCents - desde)));
  return (
    <div className="mt-5">
      <p className="text-[13px] font-semibold text-muted">
        {i < 0 ? 'Lo que pagas según cuánto cobres' : `Vas en el escalón de hasta ${formatoPesos(TABLA_MENSUAL[i].hastaCents)}`}
      </p>
      <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
        {TABLA_MENSUAL.map((t, j) => (
          <div key={t.hastaCents}>
            <div className={`relative h-3 rounded-full ${j < i ? 'bg-primary/35' : j === i ? 'bg-primary/20' : 'bg-ink/[0.08]'}`}>
              {j === i && (
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
                  style={{ width: `${Math.max(12, dentro * 100)}%` }}
                />
              )}
            </div>
            <p className={`mt-1.5 text-center text-[13px] tabular-nums ${j === i ? 'font-bold text-ink' : 'text-muted'}`}>
              {formatoTasa(t.tasaBps).replace('.00', '')}
            </p>
          </div>
        ))}
      </div>
      {i >= 0 && (
        <p className="mt-2 text-[15px] text-ink">
          Pagas el <span className="font-semibold">{formatoTasa(TABLA_MENSUAL[i].tasaBps)}</span> de todo lo del mes.
        </p>
      )}
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
