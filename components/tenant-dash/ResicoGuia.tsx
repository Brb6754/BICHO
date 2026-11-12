'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Calculator, Check, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { formatoPesos, pesosACentavos } from '@/lib/caja/resumen';
import { REVISADO, formatoTasa, isrMensualResico } from '@/lib/resico/isr';
import { PASOS_RESICO, type PasoResico } from '@/lib/resico/pasos';
import { marcarPasoResico } from '@/app/t/[slug]/dashboard/resico/actions';

// GUÍA RESICO — "¿cómo me formalizo?" en lenguaje de mostrador.
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
  /** Si el negocio tiene Facturación, el último paso enlaza a ella. */
  facturacion?: boolean;
  /** Ventas del mes en Caja, para precargar la calculadora. null = sin Caja. */
  ventasCajaCents?: number | null;
  /** El panel de demostración: se marca en pantalla, no se guarda. */
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [marcados, setMarcados] = useState<Set<PasoResico>>(new Set(hechos));
  const [guardando, setGuardando] = useState<PasoResico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingresos, setIngresos] = useState('');

  async function alternar(paso: PasoResico) {
    const hecho = !marcados.has(paso);
    const siguiente = new Set(marcados);
    if (hecho) siguiente.add(paso);
    else siguiente.delete(paso);
    setMarcados(siguiente);
    if (soloLectura) return;
    setGuardando(paso);
    setError(null);
    const r = await marcarPasoResico(slug, paso, hecho);
    setGuardando(null);
    if (!r.ok) {
      setMarcados(marcados);
      setError(r.error);
    } else router.refresh();
  }

  const cents = pesosACentavos(ingresos);
  const calculo = cents === null ? null : isrMensualResico(cents);
  const total = PASOS_RESICO.length;
  const listos = PASOS_RESICO.filter((p) => marcados.has(p.id)).length;

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Disclaimer: arriba, no en letra chiquita al final. */}
      <div className="flex gap-3 rounded-2xl bg-warning-soft p-4 text-sm leading-relaxed text-ink">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <p>
          <span className="font-semibold">Esto es informativo, no es asesoría fiscal.</span> El cálculo es un estimado
          del ISR: no incluye IVA ni otras obligaciones. Antes de decidir, consulta a un contador.
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-ink">¿Qué es el RESICO?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          El Régimen Simplificado de Confianza es una forma de pagar impuestos para personas físicas que venden, dan
          servicios o rentan. Pagas el ISR con una tasa baja, del 1% al 2.5%, sobre lo que cobraste con factura, sin
          contar el IVA. No restas gastos.
        </p>
        <h3 className="mt-5 text-[15px] font-semibold text-ink">¿Quién puede entrar?</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
          <li>Si lo que cobraste el año pasado por tu negocio no pasó de $3,500,000. Si vas empezando, si calculas que este año no lo vas a pasar.</li>
          <li>
            No pueden entrar, entre otros: quienes son socios o accionistas de una empresa (persona moral), y quienes
            tienen ingresos en regímenes fiscales preferentes.
          </li>
          <li>Si en el año pasas de $3,500,000, sales del RESICO desde el mes siguiente.</li>
          <li>Si dejas de presentar 3 o más pagos mensuales en un año, o no presentas la anual, también sales.</li>
        </ul>
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">Tu camino, paso a paso</h2>
          <p className="text-sm tabular-nums text-muted">
            {listos} de {total} listos
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.08]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={listos}
          aria-label="Progreso"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(listos / total) * 100}%` }} />
        </div>
        {soloLectura && <p className="mt-2 text-[13px] text-muted">Demo: puedes marcar, pero no se guarda.</p>}

        <ol className="mt-5 flex flex-col gap-3">
          {PASOS_RESICO.map((p, i) => {
            const hecho = marcados.has(p.id);
            return (
              <li key={p.id} className="rounded-2xl bg-paper p-4 ring-1 ring-border">
                <p className="text-[15px] font-medium text-ink">
                  {i + 1}. {p.titulo}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{p.texto}</p>
                {p.id === 'csd' && facturacion && (
                  <Link href="/dashboard/facturas" className="mt-2 inline-block text-sm font-medium text-primary underline">
                    Ya con tu CSD, configura la Facturación aquí
                  </Link>
                )}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={hecho}
                  disabled={guardando === p.id}
                  onClick={() => alternar(p.id)}
                  className={`mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium ring-1 transition disabled:opacity-60 ${
                    hecho ? 'bg-primary/10 text-ink ring-primary/40' : 'text-muted ring-border hover:text-ink'
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
              </li>
            );
          })}
        </ol>
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-ink">Lo que te toca cada mes y cada año</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
          <li>Hacer factura (CFDI) por todo lo que cobras. Si el cliente no la pide, haces una factura global por esas ventas.</li>
          <li>Pedir y guardar las facturas de tus gastos.</li>
          <li>Declarar y pagar el ISR cada mes, a más tardar el día 17 del mes siguiente.</li>
          <li>Presentar la declaración anual en abril.</li>
          <li>Si tienes empleados, retenerles su ISR y pagarlo cada mes, también el día 17.</li>
          <li>Si le cobras a una empresa (persona moral), te retiene el 1.25% y te da la factura de esa retención.</li>
        </ul>
        <h3 className="mt-5 text-[15px] font-semibold text-ink">¿Cuándo conviene hablar con un contador?</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
          <li>Antes de inscribirte o de cambiarte de régimen.</li>
          <li>Si tienes empleados o vas a contratar.</li>
          <li>Si además tienes sueldo, rentas u otros ingresos.</li>
          <li>Si tus ventas se acercan a $3,500,000 al año.</li>
          <li>Para el IVA: el RESICO es solo del ISR, y el IVA se calcula aparte.</li>
          <li>Si te llega cualquier aviso del SAT a tu buzón.</li>
        </ul>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold text-ink">¿Cuánto ISR pagaría este mes?</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Escribe lo que cobraste en el mes con factura (incluida la global), <span className="font-medium text-ink">sin IVA</span>.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="resico-ingresos">Ingresos del mes</Label>
          <Input
            id="resico-ingresos"
            inputMode="decimal"
            placeholder="Por ejemplo 32,000"
            value={ingresos}
            onChange={(e) => setIngresos(e.target.value)}
            className="w-full sm:max-w-xs"
          />
          {ventasCajaCents !== null && ventasCajaCents > 0 && (
            <div>
              <Button type="button" variant="outline" onClick={() => setIngresos(String(ventasCajaCents / 100))}>
                Usar mis ventas del mes en Caja ({formatoPesos(ventasCajaCents)})
              </Button>
              <p className="mt-1.5 text-[13px] text-muted">
                Caja cuenta todo lo vendido. Ajusta la cantidad si incluye IVA o ventas sin factura.
              </p>
            </div>
          )}
        </div>

        {ingresos.trim() !== '' && cents === null && (
          <p className="mt-4 text-sm text-error">Escribe una cantidad válida, por ejemplo 32000 o 32,000.50.</p>
        )}
        {calculo && !calculo.ok && (
          <p className="mt-4 rounded-2xl bg-error-soft p-4 text-sm text-ink">
            Esa cantidad pasa de $3,500,000: con esos ingresos ya no te toca el RESICO. Habla con un contador.
          </p>
        )}
        {calculo?.ok && cents !== null && (
          <div className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-border">
            <p className="text-sm text-muted">ISR estimado del mes</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">{formatoPesos(calculo.isrCents)}</p>
            <p className="mt-1 text-sm text-muted">
              Tasa de {formatoTasa(calculo.tasaBps)} sobre {formatoPesos(cents)}. En RESICO la tasa se aplica a todo lo del
              mes, no por partes.
            </p>
          </div>
        )}

        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer font-medium text-ink">Ver la tabla mensual</summary>
          <table className="mt-3 w-full text-left tabular-nums">
            <thead>
              <tr className="text-ink">
                <th className="py-1 font-medium">Ingresos del mes, hasta</th>
                <th className="py-1 font-medium">Tasa</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['$25,000.00', '1.00%'],
                ['$50,000.00', '1.10%'],
                ['$83,333.33', '1.50%'],
                ['$208,333.33', '2.00%'],
                ['$3,500,000.00', '2.50%'],
              ].map(([hasta, tasa]) => (
                <tr key={hasta} className="border-t border-border">
                  <td className="py-1.5">{hasta}</td>
                  <td className="py-1.5">{tasa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

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
