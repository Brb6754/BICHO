import Link from 'next/link';
import { ArrowUpRight, Eye, FileText, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { computeTotals, formatMoney, formatFolio, isExpired } from '@/lib/quotes/totals';
import { longDate } from '@/lib/dates/tenantTime';

// El Resumen de un negocio que SOLO contrató cotizaciones.
//
// No es el panel de citas con la agenda escondida: es otra pregunta.
// Quien agenda citas abre su panel preguntando "¿qué tengo hoy?"; quien
// cotiza lo abre preguntando "¿quién ya la vio y no me ha contestado?".
// Esa segunda pregunta es la que vende el producto, así que es la que
// contesta esta pantalla.
export async function ResumenCotizaciones({
  slug,
  tenantName,
  now,
}: {
  slug: string;
  tenantName: string;
  now: Date;
}) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id, timezone').eq('slug', slug).single();

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, folio, customer_name, status, tax_rate, discount_cents, valid_until, viewed_at, created_at')
    .eq('tenant_id', tenant!.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return (
      <div>
        <PageHeader title={tenantName} />
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/027_quotes.sql</code> en
            Supabase para activar las cotizaciones.
          </p>
        </div>
      </div>
    );
  }

  const ids = (quotes ?? []).map((q) => q.id);
  const { data: items } = ids.length
    ? await supabase.from('quote_items').select('quote_id, quantity, unit_price_cents').in('quote_id', ids)
    : { data: [] as { quote_id: string; quantity: number; unit_price_cents: number }[] };

  const totalDe = (quoteId: string, discount: number, rate: number) =>
    computeTotals(
      (items ?? [])
        .filter((i) => i.quote_id === quoteId)
        .map((i) => ({ description: '', quantity: Number(i.quantity), unitPriceCents: i.unit_price_cents })),
      { discountCents: discount, taxRate: Number(rate) }
    ).totalCents;

  const vivas = (quotes ?? []).filter(
    (q) => q.status !== 'accepted' && q.status !== 'declined' && !isExpired(q.valid_until, now)
  );
  // Las que el cliente abrió y todavía no contesta. Es la lista por la
  // que alguien paga este producto.
  const abiertas = vivas.filter((q) => q.viewed_at);
  const aceptadas = (quotes ?? []).filter((q) => q.status === 'accepted');

  const enJuego = vivas.reduce((s, q) => s + totalDe(q.id, q.discount_cents, Number(q.tax_rate)), 0);

  const metricas = [
    { label: 'Abiertas por el cliente', valor: String(abiertas.length), Icon: Eye },
    { label: 'En la mesa', valor: formatMoney(enJuego), Icon: FileText },
    { label: 'Aceptadas', valor: String(aceptadas.length), Icon: Check },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={longDate(now, tenant?.timezone ?? null)}
        title={tenantName}
        action={
          <Link
            href="/dashboard/cotizaciones/nueva"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))]"
          >
            Nueva cotización
          </Link>
        }
      />

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {metricas.map(({ label, valor, Icon }) => (
          <div key={label} className="rounded-2xl bg-surface p-5 ring-1 ring-border">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {label}
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">{valor}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-[15px] font-semibold text-ink">
          {abiertas.length ? 'Ya las abrieron y no han contestado' : 'Últimas cotizaciones'}
        </h2>

        <ul className="mt-4 flex flex-col gap-2">
          {(abiertas.length ? abiertas : (quotes ?? []).slice(0, 6)).map((q) => (
            <li
              key={q.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-surface px-5 py-4 ring-1 ring-border"
            >
              <span className="tabular-nums text-[13px] text-muted">#{formatFolio(q.folio)}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{q.customer_name}</span>
              <span className="tabular-nums text-[15px] font-semibold text-ink">
                {formatMoney(totalDe(q.id, q.discount_cents, Number(q.tax_rate)))}
              </span>
            </li>
          ))}
          {!quotes?.length && (
            <li className="rounded-2xl bg-surface px-5 py-6 text-sm text-muted ring-1 ring-border">
              Todavía no hay cotizaciones. La primera te toma menos de un minuto.
            </li>
          )}
        </ul>

        <Link
          href="/dashboard/cotizaciones"
          className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          Ver todas
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
