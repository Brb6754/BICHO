import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { computeTotals, formatMoney, formatFolio } from '@/lib/quotes/totals';
import { NuevaFacturaForm, type CotizacionFacturable } from '../NuevaFacturaForm';

export const dynamic = 'force-dynamic';

// Qué se puede facturar: solo lo ACEPTADO y sin factura viva.
//
// Lo primero porque facturar algo que el cliente no aceptó es emitir un
// comprobante fiscal de una venta que no ocurrió. Lo segundo porque una
// cotización no puede tener dos CFDI — el índice de db/036 lo impide de
// todos modos, pero ofrecerla y que reviente es peor que no ofrecerla.
export default async function NuevaFacturaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cotizacion?: string }>;
}) {
  const { slug } = await params;
  const { cotizacion } = await searchParams;

  const productos = await productosDe(slug);
  if (!productos.facturacion) redirect('/dashboard');

  const { tenantId } = await requireTenantStaff(slug);
  const db = createAdminClient();

  const { data: credenciales } = await db
    .from('tenant_billing_credentials')
    .select('api_key, live')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const { data: quotes } = await db
    .from('quotes')
    .select('id, folio, customer_name, tax_rate, discount_cents')
    .eq('tenant_id', tenantId)
    .eq('status', 'accepted')
    .order('folio', { ascending: false });

  const ids = (quotes ?? []).map((q) => q.id);

  const { data: items } = ids.length
    ? await db.from('quote_items').select('quote_id, quantity, unit_price_cents').in('quote_id', ids)
    : { data: [] as { quote_id: string; quantity: number; unit_price_cents: number }[] };

  const { data: yaFacturadas } = ids.length
    ? await db.from('invoices').select('quote_id').in('quote_id', ids).in('status', ['draft', 'stamped'])
    : { data: [] as { quote_id: string | null }[] };

  const ocupadas = new Set((yaFacturadas ?? []).map((i) => i.quote_id));

  const facturables: CotizacionFacturable[] = (quotes ?? [])
    .filter((q) => !ocupadas.has(q.id))
    .map((q) => ({
      id: q.id,
      folio: formatFolio(q.folio),
      customerName: q.customer_name,
      total: formatMoney(
        computeTotals(
          (items ?? [])
            .filter((i) => i.quote_id === q.id)
            .map((i) => ({ description: '', quantity: Number(i.quantity), unitPriceCents: i.unit_price_cents })),
          { discountCents: q.discount_cents, taxRate: Number(q.tax_rate) }
        ).totalCents
      ),
    }));

  return (
    <div>
      <PageHeader
        title="Nueva factura"
        description="Se factura una cotización aceptada, con los datos fiscales de quien la recibe."
      />

      {!credenciales?.api_key ? (
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Todavía no puedes emitir</p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            Falta conectar este negocio: su RFC, su Certificado de Sello Digital y la Carta
            Manifiesto.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          {!credenciales.live && (
            <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-ink ring-1 ring-border">
              <strong className="font-semibold">Modo de pruebas.</strong> Esto timbra un CFDI sin
              efectos fiscales. Sirve para probar, no para entregárselo a un cliente.
            </p>
          )}
          <NuevaFacturaForm slug={slug} cotizaciones={facturables} preseleccion={cotizacion} />
        </div>
      )}
    </div>
  );
}
