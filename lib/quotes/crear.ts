import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveContact } from '@/lib/contacts/resolve';
import { faltaColumna, preciosIncluyenIva } from '@/lib/quotes/preciosIva';

// Inserta una cotización con sus partidas. La comparten el panel
// (dashboard/cotizaciones/actions.ts) y el agente de WhatsApp. Quien
// llama ya validó al usuario/teléfono y las partidas.

export type PartidaNueva = { description: string; quantity: number; unitPriceCents: number; unit: string | null };

export type CotizacionNueva = {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  notas?: string | null;
  discountCents?: number;
  taxRate?: number;
  /** Si se omite, el ajuste del negocio (db/059). */
  pricesIncludeTax?: boolean;
  validUntil?: string | null;
  status?: 'draft' | 'sent';
  partidas: PartidaNueva[];
  /** Columnas extra (db/057: origen, whatsapp_telefono, sent_at). */
  extra?: Record<string, unknown>;
};

export async function crearCotizacion(
  db: SupabaseClient,
  tenantId: string,
  datos: CotizacionNueva
): Promise<{ ok: true; quoteId: string; folio: number } | { ok: false; error: string }> {
  const { data: tenant } = await db.from('tenants').select('tax_rate, tax_label').eq('id', tenantId).maybeSingle();
  const conIva = datos.pricesIncludeTax ?? (await preciosIncluyenIva(db, tenantId));

  // El folio lo entrega Postgres con un candado por negocio, no la
  // app: calcular max(folio)+1 aquí es una condición de carrera que,
  // con dos vendedores cotizando a la vez, choca contra el unique
  // (tenant_id, folio). El fallback existe porque la función puede
  // faltar en un ambiente; el unique sigue siendo la garantía real.
  let folio: number;
  const { data: folioRpc, error: eFolio } = await db.rpc('next_quote_folio', { p_tenant_id: tenantId });
  if (!eFolio && typeof folioRpc === 'number') {
    folio = folioRpc;
  } else {
    const { data: ultima } = await db
      .from('quotes')
      .select('folio')
      .eq('tenant_id', tenantId)
      .order('folio', { ascending: false })
      .limit(1)
      .maybeSingle();
    folio = (ultima?.folio ?? 0) + 1;
  }

  // El contacto se resuelve ANTES del insert para que la cotización
  // nazca ligada. Si falla, se guarda igual sin contacto.
  const contactId = await resolveContact(db, tenantId, { name: datos.nombre, phone: datos.telefono, email: datos.email });

  const insertar = (f: number, conColumnaIva = true) =>
    db
      .from('quotes')
      .insert({
        tenant_id: tenantId,
        folio: f,
        customer_name: datos.nombre,
        customer_email: datos.email?.trim() || null,
        customer_phone: datos.telefono?.trim() || null,
        notes: datos.notas?.trim() || null,
        // La tasa se CONGELA aquí: lo que el cliente recibió es lo que vale.
        tax_rate: datos.taxRate ?? tenant?.tax_rate ?? 16,
        tax_label: tenant?.tax_label ?? 'IVA',
        discount_cents: Math.max(0, Math.round(datos.discountCents ?? 0)),
        valid_until: datos.validUntil || null,
        status: datos.status ?? 'draft',
        contact_id: contactId,
        // También se congela (db/059): las viejas siguen sumando el IVA encima.
        ...(conColumnaIva ? { prices_include_tax: conIva } : {}),
        ...datos.extra,
      })
      .select('id, folio')
      .single();

  let { data: quote, error } = await insertar(folio);
  // Sin db/059 la columna no existe: se guarda sin ella.
  const sinColumnaIva = faltaColumna(error);
  if (sinColumnaIva) ({ data: quote, error } = await insertar(folio, false));
  // 23505 = otro vendedor se quedó con ese folio: una vez más con el siguiente.
  if (error?.code === '23505') ({ data: quote, error } = await insertar(folio + 1, !sinColumnaIva));
  if (error || !quote) {
    return { ok: false, error: `No se pudo crear la cotización: ${error?.message ?? 'intenta de nuevo'}` };
  }

  const { error: eItems } = await db.from('quote_items').insert(
    datos.partidas.map((p, i) => ({
      quote_id: quote.id,
      position: i,
      description: p.description,
      quantity: p.quantity,
      unit: p.unit,
      unit_price_cents: p.unitPriceCents,
    }))
  );
  // Sin partidas la cotización no significa nada: se borra el encabezado.
  if (eItems) {
    await db.from('quotes').delete().eq('id', quote.id);
    return { ok: false, error: `No se pudieron guardar los conceptos: ${eItems.message}` };
  }
  return { ok: true, quoteId: quote.id, folio: quote.folio };
}
