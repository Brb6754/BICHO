import Link from 'next/link';
import { Plus, Eye, Check, Send, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { computeTotals, formatMoney, formatFolio, isExpired } from '@/lib/quotes/totals';
import { QuoteRowActions } from './QuoteRowActions';

export const dynamic = 'force-dynamic';

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  draft: { texto: 'Borrador', clase: 'bg-ink/[0.07] text-muted' },
  sent: { texto: 'Enviada', clase: 'bg-info-soft text-info' },
  viewed: { texto: 'Vista', clase: 'bg-warning-soft text-warning' },
  accepted: { texto: 'Aceptada', clase: 'bg-success-soft text-success' },
  declined: { texto: 'Rechazada', clase: 'bg-error-soft text-error' },
  expired: { texto: 'Vencida', clase: 'bg-ink/[0.07] text-muted' },
};

export default async function CotizacionesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();

  // Consulta aparte y tolerante: si db/027 todavía no está corrida, la
  // sección explica qué falta en vez de tumbar el dashboard entero.
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, folio, customer_name, status, tax_rate, discount_cents, valid_until, viewed_at, created_at')
    .eq('tenant_id', tenant!.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div>
        <PageHeader title="Cotizaciones" />
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/027_quotes.sql</code> en el
            SQL Editor de Supabase y recarga esta página.
          </p>
        </div>
      </div>
    );
  }

  const ids = (quotes ?? []).map((q) => q.id);
  const { data: items } = ids.length
    ? await supabase.from('quote_items').select('quote_id, quantity, unit_price_cents').in('quote_id', ids)
    : { data: [] as { quote_id: string; quantity: number; unit_price_cents: number }[] };

  const ahora = new Date();

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        description="Ármala en treinta segundos, mándala y entérate cuándo la abrió."
        action={
          <Link
            href="/dashboard/cotizaciones/nueva"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva cotización
          </Link>
        }
      />

      {!quotes?.length ? (
        <div className="mt-8">
          <EmptyState
            icon={FileText}
            title="Todavía no hay cotizaciones"
            description="La primera te va a tomar menos de un minuto: nombre del cliente, conceptos y listo."
          />
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {quotes.map((q) => {
            const suyas = (items ?? []).filter((i) => i.quote_id === q.id);
            const totals = computeTotals(
              suyas.map((i) => ({
                description: '',
                quantity: Number(i.quantity),
                unitPriceCents: i.unit_price_cents,
              })),
              { discountCents: q.discount_cents, taxRate: Number(q.tax_rate) }
            );
            // "Vencida" se decide al leer, no con un proceso a medianoche.
            const estado =
              q.status !== 'accepted' && isExpired(q.valid_until, ahora) ? 'expired' : q.status;
            const badge = ESTADOS[estado] ?? ESTADOS.draft;

            return (
              <li key={q.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
                      <span className="tabular-nums text-muted">#{formatFolio(q.folio)}</span>
                      <span className="truncate">{q.customer_name}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
                      <span className="tabular-nums">{formatMoney(totals.totalCents)}</span>
                      {q.viewed_at && (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          la abrió
                        </span>
                      )}
                      {estado === 'accepted' && (
                        <span className="inline-flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          aceptada
                        </span>
                      )}
                    </p>
                  </div>

                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${badge.clase}`}>
                    {badge.texto}
                  </span>

                  <QuoteRowActions slug={slug} quoteId={q.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-10 max-w-xl text-[13px] leading-relaxed text-muted">
        <Send className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
        Una cotización no es una factura: no lleva folio fiscal ni sirve para deducir. Si tu cliente
        necesita CFDI, se lo timbras aparte.
      </p>
    </div>
  );
}
