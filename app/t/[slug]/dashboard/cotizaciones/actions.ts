'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeTotals } from '@/lib/quotes/totals';
import { sendQuoteEmail } from '@/lib/email/sendQuote';

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
  validUntil?: string;
  items: QuoteItemPayload[];
};

export async function createQuote(
  slug: string,
  datos: NuevaCotizacion
): Promise<{ ok: true; quoteId: string; folio: number } | { ok: false; error: string }> {
  try {
    const { tenantId } = await requireTenantStaff(slug);

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

    const db = createAdminClient();
    const { data: tenant } = await db
      .from('tenants')
      .select('tax_rate, tax_label')
      .eq('id', tenantId)
      .maybeSingle();

    // El folio lo entrega Postgres, no la app: calcular max(folio)+1
    // aquí es una condición de carrera que, con dos vendedores
    // cotizando a la vez, choca contra el unique (tenant_id, folio).
    const { data: folio, error: eFolio } = await db.rpc('next_quote_folio', { p_tenant_id: tenantId });
    if (eFolio) {
      return {
        ok: false,
        error: eFolio.message.includes('next_quote_folio')
          ? 'Falta correr la migración db/027_quotes.sql en Supabase.'
          : `No se pudo generar el folio: ${eFolio.message}`,
      };
    }

    const { data: quote, error } = await db
      .from('quotes')
      .insert({
        tenant_id: tenantId,
        folio,
        customer_name: nombre,
        customer_email: datos.customerEmail?.trim() || null,
        customer_phone: datos.customerPhone?.trim() || null,
        notes: datos.notes?.trim() || null,
        // La tasa se CONGELA aquí. Si el negocio cambia su IVA mañana,
        // una cotización ya enviada no puede cambiar sola: lo que el
        // cliente recibió es lo que vale.
        tax_rate: datos.taxRate ?? tenant?.tax_rate ?? 16,
        tax_label: tenant?.tax_label ?? 'IVA',
        discount_cents: Math.max(0, Math.round(Number(datos.discountMxn ?? 0) * 100)),
        valid_until: datos.validUntil || null,
        status: 'draft',
      })
      .select('id, folio')
      .single();

    if (error) return { ok: false, error: `No se pudo crear la cotización: ${error.message}` };

    const { error: eItems } = await db.from('quote_items').insert(
      partidas.map((p, i) => ({
        quote_id: quote.id,
        position: i,
        description: p.description,
        quantity: p.quantity,
        unit: p.unit,
        unit_price_cents: p.unitPriceCents,
      }))
    );
    // Sin partidas la cotización no significa nada, así que si fallan se
    // borra el encabezado en vez de dejar un folio huérfano quemado.
    if (eItems) {
      await db.from('quotes').delete().eq('id', quote.id);
      return { ok: false, error: `No se pudieron guardar los conceptos: ${eItems.message}` };
    }

    revalidatePath(`/t/${slug}/dashboard/cotizaciones`);
    return { ok: true, quoteId: quote.id, folio: quote.folio };
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

    const [{ data: tenant }, { data: items }] = await Promise.all([
      db.from('tenants').select('name, primary_color, accent_color').eq('id', tenantId).maybeSingle(),
      db.from('quote_items').select('description, quantity, unit_price_cents').eq('quote_id', quoteId),
    ]);

    const totals = computeTotals(
      (items ?? []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPriceCents: i.unit_price_cents,
      })),
      { discountCents: quote.discount_cents, taxRate: Number(quote.tax_rate) }
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
