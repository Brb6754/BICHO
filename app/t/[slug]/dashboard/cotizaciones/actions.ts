'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { computeTotals } from '@/lib/quotes/totals';
import { cotizacionesConIva } from '@/lib/quotes/preciosIva';
import { sendQuoteEmail } from '@/lib/email/sendQuote';
import { crearCotizacion } from '@/lib/quotes/crear';

// Todo lo que escribe una cotización.
//
// Pasa por `requireTenantStaff` y no solo por RLS: las cotizaciones se
// leen y escriben con service_role (la tabla no tiene policies, porque
// guarda datos de una persona y los precios con los que ese negocio
// vende). Una Server Action es un endpoint POST real, así que la
// membresía se comprueba aquí, antes de tocar nada.

export type QuoteItemPayload = {
  description: string;
  quantity: number;
  unitPriceMxn: number;
  unit?: string;
};

export type NuevaCotizacion = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  discountMxn?: number;
  taxRate?: number;
  /** "Mis precios ya incluyen IVA" (db/059). */
  pricesIncludeTax?: boolean;
  validUntil?: string;
  items: QuoteItemPayload[];
};

export async function createQuote(
  slug: string,
  datos: NuevaCotizacion
): Promise<{ ok: true; quoteId: string; folio: number } | { ok: false; error: string }> {
  try {
    const { tenantId, role } = await requireTenantStaff(slug);

    const nombre = datos.customerName?.trim();
    if (!nombre) return { ok: false, error: 'Falta el nombre del cliente.' };

    const partidas = (datos.items ?? [])
      .map((i) => ({
        description: i.description?.trim() ?? '',
        quantity: Number(i.quantity),
        unitPriceCents: Math.round(Number(i.unitPriceMxn) * 100),
        unit: i.unit?.trim() || null,
      }))
      .filter((i) => i.description.length > 0);

    if (!partidas.length) return { ok: false, error: 'Agrega al menos un concepto.' };
    for (const p of partidas) {
      if (!Number.isFinite(p.quantity) || p.quantity <= 0) {
        return { ok: false, error: `La cantidad de «${p.description}» debe ser mayor a 0.` };
      }
      if (!Number.isFinite(p.unitPriceCents) || p.unitPriceCents < 0) {
        return { ok: false, error: `El precio de «${p.description}» no es válido.` };
      }
    }

    const r = await crearCotizacion(createAdminClient(), tenantId, {
      nombre,
      email: datos.customerEmail,
      telefono: datos.customerPhone,
      notas: datos.notes,
      discountCents: Number(datos.discountMxn ?? 0) * 100,
      taxRate: datos.taxRate,
      pricesIncludeTax: typeof datos.pricesIncludeTax === 'boolean' ? datos.pricesIncludeTax : undefined,
      validUntil: datos.validUntil,
      partidas,
    });
    if (!r.ok) return r;

    // La casilla también es el ajuste del negocio (lo usa el agente de
    // WhatsApp). Solo el dueño lo cambia; con cookies, RLS lo vuelve a exigir.
    // Sin db/059 el update falla y no pasa nada: la cotización ya se guardó.
    if (role === 'owner' && typeof datos.pricesIncludeTax === 'boolean') {
      const supabase = await createClient();
      await supabase.from('tenants').update({ precios_incluyen_iva: datos.pricesIncludeTax }).eq('id', tenantId);
    }

    revalidatePath(`/t/${slug}/dashboard/cotizaciones`);
    return { ok: true, quoteId: r.quoteId, folio: r.folio };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo crear la cotización.' };
  }
}

/** Marca la cotización como enviada y, si hay correo, la manda. */
export async function sendQuote(
  slug: string,
  quoteId: string
): Promise<{ ok: true; emailed: boolean } | { ok: false; error: string }> {
  try {
    const { tenantId } = await requireTenantStaff(slug);
    const db = createAdminClient();

    const { data: quote } = await db
      .from('quotes')
      .select('id, folio, customer_name, customer_email, tax_rate, tax_label, discount_cents, valid_until, status')
      .eq('id', quoteId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!quote) return { ok: false, error: 'Esa cotización no existe.' };

    const [{ data: tenant }, { data: items }, conIva] = await Promise.all([
      db.from('tenants').select('name, primary_color, accent_color').eq('id', tenantId).maybeSingle(),
      db.from('quote_items').select('description, quantity, unit_price_cents').eq('quote_id', quoteId),
      cotizacionesConIva(db, [quoteId]),
    ]);

    const totals = computeTotals(
      (items ?? []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPriceCents: i.unit_price_cents,
      })),
      { discountCents: quote.discount_cents, taxRate: Number(quote.tax_rate), pricesIncludeTax: conIva.has(quoteId) }
    );

    let emailed = false;
    if (quote.customer_email) {
      emailed = await sendQuoteEmail({
        to: quote.customer_email,
        customerName: quote.customer_name,
        businessName: tenant?.name ?? 'Tu proveedor',
        folio: quote.folio,
        totalCents: totals.totalCents,
        validUntil: quote.valid_until,
        accentColor: tenant?.accent_color ?? null,
        slug,
        quoteId,
      });
    }

    // `sent` solo si de verdad salió, o si no había correo a donde
    // mandarla (el vendedor la comparte por WhatsApp con el enlace).
    await db
      .from('quotes')
      .update({ status: quote.status === 'draft' ? 'sent' : quote.status, sent_at: new Date().toISOString() })
      .eq('id', quoteId)
      .eq('tenant_id', tenantId);

    revalidatePath(`/t/${slug}/dashboard/cotizaciones`);
    return { ok: true, emailed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo enviar.' };
  }
}

export async function deleteQuote(slug: string, quoteId: string): Promise<void> {
  const { tenantId } = await requireTenantStaff(slug);
  const db = createAdminClient();
  const { error } = await db.from('quotes').delete().eq('id', quoteId).eq('tenant_id', tenantId);
  if (error) throw new Error(`No se pudo borrar: ${error.message}`);
  revalidatePath(`/t/${slug}/dashboard/cotizaciones`);
}
