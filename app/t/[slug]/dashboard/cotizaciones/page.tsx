import Link from 'next/link';
import { Plus, Eye, Send, FileText } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { cotizacionesConIva } from '@/lib/quotes/preciosIva';
import { computeTotals, formatMoney, formatFolio, isExpired } from '@/lib/quotes/totals';
import { QuoteRowActions } from './QuoteRowActions';

export const dynamic = 'force-dynamic';

// POR QUÉ ESTA PANTALLA LEE CON service_role Y NO CON LA SESIÓN.
//
// `quotes` y `quote_items` tienen RLS ACTIVO Y CERO POLICIES (db/027),
// igual que customers y bookings: guardan el nombre y el teléfono de una
// persona, y los precios con los que ese negocio vende. Con el cliente
// atado a la cookie, Postgres no devuelve error — devuelve CERO FILAS.
//
// Eso fue exactamente este bug: las cotizaciones se guardaban bien y la
// lista salía vacía, sin un solo mensaje de error. Es el mismo silencio
// que ya mordió a este proyecto con `templates` en agosto.
//
// La membresía se comprueba aquí explícitamente con requireTenantStaff
// en vez de confiar en el layout: el layout protege la navegación, pero
// una pantalla que lee con service_role tiene que poder defenderse sola.


const ESTADOS: Record<string, { texto: string; clase: string }> = {
  draft: { texto: 'Sin enviar', clase: 'bg-ink/[0.07] text-muted' },
  sent: { texto: 'Enviada', clase: 'bg-info-soft text-info' },
  viewed: { texto: 'La abrió', clase: 'bg-warning-soft text-warning' },
  accepted: { texto: 'Aceptada', clase: 'bg-success-soft text-success' },
  declined: { texto: 'Rechazada', clase: 'bg-error-soft text-error' },
  expired: { texto: 'Vencida', clase: 'bg-ink/[0.07] text-muted' },
};

export default async function CotizacionesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId } = await requireTenantStaff(slug);
  const supabase = createAdminClient();

  // Consulta aparte y tolerante: si db/027 todavía no está corrida, la
  // sección explica qué falta en vez de tumbar el dashboard entero.
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, folio, customer_name, status, tax_rate, discount_cents, valid_until, viewed_at, created_at')
    .eq('tenant_id', tenantId)
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
  const conIva = await cotizacionesConIva(supabase, ids);

  const ahora = new Date();

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        description="Arma un presupuesto en un minuto, mándalo por WhatsApp y entérate cuándo lo abrió."
        action={<BotonNueva texto="Nueva cotización" />}
      />

      {!quotes?.length ? (
        <div className="mt-8">
          <EmptyState
            icon={FileText}
            title="Todavía no tienes cotizaciones"
            description="La primera te toma menos de un minuto: para quién es, qué incluye y cuánto cuesta."
            why="Se la mandas por WhatsApp con un link y aquí ves cuándo la abrió y si la aceptó."
            action={<BotonNueva texto="Hacer mi primera cotización" />}
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
              { discountCents: q.discount_cents, taxRate: Number(q.tax_rate), pricesIncludeTax: conIva.has(q.id) }
            );
            // "Vencida" se decide al leer, no con un proceso a medianoche.
            const estado =
              q.status !== 'accepted' && isExpired(q.valid_until, ahora) ? 'expired' : q.status;
            const badge = ESTADOS[estado] ?? ESTADOS.draft;

            return (
              <li key={q.id} className="rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">{q.customer_name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
                      <span className="font-semibold tabular-nums text-ink">{formatMoney(totals.totalCents)}</span>
                      <span className="tabular-nums">#{formatFolio(q.folio)}</span>
                      {q.viewed_at && estado !== 'viewed' && estado !== 'accepted' && (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          la abrió
                        </span>
                      )}
                    </p>
                  </div>

                  <span className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${badge.clase}`}>
                    {badge.texto}
                  </span>

                  <QuoteRowActions
                    slug={slug}
                    quoteId={q.id}
                    folio={formatFolio(q.folio)}
                    customerName={q.customer_name}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-10 max-w-xl text-[13px] leading-relaxed text-muted">
        <Send className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
        Una cotización no es una factura del SAT: no sirve para deducir. Si tu cliente necesita factura,
        cuando la acepte hazla desde Facturas.
      </p>
    </div>
  );
}

function BotonNueva({ texto }: { texto: string }) {
  return (
    <Link
      href="/dashboard/cotizaciones/nueva"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {texto}
    </Link>
  );
}
