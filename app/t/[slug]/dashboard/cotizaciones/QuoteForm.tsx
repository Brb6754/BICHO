'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { computeTotals, formatMoney, lineTotalCents } from '@/lib/quotes/totals';
import { createQuote, type NuevaCotizacion } from './actions';

type Partida = { description: string; quantity: string; unitPriceMxn: string; unit: string };

const PARTIDA_VACIA: Partida = { description: '', quantity: '1', unitPriceMxn: '', unit: '' };

// El formulario de cotización.
//
// Tres decisiones que lo hacen rápido, que es lo único que importa aquí:
// una cotización que tarda cinco minutos se sigue haciendo en Word.
//
//  1. Solo el NOMBRE y lo que incluye son obligatorios. Correo y teléfono
//     son opcionales porque la mitad de las cotizaciones se mandan por
//     WhatsApp con el link.
//  2. El total se calcula EN VIVO, con la misma función que usa el
//     servidor. Ve el número final antes de guardar, que es cuando puede
//     corregirlo.
//  3. Descuento, vigencia, % de IVA y notas casi nunca se tocan: van
//     plegados en "Más opciones". La casilla "mis precios incluyen IVA"
//     sí va a la vista y ANTES de los precios, porque cambia lo que
//     significan (db/059: se recuerda para la próxima).
export function QuoteForm({
  slug,
  taxRateDefault,
  taxLabel,
  preciosConIvaDefault,
}: {
  slug: string;
  taxRateDefault: number;
  taxLabel: string;
  /** El ajuste del negocio (db/059). */
  preciosConIvaDefault: boolean;
}) {
  const router = useRouter();
  const [cliente, setCliente] = useState({ name: '', email: '', phone: '' });
  const [partidas, setPartidas] = useState<Partida[]>([{ ...PARTIDA_VACIA }]);
  const [descuento, setDescuento] = useState('');
  const [taxRate, setTaxRate] = useState(String(taxRateDefault));
  const [conIva, setConIva] = useState(preciosConIvaDefault);
  const [vigencia, setVigencia] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);

  const totales = useMemo(
    () =>
      computeTotals(
        partidas.map((p) => ({
          description: p.description,
          quantity: Number(p.quantity) || 0,
          unitPriceCents: Math.round((Number(p.unitPriceMxn) || 0) * 100),
        })),
        { discountCents: Math.round((Number(descuento) || 0) * 100), taxRate: Number(taxRate) || 0, pricesIncludeTax: conIva }
      ),
    [partidas, descuento, taxRate, conIva]
  );

  const cambiar = (i: number, campo: keyof Partida, valor: string) =>
    setPartidas((prev) => prev.map((p, j) => (i === j ? { ...p, [campo]: valor } : p)));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    // Lo que se puede revisar aquí se dice junto al campo, sin ir al servidor.
    if (!cliente.name.trim()) {
      setErrorNombre('Escribe para quién es: su nombre o el de su negocio.');
      document.getElementById('q-name')?.focus();
      return;
    }
    setErrorNombre(null);
    if (!partidas.some((p) => p.description.trim())) {
      setError('Escribe al menos una cosa que incluye, con su precio.');
      document.getElementById('d-0')?.focus();
      return;
    }
    setGuardando(true);
    setError(null);

    const datos: NuevaCotizacion = {
      customerName: cliente.name,
      customerEmail: cliente.email,
      customerPhone: cliente.phone,
      notes: notas,
      discountMxn: Number(descuento) || 0,
      taxRate: Number(taxRate) || 0,
      pricesIncludeTax: conIva,
      validUntil: vigencia || undefined,
      items: partidas
        .filter((p) => p.description.trim())
        .map((p) => ({
          description: p.description,
          quantity: Number(p.quantity) || 0,
          unitPriceMxn: Number(p.unitPriceMxn) || 0,
          unit: p.unit,
        })),
    };

    const res = await createQuote(slug, datos);
    if (!res.ok) {
      setError(res.error);
      setGuardando(false);
      return;
    }
    toast('Cotización guardada: ya puedes mandarla');
    router.push('/dashboard/cotizaciones');
    router.refresh();
  }

  const precioLabel = `Precio c/u (${conIva ? 'con' : 'sin'} ${taxLabel})`;

  return (
    <form onSubmit={guardar} noValidate className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="text-[17px] font-semibold tracking-tight text-ink">1. ¿Para quién es?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FormField label="Nombre" error={errorNombre}>
            <Input
              id="q-name"
              className="w-full"
              value={cliente.name}
              onChange={(e) => setCliente({ ...cliente, name: e.target.value })}
              placeholder="Ej. Ana López o Hotel Real"
              autoComplete="off"
              error={Boolean(errorNombre)}
            />
          </FormField>
          <FormField label="WhatsApp" optional>
            <Input
              type="tel"
              className="w-full"
              value={cliente.phone}
              onChange={(e) => setCliente({ ...cliente, phone: e.target.value })}
              placeholder="Ej. 618 123 4567"
            />
          </FormField>
          <FormField label="Correo" optional hint="Solo si se la quieres mandar por correo.">
            <Input
              type="email"
              className="w-full"
              value={cliente.email}
              onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
              placeholder="Ej. ana@correo.com"
            />
          </FormField>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">2. ¿Qué incluye?</h2>
          <div className="flex items-center">
            <label className="flex min-h-11 items-center gap-2.5 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={conIva}
                onChange={(e) => setConIva(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-[rgb(var(--color-primary))]"
              />
              Mis precios ya incluyen {taxLabel}
            </label>
            <HelpTip title={`¿Mis precios incluyen ${taxLabel}?`}>
              Si a tus clientas les dices «el paquete cuesta $1,160» y eso es lo que pagan, márcalo: el {taxLabel} se
              separa por dentro y el total no cambia. Si dices «$1,000 más {taxLabel}», déjalo sin marcar. Se recuerda
              para tus próximas cotizaciones.
            </HelpTip>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {partidas.map((p, i) => (
            <div key={i} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_9.5rem_auto] sm:items-end">
                <FormField label="Qué es">
                  <Input
                    id={`d-${i}`}
                    className="w-full"
                    value={p.description}
                    onChange={(e) => cambiar(i, 'description', e.target.value)}
                    placeholder="Ej. Peinado y maquillaje de novia"
                  />
                </FormField>
                <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 sm:contents">
                  <FormField label="Cantidad">
                    <Input
                      className="w-full tabular-nums"
                      inputMode="decimal"
                      value={p.quantity}
                      onChange={(e) => cambiar(i, 'quantity', e.target.value)}
                    />
                  </FormField>
                  <FormField label={precioLabel}>
                    <Input
                      className="w-full tabular-nums"
                      inputMode="decimal"
                      value={p.unitPriceMxn}
                      onChange={(e) => cambiar(i, 'unitPriceMxn', e.target.value)}
                      placeholder="$0"
                    />
                  </FormField>
                </div>
                <div className="flex min-h-11 items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    {formatMoney(
                      lineTotalCents({
                        description: p.description,
                        quantity: Number(p.quantity) || 0,
                        unitPriceCents: Math.round((Number(p.unitPriceMxn) || 0) * 100),
                      })
                    )}
                  </span>
                  {partidas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPartidas((prev) => prev.filter((_, j) => j !== i))}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label={`Quitar ${p.description.trim() || `renglón ${i + 1}`}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setPartidas((prev) => [...prev, { ...PARTIDA_VACIA }])}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar otra cosa
        </button>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Lo que casi nunca se toca, plegado. */}
        <details className="group h-fit rounded-2xl ring-1 ring-border" open={Boolean(descuento || vigencia || notas)}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[15px] font-medium text-ink">
            Más opciones: descuento, vigencia y notas
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <div className="grid gap-4 px-4 pb-4 sm:grid-cols-3">
            <FormField label="Descuento" hint="En pesos.">
              <Input
                className="w-full tabular-nums"
                inputMode="decimal"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                placeholder="$0"
              />
            </FormField>
            <FormField label="Válida hasta" optional>
              <Input type="date" className="w-full" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            </FormField>
            <FormField label={`${taxLabel} (%)`} hint="Casi siempre 16.">
              <Input
                className="w-full tabular-nums"
                inputMode="decimal"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </FormField>
            <FormField label="Notas" optional className="sm:col-span-3">
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink outline-none transition focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 sm:text-sm"
                placeholder="Ej. incluye prueba un día antes; anticipo del 50% para apartar la fecha."
              />
            </FormField>
          </div>
        </details>

        {/* El total, siempre a la vista. Es el número que va a decir en
            voz alta por teléfono mientras llena esto. */}
        <aside className="h-fit rounded-2xl bg-surface p-5 ring-1 ring-border">
          <dl className="flex flex-col gap-2 text-sm">
            {(!conIva || totales.discountCents > 0) && (
              <div className="flex justify-between">
                <dt className="text-muted">{conIva ? 'Importe' : 'Subtotal'}</dt>
                <dd className="tabular-nums text-ink">{formatMoney(totales.subtotalCents)}</dd>
              </div>
            )}
            {totales.discountCents > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Descuento</dt>
                <dd className="tabular-nums text-ink">−{formatMoney(totales.discountCents)}</dd>
              </div>
            )}
            {conIva && (
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal (sin {taxLabel})</dt>
                <dd className="tabular-nums text-ink">{formatMoney(totales.taxableCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">
                {taxLabel} {Number(taxRate) || 0}%
              </dt>
              <dd className="tabular-nums text-ink">{formatMoney(totales.taxCents)}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="text-xl font-bold tabular-nums text-ink">{formatMoney(totales.totalCents)}</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-5 min-h-11 w-full" isLoading={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cotización'}
          </Button>
          <p className="mt-2 text-[13px] leading-snug text-muted">
            Después, desde la lista se la mandas por WhatsApp o por correo.
          </p>
        </aside>
      </section>
    </form>
  );
}
