'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeContactPhone } from '@/lib/contacts/resolve';

// Edición de la ficha de un cliente.
//
// Pasa por `requireTenantStaff` y escribe con service_role por el mismo
// motivo que cotizaciones y facturas: una Server Action es un endpoint
// POST real, y `contacts` guarda teléfonos, RFC y notas sobre personas.
// La membresía se comprueba aquí, antes de tocar nada.

export type ContactPatch = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  tags?: string[];
  rfc?: string | null;
  razon_social?: string | null;
  regimen?: string | null;
  codigo_postal?: string | null;
};

export async function updateContact(
  slug: string,
  contactId: string,
  patch: ContactPatch
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { tenantId } = await requireTenantStaff(slug);
    const db = createAdminClient();

    const cambios: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (patch.name !== undefined) {
      const nombre = patch.name.trim();
      if (!nombre) return { ok: false, error: 'El nombre no puede quedar vacío.' };
      cambios.name = nombre;
    }
    // El teléfono se guarda normalizado a dígitos, igual que lo escribe
    // `create_booking`: si aquí se guardara con formato, el contacto
    // dejaría de encontrarse en la siguiente reserva y se duplicaría.
    if (patch.phone !== undefined) cambios.phone = normalizeContactPhone(patch.phone);
    if (patch.email !== undefined) cambios.email = patch.email?.trim() || null;
    if (patch.notes !== undefined) cambios.notes = patch.notes?.trim() || null;
    if (patch.tags !== undefined) {
      // Sin vacías, sin repetidas y con un tope: las etiquetas son para
      // filtrar, y una lista de treinta no filtra nada.
      cambios.tags = [...new Set(patch.tags.map((t) => t.trim()).filter(Boolean))].slice(0, 12);
    }
    if (patch.rfc !== undefined) cambios.rfc = patch.rfc?.trim().toUpperCase() || null;
    if (patch.razon_social !== undefined) cambios.razon_social = patch.razon_social?.trim() || null;
    if (patch.regimen !== undefined) cambios.regimen = patch.regimen?.trim() || null;
    if (patch.codigo_postal !== undefined) {
      cambios.codigo_postal = patch.codigo_postal?.trim() || null;
    }

    const { data, error } = await db
      .from('contacts')
      .update(cambios)
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .select('id');

    if (error) {
      // 23505 = ya hay otro contacto de este negocio con ese teléfono.
      // Es el índice único haciendo su trabajo; el mensaje tiene que
      // decir qué pasó, porque "error 23505" no se puede resolver.
      if (error.code === '23505') {
        return { ok: false, error: 'Ya tienes otro cliente con ese teléfono.' };
      }
      return { ok: false, error: `No se pudo guardar: ${error.message}` };
    }
    // Un update cuyos filtros no matchean no es error para PostgREST —
    // mismo bug silencioso que ya costó un correo de "tu cita se movió"
    // sobre una cita cancelada. Por eso se revisa que haya fila.
    if (!data?.length) return { ok: false, error: 'Ese cliente no es de este negocio.' };

    revalidatePath(`/t/${slug}/dashboard/customers/${contactId}`);
    revalidatePath(`/t/${slug}/dashboard/customers`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
}
