'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { productosDe } from '@/lib/products';
import { timbrarCotizacion, type DatosFactura } from '@/lib/billing/timbrar';

// Timbrar una cotización desde el panel. La lógica (reserva → PAC →
// resultado, que es lo que evita el doble CFDI, y el tope de timbres) vive
// en lib/billing/timbrar.ts: la comparte el agente de WhatsApp.

export type { DatosFactura };

// Lo que el SAT (vía el PAC) contesta cuando rechaza una factura viene
// con nombres de campo en inglés ("customer.tax_system"). Se traduce a
// qué revisar en la constancia de su cliente; lo demás pasa tal cual.
function enEspanol(error: string): string {
  if (/tax_system|r[ée]gimen/i.test(error)) {
    return 'El SAT no acepta ese tipo de contribuyente para ese RFC. Revisa en su constancia cuál tiene.';
  }
  if (/zip|c[óo]digo postal|domicilio fiscal/i.test(error)) {
    return 'El código postal no coincide con el de su constancia del SAT. Cópialo tal cual viene ahí.';
  }
  if (/legal_name|raz[óo]n social|nombre/i.test(error)) {
    return 'El nombre no coincide con el de su constancia del SAT. Escríbelo igualito, sin «S.A. de C.V.» si ahí no lo trae.';
  }
  if (/tax_id|\brfc\b/i.test(error) && !/^Faltan/.test(error)) {
    return 'El SAT no reconoce ese RFC. Revisa que esté bien escrito, letra por letra.';
  }
  return error.replace(/^Ya timbraste/, 'Ya hiciste');
}

export async function facturarCotizacion(
  slug: string,
  quoteId: string,
  datos: DatosFactura
): Promise<{ ok: true; invoiceId: string; uuid: string | null; total: number } | { ok: false; error: string }> {
  try {
    const { tenantId, timezone } = await requireTenantStaff(slug);

    const productos = await productosDe(slug);
    if (!productos.facturacion) {
      return { ok: false, error: 'Este negocio no tiene contratada la facturación.' };
    }

    const r = await timbrarCotizacion(createAdminClient(), { tenantId, timezone }, quoteId, datos);
    if (!r.ok) return { ok: false, error: enEspanol(r.error) };

    revalidatePath(`/t/${slug}/dashboard/facturas`);
    revalidatePath(`/t/${slug}/dashboard/cotizaciones`);
    return { ok: true, invoiceId: r.invoiceId, uuid: r.uuid, total: r.total };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo facturar.' };
  }
}
