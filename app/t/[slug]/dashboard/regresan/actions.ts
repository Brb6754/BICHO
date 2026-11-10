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
    if (semanas === null) return { ok: false, error: 'Las semanas van de 1 a 52.' };
    const link = limpiarLinkResena(input.linkResena);
    if (!link.ok) return { ok: false, error: 'El link de reseñas debe empezar con https://' };

    const { data, error } = await createAdminClient()
      .from('tenants')
      .update({ regresan_weeks: semanas, google_review_url: link.url })
      .eq('id', tenantId)
      .select('id');

    if (error) {
      if (error.code === '42703' || error.code === 'PGRST204') {
        return { ok: false, error: 'Falta correr db/046_clientes_regresan.sql en Supabase.' };
      }
      return { ok: false, error: `No se pudo guardar: ${error.message}` };
    }
    if (!data?.length) return { ok: false, error: 'Ese negocio ya no existe.' };

    revalidatePath(`/t/${slug}/dashboard/regresan`);
    return { ok: true };
  } catch (e) {
    if (e instanceof StaffAccessError) return { ok: false, error: e.message };
    throw e;
  }
}
