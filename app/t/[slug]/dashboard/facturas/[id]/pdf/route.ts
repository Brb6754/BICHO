import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { downloadInvoiceFile } from '@/lib/billing/facturapi';

// El PDF de una factura hecha, para el botón "Bajar PDF" de la lista.
//
// Solo lee: pide el archivo al PAC con la llave del negocio (que nunca
// llega al navegador) y lo entrega tal cual. La membresía se comprueba
// con requireTenantStaff y la factura se busca con tenant_id, así una
// factura de otro negocio no se puede bajar aunque alguien tenga su id.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let tenantId: string;
  try {
    ({ tenantId } = await requireTenantStaff(slug));
  } catch {
    return new Response('Inicia sesión para bajar la factura.', { status: 401 });
  }

  const db = createAdminClient();
  const [{ data: factura }, { data: cred }] = await Promise.all([
    db.from('invoices').select('provider_id, serie, folio, status').eq('id', id).eq('tenant_id', tenantId).maybeSingle(),
    db.from('tenant_billing_credentials').select('api_key').eq('tenant_id', tenantId).maybeSingle(),
  ]);
  if (!factura?.provider_id || factura.status !== 'stamped' || !cred?.api_key) {
    return new Response('Esa factura no tiene PDF todavía.', { status: 404 });
  }

  const r = await downloadInvoiceFile(cred.api_key, factura.provider_id, 'pdf');
  if (!r.ok) return new Response('No se pudo bajar el PDF. Inténtalo en un momento.', { status: 502 });

  const nombre = `factura-${factura.serie ?? ''}${factura.folio ?? id.slice(0, 8)}.pdf`;
  return new Response(r.data, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
