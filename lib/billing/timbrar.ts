import type { SupabaseClient } from '@supabase/supabase-js';
import { buildInvoicePayload, totalEsperadoCents, type ReceptorFiscal } from '@/lib/billing/fromQuote';
import { createInvoice } from '@/lib/billing/facturapi';
import { TOPE_TIMBRES_MES, mensajeTope } from '@/lib/billing/planes';
import { timbresMes } from '@/lib/billing/planServer';
import { cotizacionesConIva } from '@/lib/quotes/preciosIva';

// Timbrar una cotización. Lo comparten el panel (facturas/actions.ts) y
// el agente de WhatsApp; quien llama ya comprobó QUIÉN pide (membresía o
// teléfono dueño de la cotización) y que el negocio tiene facturación.
//
// EL ORDEN DE LOS PASOS ES LO QUE EVITA EL DOBLE CFDI:
//   1. se RESERVA la fila en `invoices` con status 'draft'
//   2. recién entonces se llama a Facturapi
//   3. la fila se actualiza a 'stamped' o a 'error'
// Al revés —timbrar y luego guardar— dos clics simultáneos producen dos
// CFDI reales. Con la reserva primero, el segundo choca contra el índice
// único de db/036 y se detiene ANTES de tocar al PAC. Un error deja la
// fila en 'error', que libera el lugar para reintentar.

export type DatosFactura = {
  receptor: ReceptorFiscal;
  usoCfdi?: string;
  paymentForm?: string;
};

export type ResultadoTimbrado =
  | { ok: true; invoiceId: string; providerId: string; uuid: string | null; total: number }
  | { ok: false; error: string };

export type DepsTimbrado = {
  crear?: typeof createInvoice;
  contarTimbres?: (tenantId: string, timezone: string | null) => Promise<number>;
};

export async function timbrarCotizacion(
  db: SupabaseClient,
  t: { tenantId: string; timezone: string | null },
  quoteId: string,
  datos: DatosFactura,
  deps: DepsTimbrado = {}
): Promise<ResultadoTimbrado> {
  const crear = deps.crear ?? createInvoice;
  const contar = deps.contarTimbres ?? ((id, tz) => timbresMes(id, tz, db));
  const { tenantId } = t;

  // El tope se revisa aquí y no en cada pantalla: el panel y WhatsApp gastan los mismos timbres.
  const tope = mensajeTope(await contar(tenantId, t.timezone), TOPE_TIMBRES_MES, 'timbres');
  if (tope) return { ok: false, error: tope };

  if (!datos.receptor?.rfc?.trim() || !datos.receptor?.legalName?.trim()) {
    return { ok: false, error: 'Faltan el RFC y la razón social de quien recibe la factura.' };
  }
  if (!/^\d{5}$/.test(datos.receptor.zip ?? '')) {
    return { ok: false, error: 'El código postal del receptor debe tener 5 dígitos.' };
  }

  const { data: credenciales } = await db
    .from('tenant_billing_credentials')
    .select('api_key, live')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!credenciales?.api_key) return { ok: false, error: 'Este negocio todavía no está conectado para facturar.' };

  const { data: quote } = await db
    .from('quotes')
    .select('id, folio, customer_name, tax_rate, discount_cents, status, contact_id')
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!quote) return { ok: false, error: 'Esa cotización no existe.' };

  const { data: items } = await db
    .from('quote_items')
    .select('description, quantity, unit_price_cents')
    .eq('quote_id', quoteId)
    .order('position');
  if (!items?.length) return { ok: false, error: 'La cotización no tiene conceptos.' };

  const q = {
    items: items.map((i: { description: string; quantity: number | string; unit_price_cents: number }) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPriceCents: i.unit_price_cents,
    })),
    discountCents: quote.discount_cents,
    taxRate: Number(quote.tax_rate),
    pricesIncludeTax: (await cotizacionesConIva(db, [quoteId])).has(quoteId),
    receptor: datos.receptor,
    usoCfdi: datos.usoCfdi,
    paymentForm: datos.paymentForm,
  };
  const esperado = totalEsperadoCents(q);

  // ── Paso 1: reservar ──────────────────────────────────────────
  const { data: reserva, error: eReserva } = await db
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      quote_id: quoteId,
      receptor_rfc: datos.receptor.rfc.trim().toUpperCase(),
      receptor_nombre: datos.receptor.legalName.trim(),
      contact_id: quote.contact_id ?? null,
      total_cents: esperado,
      status: 'draft',
    })
    .select('id')
    .single();

  if (eReserva || !reserva) {
    // 23505 = el índice único de db/036. Alguien más ya ocupó el lugar.
    if (eReserva?.code === '23505') {
      const { data: previa } = await db
        .from('invoices')
        .select('status, uuid_fiscal')
        .eq('quote_id', quoteId)
        .eq('tenant_id', tenantId)
        .in('status', ['draft', 'stamped'])
        .maybeSingle();
      return {
        ok: false,
        error:
          previa?.status === 'stamped'
            ? `Esta cotización ya está facturada (folio fiscal ${previa.uuid_fiscal}).`
            : 'Ya hay un intento de factura en curso para esta cotización.',
      };
    }
    if (eReserva?.code === '42P01') return { ok: false, error: 'Falta correr db/034_facturapi.sql en Supabase.' };
    return { ok: false, error: `No se pudo preparar la factura: ${eReserva?.message ?? 'intenta de nuevo'}` };
  }

  // ── Paso 2: timbrar ───────────────────────────────────────────
  const res = await crear(credenciales.api_key, buildInvoicePayload(q));
  if (!res.ok) {
    // El mensaje del PAC se guarda tal cual: "el código postal del receptor no coincide" es resoluble.
    await db.from('invoices').update({ status: 'error', error_message: res.message }).eq('id', reserva.id).eq('tenant_id', tenantId);
    return { ok: false, error: res.message };
  }

  // El PAC es la autoridad sobre el monto timbrado; si no coincide, se registra.
  const totalTimbrado = Math.round(Number(res.data.total ?? 0) * 100);

  // ── Paso 3: guardar el resultado ──────────────────────────────
  await db
    .from('invoices')
    .update({
      provider_id: res.data.id,
      uuid_fiscal: res.data.uuid ?? null,
      serie: res.data.series ?? null,
      folio: res.data.folio_number != null ? String(res.data.folio_number) : null,
      total_cents: totalTimbrado,
      status: 'stamped',
      stamped_at: new Date().toISOString(),
      error_message: totalTimbrado !== esperado ? `Total timbrado distinto al cotizado (${esperado})` : null,
    })
    .eq('id', reserva.id)
    .eq('tenant_id', tenantId);

  // Datos fiscales a la ficha del contacto, solo si no tenía RFC (no se
  // pisa lo que una persona curó; un cliente puede facturar a dos razones sociales).
  if (quote.contact_id) {
    const { data: ficha } = await db.from('contacts').select('rfc').eq('id', quote.contact_id).eq('tenant_id', tenantId).maybeSingle();
    if (ficha && !ficha.rfc) {
      await db
        .from('contacts')
        .update({
          rfc: datos.receptor.rfc.trim().toUpperCase(),
          razon_social: datos.receptor.legalName.trim(),
          regimen: datos.receptor.taxSystem,
          codigo_postal: datos.receptor.zip,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quote.contact_id)
        .eq('tenant_id', tenantId);
    }
  }

  return { ok: true, invoiceId: reserva.id, providerId: res.data.id, uuid: res.data.uuid ?? null, total: totalTimbrado };
}
