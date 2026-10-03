import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeTotals, formatMoney, formatFolio, isExpired, lineTotalCents } from '@/lib/quotes/totals';
import { tenantColorCssVars, mixToPaper, readableFgRgb, darkenHex } from '@/lib/branding/colors';
import { AcceptQuote } from './AcceptQuote';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // La URL da acceso a la cotización de alguien: nunca en un buscador.
  robots: { index: false, follow: false },
  title: 'Cotización',
};

export default async function CotizacionPage({
  params,
}: {
  params: Promise<{ slug: string; quoteId: string }>;
}) {
  const { slug, quoteId } = await params;
  const db = createAdminClient();

  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, logo_url, primary_color, accent_color, location, quote_terms')
    .eq('slug', slug)
    .maybeSingle();
  if (!tenant) notFound();

  const { data: quote } = await db
    .from('quotes')
    .select(
      'id, folio, created_at, valid_until, customer_name, notes, tax_rate, tax_label, discount_cents, status, viewed_at'
    )
    .eq('id', quoteId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();
  if (!quote) notFound();

  const { data: items } = await db
    .from('quote_items')
    .select('description, quantity, unit, unit_price_cents')
    .eq('quote_id', quoteId)
    .order('position');

  // La huella que hace útil al producto: la primera vez que el cliente
  // abre el enlace, el vendedor se entera. Se escribe solo una vez —
  // "la abrió hace veinte minutos" vale; "la ha abierto 14 veces porque
  // recargó" no dice nada.
  if (!quote.viewed_at) {
    await db
      .from('quotes')
      .update({ viewed_at: new Date().toISOString(), status: quote.status === 'sent' ? 'viewed' : quote.status })
      .eq('id', quoteId)
      .eq('tenant_id', tenant.id);
  }

  const partidas = (items ?? []).map((i) => ({
    description: i.description,
    quantity: Number(i.quantity),
    unit: i.unit,
    unitPriceCents: i.unit_price_cents,
  }));

  const totals = computeTotals(partidas, {
    discountCents: quote.discount_cents,
    taxRate: Number(quote.tax_rate),
  });

  const vencida = quote.status !== 'accepted' && isExpired(quote.valid_until, new Date());
  const primary = tenant.primary_color ?? '#4F46E5';
  const accent = tenant.accent_color ?? '#22D3EE';
  const fg = `rgb(${readableFgRgb(primary)})`;

  return (
    <main
      className="tenant-shell min-h-screen"
      style={
        {
          ...tenantColorCssVars(primary, primary, accent),
          backgroundColor: mixToPaper(primary, accent),
        } as React.CSSProperties
      }
    >
      {/* La misma banda de identidad que la página de reservas: quien
          abre esto llega desde un WhatsApp y lo primero que necesita
          saber es de quién es. */}
      <header
        className="px-5 py-8 sm:px-6 sm:py-10"
        style={{ background: `linear-gradient(135deg, ${primary}, ${darkenHex(primary, 22)})`, color: fg }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          {tenant.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt=""
              aria-hidden="true"
              className="h-12 w-auto max-w-[140px] shrink-0 rounded-lg bg-white/95 object-contain p-1"
            />
          )}
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ opacity: 0.75 }}>
              Cotización #{formatFolio(quote.folio)}
            </p>
            <h1 className="mt-0.5 text-[1.4rem] font-bold leading-tight sm:text-2xl">{tenant.name}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
        <p className="text-[15px] text-ink">
          Hola <span className="font-semibold">{quote.customer_name}</span>, esta es tu cotización.
        </p>

        {vencida && (
          <p className="mt-4 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
            Esta cotización venció el {quote.valid_until}. Pídele una nueva a {tenant.name} — los
            precios pueden haber cambiado.
          </p>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
          <ul className="divide-y divide-border">
            {partidas.map((p, i) => (
              <li key={i} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[15px] text-ink">{p.description}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {p.quantity}
                    {p.unit ? ` ${p.unit}` : ''} × {formatMoney(p.unitPriceCents)}
                  </p>
                </div>
                <p className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                  {formatMoney(lineTotalCents(p))}
                </p>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-2 border-t border-border px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums text-ink">{formatMoney(totals.subtotalCents)}</dd>
            </div>
            {totals.discountCents > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Descuento</dt>
                <dd className="tabular-nums text-ink">−{formatMoney(totals.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">
                {quote.tax_label} {Number(quote.tax_rate)}%
              </dt>
              <dd className="tabular-nums text-ink">{formatMoney(totals.taxCents)}</dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="text-2xl font-bold tabular-nums text-ink">{formatMoney(totals.totalCents)}</dd>
            </div>
          </dl>
        </section>

        {quote.notes && (
          <section className="mt-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Notas</h2>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{quote.notes}</p>
          </section>
        )}

        {tenant.quote_terms && (
          <section className="mt-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Condiciones</h2>
            <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-muted">
              {tenant.quote_terms}
            </p>
          </section>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {!vencida && <AcceptQuote slug={slug} quoteId={quoteId} yaAceptada={quote.status === 'accepted'} />}
          <a
            href={`/api/cotizacion/${quoteId}/pdf`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-6 text-[15px] font-medium text-ink transition-colors hover:bg-ink/[0.04]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar PDF
          </a>
        </div>

        {quote.valid_until && !vencida && (
          <p className="mt-6 text-[13px] text-muted">Válida hasta el {quote.valid_until}.</p>
        )}

        <p className="mt-10 border-t border-border pt-5 text-[12px] leading-relaxed text-muted">
          Esta cotización no es un comprobante fiscal (CFDI). Si necesitas factura, pídesela a{' '}
          {tenant.name}.
        </p>
      </div>
    </main>
  );
}
