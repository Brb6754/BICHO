'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff, StaffAccessError } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { limpiarLinkResena, limpiarSemanas } from '@/lib/regresan/mensajes';

// Ajustes del módulo "Clientes que regresan": semanas para "no ha vuelto"
// y el link de reseñas de Google. Es configuración del negocio, así que
// solo dueño o administrador; el equipo ve la pantalla pero no la cambia.
export async function guardarAjustesRegresan(
  slug: string,
  input: { semanas: string; linkResena: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { tenantId, role } = await requireTenantStaff(slug);
    if (role !== 'owner' && role !== 'admin') {
      return { ok: false, error: 'Solo el dueño o un administrador puede cambiar esto.' };
    }

    const semanas = limpiarSemanas(input.semanas);
    if (semanas === null) return { ok: false, error: 'Pon cuántas semanas, de 1 a 52. Por ejemplo, 6.' };
    const link = limpiarLinkResena(input.linkResena);
    if (!link.ok) return { ok: false, error: 'Pega el link completo de Google: empieza con https://' };

    const { data, error } = await createAdminClient()
      .from('tenants')
      .update({ regresan_weeks: semanas, google_review_url: link.url })
      .eq('id', tenantId)
      .select('id');

    if (error) {
      if (error.code === '42703' || error.code === 'PGRST204') {
        // Falta db/046_clientes_regresan.sql.
        return { ok: false, error: 'Esto todavía no está activo en tu cuenta. Escríbenos y lo activamos.' };
      }
      console.error('guardarAjustesRegresan', slug, error);
      return { ok: false, error: 'No se pudo guardar. Inténtalo otra vez en un momento.' };
    }
    if (!data?.length) return { ok: false, error: 'Ese negocio ya no existe.' };

    revalidatePath(`/t/${slug}/dashboard/regresan`);
    return { ok: true };
  } catch (e) {
    if (e instanceof StaffAccessError) return { ok: false, error: e.message };
    throw e;
  }
}

/**
 * "Ya le escribiste" (db/060): cualquiera del equipo puede marcarlo. Si
 * la tabla aún no existe, `faltaTabla` y la pantalla lo guarda en el teléfono.
 */
export async function marcarContactada(
  slug: string,
  clave: string
): Promise<{ ok: true } | { ok: false; faltaTabla?: true; error?: string }> {
  try {
    const { tenantId } = await requireTenantStaff(slug);
    const limpia = String(clave ?? '').slice(0, 200);
    if (!limpia) return { ok: false, error: 'Falta la clienta.' };
    const { error } = await createAdminClient()
      .from('regresan_contactos')
      .upsert({ tenant_id: tenantId, clave: limpia, contactado_at: new Date().toISOString() }, { onConflict: 'tenant_id,clave' });
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return { ok: false, faltaTabla: true };
      console.error('marcarContactada', slug, error);
      return { ok: false, error: 'No se pudo guardar que ya le escribiste.' };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof StaffAccessError) return { ok: false, error: err.message };
    throw err;
  }
}
