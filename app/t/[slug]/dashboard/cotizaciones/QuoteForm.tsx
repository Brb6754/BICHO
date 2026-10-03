'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { computeTotals, formatMoney, lineTotalCents } from '@/lib/quotes/totals';
import { createQuote, type NuevaCotizacion } from './actions';

type Partida = { description: string; quantity: string; unitPriceMxn: string; unit: string };

const PARTIDA_VACIA: Partida = { description: '', quantity: '1', unitPriceMxn: '', unit: '' };

// El formulario de cotización.
//
// Dos decisiones que lo hacen rápido, que es lo único que importa aquí:
// una cotización que tarda cinco minutos se sigue haciendo en Word.
//
//  1. Solo el NOMBRE es obligatorio. Correo y teléfono son opcionales
//     porque la mitad de las cotizaciones se mandan por WhatsApp con el
//     enlace, y pedir un correo que no se va a usar es un campo más
//     entre el vendedor y el cliente.
//  2. El total se calcula EN VIVO, con la misma función que usa el
//     servidor. El vendedor ve el número final antes de guardar, que es
//     cuando puede corregirlo.
export function QuoteForm({
  slug,
  taxRateDefault,
  taxLabel,
}: {
  slug: string;
  taxRateDefault: number;
  taxLabel: string;
}) {
  const router = useRouter();
  const [cliente, setCliente] = useState({ name: '', email: '', phone: '' });
  const [partidas, setPartidas] = useState<Partida[]>([{ ...PARTIDA_VACIA }]);
  const [descuento, setDescuento] = useState('');
  const [taxRate, setTaxRate] = useState(String(taxRateDefault));
  const [vigencia, setVigencia] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totales = useMemo(
    () =>
      computeTotals(
        partidas.map((p) => ({
          description: p.description,
          quantity: Number(p.quantity) || 0,
          unitPriceCents: Math.round((Number(p.unitPriceMxn) || 0) * 100),
        })),
        { discountCents: Math.round((Number(descuento) || 0) * 100), taxRate: Number(taxRate) || 0 }
      ),
    [partidas, descuento, taxRate]
  );

  const cambiar = (i: number, campo: keyof Partida, valor: string) =>
    setPartidas((prev) => prev.map((p, j) => (i === j ? { ...p, [campo]: valor } : p)));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError(null);

    const datos: NuevaCotizacion = {
      customerName: cliente.name,
      customerEmail: cliente.email,
      customerPhone: cliente.phone,
      notes: notas,
      discountMxn: Number(descuento) || 0,
      taxRate: Number(taxRate) || 0,
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
    router.push('/dashboard/cotizaciones');
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="text-[15px] font-semibold text-ink">Para quién</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="q-name">Nombre</Label>
            <Input
              id="q-name"
              className="mt-1.5 w-full"
              value={cliente.name}
              onChange={(e) => setCliente({ ...cliente, name: e.target.value })}
              placeholder="Nombre o empresa"
              required
            />
          </div>
          <div>
            <Label htmlFor="q-email">Correo (opcional)</Label>
            <Input
              id="q-email"
              type="email"
              className="mt-1.5 w-full"
              value={cliente.email}
              onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
              placeholder="para enviársela"
            />
          </div>
          <div>
            <Label htmlFor="q-phone">WhatsApp (opcional)</Label>
            <Input
              id="q-phone"
              type="tel"
              className="mt-1.5 w-full"
              value={cliente.phone}
              onChange={(e) => setCliente({ ...cliente, phone: e.target.value })}
              placeholder="618 123 4567"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold text-ink">Conceptos</h2>

        <div className="mt-4 flex flex-col gap-3">
          {partidas.map((p, i) => (
            <div key={i} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_auto] sm:items-end">
                <div>
                  <Label htmlFor={`d-${i}`}>Descripción</Label>
                  <Input
                    id={`d-${i}`}
                    className="mt-1.5 w-full"
                    value={p.description}
                    onChange={(e) => cambiar(i, 'description', e.target.value)}
                    placeholder="Instalación de 6 paneles"
                  />
                </div>
                <div>
                  <Label htmlFor={`c-${i}`}>Cantidad</Label>
                  <Input
                    id={`c-${i}`}
                    className="mt-1.5 w-full"
                    inputMode="decimal"
                    value={p.quantity}
                    onChange={(e) => cambiar(i, 'quantity', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`p-${i}`}>Precio unitario</Label>
                  <Input
                    id={`p-${i}`}
                    className="mt-1.5 w-full"
                    inputMode="decimal"
                    value={p.unitPriceMxn}
                    onChange={(e) => cambiar(i, 'unitPriceMxn', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
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
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
                      aria-label={`Quitar concepto ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
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
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar concepto
        </button>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="q-desc">Descuento</Label>
            <Input
              id="q-desc"
              className="mt-1.5 w-full"
              inputMode="decimal"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="q-tax">{taxLabel} (%)</Label>
            <Input
              id="q-tax"
              className="mt-1.5 w-full"
              inputMode="decimal"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="q-valid">Válida hasta</Label>
            <Input
              id="q-valid"
              type="date"
              className="mt-1.5 w-full"
              value={vigencia}
              onChange={(e) => setVigencia(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="q-notes">Notas (opcional)</Label>
            <textarea
              id="q-notes"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink outline-none transition focus:border-primary sm:text-sm"
              placeholder="Tiempo de entrega, condiciones, lo que se incluye y lo que no."
            />
          </div>
        </div>

        {/* El total, siempre a la vista. Es el número que el vendedor va
            a decir en voz alta por teléfono mientras llena esto. */}
        <aside className="h-fit rounded-2xl bg-surface p-5 ring-1 ring-border">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums text-ink">{formatMoney(totales.subtotalCents)}</dd>
            </div>
            {totales.discountCents > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Descuento</dt>
                <dd className="tabular-nums text-ink">−{formatMoney(totales.discountCents)}</dd>
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

          {error && <p className="mt-4 text-sm text-error">{error}</p>}

          <Button type="submit" className="mt-5 w-full" isLoading={guardando}>
            Guardar cotización
          </Button>
          <p className="mt-2 text-[12px] leading-snug text-muted">
            Se guarda como borrador. Desde la lista la envías por correo o copias su enlace.
          </p>
        </aside>
      </section>
    </form>
  );
}
