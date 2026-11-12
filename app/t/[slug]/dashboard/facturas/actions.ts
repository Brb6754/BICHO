'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { productosDe } from '@/lib/products';
import { buildInvoicePayload, totalEsperadoCents, type ReceptorFiscal } from '@/lib/billing/fromQuote';
import { createInvoice } from '@/lib/billing/facturapi';
import { TOPE_TIMBRES_MES, mensajeTope } from '@/lib/billing/planes';
import { timbresMes } from '@/lib/billing/planServer';

// Timbrar una cotización.
//
// EL ORDEN DE LOS PASOS ES LO QUE EVITA EL DOBLE CFDI, y no es un
// detalle de estilo:
//
//   1. se RESERVA la fila en `invoices` con status 'draft'
//   2. recién entonces se llama a Facturapi
//   3. la fila se actualiza a 'stamped' o a 'error'
//
// Al revés —timbrar y luego guardar— dos clics simultáneos producen dos
// CFDI reales, porque ninguno de los dos ve al otro. Con la reserva
// primero, el segundo choca contra el índice único de db/036 y se
// detiene ANTES de tocar al PAC. Un error deja la fila en 'error', que
// libera el lugar: un fallo de red no puede dejar una venta sin poder
// facturarse nunca.

export type DatosFactura = {
  receptor: ReceptorFiscal;
  usoCfdi?: string;
  paymentForm?: string;
};

type Resultado =
  | { ok: true; invoiceId: string; uuid: string | null; total: number }
  | { ok: false; error: string };

export async function facturarCotizacion(
  slug: string,
  quoteId: string,
  datos: DatosFactura
): Promise<Resultado> {
  try {
    const { tenantId, timezone } = await requireTenantStaff(slug);

    const productos = await productosDe(slug);
    if (!productos.facturacion) {
      return { ok: false, error: 'Este negocio no tiene contratada la facturación.' };
    }

    // Pro incluye 100 timbres al mes.
    const tope = mensajeTope(await timbresMes(tenantId, timezone), TOPE_TIMBRES_MES, 'timbres');
    if (tope) return { ok: false, error: tope };

    if (!datos.receptor?.rfc?.trim() || !datos.receptor?.legalName?.trim()) {
      return { ok: false, error: 'Faltan el RFC y la razón social de quien recibe la factura.' };
    }
    if (!/^\d{5}$/.test(datos.receptor.zip ?? '')) {
      return { ok: false, error: 'El código postal del receptor debe tener 5 dígitos.' };
    }

    const db = createAdminClient();

    const { data: credenciales } = await db
      .from('tenant_billing_credentials')
      .select('api_key, live')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!credenciales?.api_key) {
      return { ok: false, error: 'Este negocio todavía no está conectado para facturar.' };
    }

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
      items: items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPriceCents: i.unit_price_cents,
      })),
      discountCents: quote.discount_cents,
      taxRate: Number(quote.tax_rate),
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
        // Hereda el contacto de la cotización: la factura es de la
        // misma persona, y así la ficha muestra las tres cosas juntas.
        contact_id: quote.contact_id ?? null,
        total_cents: esperado,
        status: 'draft',
      })
      .select('id')
      .single();

    if (eReserva) {
      // 23505 = el índice único de db/036. Alguien más ya ocupó el lugar.
      if (eReserva.code === '23505') {
        const { data: previa } = await db
          .from('invoices')
          .select('status, uuid_fiscal')
          .eq('quote_id', quoteId)
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
      if (eReserva.code === '42P01') {
        return { ok: false, error: 'Falta correr db/034_facturapi.sql en Supabase.' };
      }
      return { ok: false, error: `No se pudo preparar la factura: ${eReserva.message}` };
    }

    // ── Paso 2: timbrar ───────────────────────────────────────────
    const res = await createInvoice(credenciales.api_key, buildInvoicePayload(q));

    if (!res.ok) {
      // La fila pasa a 'error' y con eso libera el lugar para reintentar.
      // El mensaje del PAC se guarda tal cual: "el código postal del
      // receptor no coincide" es resoluble; "error 400" no.
      await db
        .from('invoices')
        .update({ status: 'error', error_message: res.message })
        .eq('id', reserva.id);
      return { ok: false, error: res.message };
    }

    // El PAC es la autoridad sobre el monto timbrado. Si no coincide con
    // lo que el cliente aceptó, se registra y se avisa: callarlo sería
    // dejar pasar una diferencia fiscal.
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
      .eq('id', reserva.id);

    // Los datos fiscales se guardan en la ficha del contacto para que
    // la próxima factura venga prellenada. Es lo que hoy obliga a
    // pedirlos por WhatsApp cada vez.
    //
    // Solo rellena huecos: si el contacto ya tiene un RFC, se respeta.
    // Que una factura sobreescriba el RFC curado de una ficha sería
    // perder trabajo humano, y además puede ser legítimo que un cliente
    // facture a dos razones sociales distintas.
    if (quote.contact_id) {
      const { data: ficha } = await db
        .from('contacts')
        .select('rfc, razon_social, regimen, codigo_postal')
        .eq('id', quote.contact_id)
        .maybeSingle();

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
          .eq('id', quote.contact_id);
      }
    }

    revalidatePath(`/t/${slug}/dashboard/facturas`);
    revalidatePath(`/t/${slug}/dashboard/cotizaciones`);

    return {
      ok: true,
      invoiceId: reserva.id,
      uuid: res.data.uuid ?? null,
      total: totalTimbrado,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo facturar.' };
  }
}
