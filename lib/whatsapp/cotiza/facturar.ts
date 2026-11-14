import type { SupabaseClient } from '@supabase/supabase-js';
import { downloadInvoiceFile } from '@/lib/billing/facturapi';
import { timbrarCotizacion } from '@/lib/billing/timbrar';
import { formatFolio } from '@/lib/quotes/totals';
import { enviarDocumento } from '@/lib/whatsapp/media';

// Timbra la factura de una cotización pedida por WhatsApp y le manda al
// cliente el PDF y el XML. Lo llaman dos lugares, y los dos solo llegan
// aquí DESPUÉS de que el cliente confirmó sus datos:
//   · el agente (confirmar_datos_factura) si el negocio no pide aprobar;
//   · el panel (aprobarFactura) si sí.

export type DepsFactura = {
  timbrar?: typeof timbrarCotizacion;
  descargar?: typeof downloadInvoiceFile;
  enviarDoc?: typeof enviarDocumento;
};

export type QuoteFactura = {
  id: string;
  folio: number;
  whatsapp_telefono: string | null;
  receptor_rfc: string | null;
  receptor_razon_social: string | null;
  receptor_regimen: string | null;
  receptor_codigo_postal: string | null;
  receptor_uso_cfdi: string | null;
};

export const COLUMNAS_QUOTE_FACTURA =
  'id, folio, whatsapp_telefono, factura_estado, factura_datos_at, receptor_rfc, receptor_razon_social, receptor_regimen, receptor_codigo_postal, receptor_uso_cfdi';

export async function timbrarYEnviar(
  db: SupabaseClient,
  opts: {
    tenantId: string;
    timezone: string | null;
    quote: QuoteFactura;
    /** Por qué número se le contesta. null = no se manda nada (fuera de la ventana de 24 h). */
    phoneNumberId: string | null;
  },
  deps: DepsFactura = {}
): Promise<{ ok: true; uuid: string | null; enviado: boolean } | { ok: false; error: string }> {
  const { tenantId, quote } = opts;
  const timbrar = deps.timbrar ?? timbrarCotizacion;
  const descargar = deps.descargar ?? downloadInvoiceFile;
  const enviarDoc = deps.enviarDoc ?? enviarDocumento;

  const r = await timbrar(db, { tenantId, timezone: opts.timezone }, quote.id, {
    receptor: {
      rfc: quote.receptor_rfc ?? '',
      legalName: quote.receptor_razon_social ?? '',
      taxSystem: quote.receptor_regimen ?? '',
      zip: quote.receptor_codigo_postal ?? '',
    },
    usoCfdi: quote.receptor_uso_cfdi ?? undefined,
  });

  const marcar = (estado: 'timbrada' | 'error') =>
    db.from('quotes').update({ factura_estado: estado }).eq('id', quote.id).eq('tenant_id', tenantId);

  if (!r.ok) {
    await marcar('error');
    return r;
  }
  await marcar('timbrada');

  let enviado = false;
  if (opts.phoneNumberId && quote.whatsapp_telefono) {
    const { data: cred } = await db.from('tenant_billing_credentials').select('api_key').eq('tenant_id', tenantId).maybeSingle();
    if (cred?.api_key) {
      const nombre = `factura-${formatFolio(quote.folio)}`;
      const [pdf, xml] = await Promise.all([descargar(cred.api_key, r.providerId, 'pdf'), descargar(cred.api_key, r.providerId, 'xml')]);
      const envios = await Promise.all([
        pdf.ok ? enviarDoc(opts.phoneNumberId, quote.whatsapp_telefono, { bytes: pdf.data, mime: 'application/pdf', filename: `${nombre}.pdf`, caption: 'Tu factura' }) : null,
        // shortcut: WhatsApp no acepta text/xml como documento; va como text/plain con nombre .xml. Si Meta lo rechaza, mandar el XML por correo.
        xml.ok ? enviarDoc(opts.phoneNumberId, quote.whatsapp_telefono, { bytes: xml.data, mime: 'text/plain', filename: `${nombre}.xml` }) : null,
      ]);
      enviado = envios.every((e) => e?.ok === true);
      if (!enviado) console.error('whatsapp factura no enviada', { quote: quote.id });
    }
  }
  return { ok: true, uuid: r.uuid, enviado };
}
