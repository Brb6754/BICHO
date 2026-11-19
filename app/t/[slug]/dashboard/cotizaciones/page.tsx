import Link from 'next/link';
import { Plus, Send, FileText } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { cotizacionesConIva } from '@/lib/quotes/preciosIva';
import { computeTotals, formatFolio, isExpired } from '@/lib/quotes/totals';
import { CotizacionesLista } from './CotizacionesLista';

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
    // La causa real va al log del servidor; a la dueña nunca se le enseña un nombre de archivo.
    console.error('cotizaciones/page.tsx: falta db/027_quotes.sql?', error.message);
    return (
      <div>
        <PageHeader title="Cotizaciones" />
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Esta sección todavía no está lista en tu cuenta</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No es nada que hayas hecho tú. Escríbenos y la dejamos lista; mientras, el resto de tu panel funciona igual.
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
        description="Arma un presupuesto, mándalo por WhatsApp y ve si lo aceptó."
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
        <CotizacionesLista
          slug={slug}
          cotizaciones={quotes.map((q) => {
            const totals = computeTotals(
              (items ?? [])
                .filter((i) => i.quote_id === q.id)
                .map((i) => ({ description: '', quantity: Number(i.quantity), unitPriceCents: i.unit_price_cents })),
              { discountCents: q.discount_cents, taxRate: Number(q.tax_rate), pricesIncludeTax: conIva.has(q.id) }
            );
            return {
              id: q.id,
              folio: formatFolio(q.folio),
              cliente: q.customer_name,
              // "Vencida" se decide al leer, no con un proceso a medianoche.
              estado: q.status !== 'accepted' && isExpired(q.valid_until, ahora) ? 'expired' : q.status,
              totalCents: totals.totalCents,
              laAbrio: Boolean(q.viewed_at),
            };
          })}
        />
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
