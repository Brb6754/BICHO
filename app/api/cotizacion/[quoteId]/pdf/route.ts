import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { QuotePdf, type QuotePdfData } from '@/components/quotes/QuotePdf';
import { formatFolio } from '@/lib/quotes/totals';

// @react-pdf necesita APIs de Node (streams, buffers): en el runtime
// edge no existe.
export const runtime = 'nodejs';

// El PDF de una cotización.
//
// El uuid hace de llave, igual que en "Ver mi cita": quien tiene el
// enlace puede verla, y nadie puede adivinar el de otro negocio. Usa
// service_role porque `quotes` no tiene policies — guarda datos de una
// persona y los precios con los que un negocio vende.
export async function GET(_req: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;

  const db = createAdminClient();
  const { data: quote, error } = await db
    .from('quotes')
    .select(
      'id, tenant_id, folio, created_at, valid_until, customer_name, customer_email, customer_phone, notes, tax_rate, tax_label, discount_cents'
    )
    .eq('id', quoteId)
    .maybeSingle();

  if (error || !quote) {
    return new Response('No encontramos esa cotización.', { status: 404 });
  }

  const [{ data: tenant }, { data: items }] = await Promise.all([
    db
      .from('tenants')
      .select('name, logo_url, primary_color, accent_color, location, quote_terms')
      .eq('id', quote.tenant_id)
      .maybeSingle(),
    db
      .from('quote_items')
      .select('description, quantity, unit, unit_price_cents')
      .eq('quote_id', quoteId)
      .order('position'),
  ]);

  const data: QuotePdfData = {
    folio: quote.folio,
    createdAt: quote.created_at,
    validUntil: quote.valid_until,
    customerName: quote.customer_name,
    customerEmail: quote.customer_email,
    customerPhone: quote.customer_phone,
    notes: quote.notes,
    taxRate: Number(quote.tax_rate),
    taxLabel: quote.tax_label,
    discountCents: quote.discount_cents,
    items: (items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit: i.unit,
      unitPriceCents: i.unit_price_cents,
    })),
    business: {
      name: tenant?.name ?? 'Cotización',
      // El logo lo descarga @react-pdf, así que necesita una URL
      // absoluta: una ruta como /demo/logos/x.webp no significa nada
      // fuera de un navegador.
      logoUrl: absolutize(tenant?.logo_url ?? null),
      primaryColor: tenant?.primary_color ?? '#4F46E5',
      accentColor: tenant?.accent_color ?? '#22D3EE',
      location: tenant?.location ?? null,
      terms: tenant?.quote_terms ?? null,
    },
  };

  // El cast existe porque renderToBuffer pide un ReactElement<DocumentProps>
  // y QuotePdf recibe `data`, no las props de <Document>. Devuelve un
  // <Document> de verdad —es lo primero que hace— así que la firma es
  // más estrecha que el componente.
  const elemento = createElement(QuotePdf, { data }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(elemento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      // `inline` y no `attachment`: en un teléfono, un PDF que se abre
      // en la misma pestaña se ve; uno que se descarga se pierde en la
      // carpeta de descargas.
      'Content-Disposition': `inline; filename="cotizacion-${formatFolio(quote.folio)}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

function absolutize(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'bichomx.com';
  const esquema = root.startsWith('localhost') ? 'http' : 'https';
  return `${esquema}://${root}${url.startsWith('/') ? '' : '/'}${url}`;
}
