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
    if (!r.ok) return r;

    revalidatePath(`/t/${slug}/dashboard/facturas`);
    revalidatePath(`/t/${slug}/dashboard/cotizaciones`);
    return { ok: true, invoiceId: r.invoiceId, uuid: r.uuid, total: r.total };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo facturar.' };
  }
}
