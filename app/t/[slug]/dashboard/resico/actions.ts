'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { productosDe } from '@/lib/products';
import { PASOS_RESICO, type PasoResico } from '@/lib/resico/pasos';

// Marcar / desmarcar un paso del checklist de la Guía RESICO (db/051).
// Mismo patrón que Caja: requireTenantStaff, módulo prendido, y
// service_role con tenant_id en cada filtro.

type Resultado = { ok: true } | { ok: false; error: string };

export async function marcarPasoResico(slug: string, paso: PasoResico, hecho: boolean): Promise<Resultado> {
  try {
    const { tenantId } = await requireTenantStaff(slug);
    if (!(await productosDe(slug)).resico) throw new Error('La Guía RESICO no está activa en este negocio.');
    if (!PASOS_RESICO.some((p) => p.id === paso)) return { ok: false, error: 'Paso inválido.' };

    const db = createAdminClient();
    const { error } = hecho
      ? await db.from('resico_checklist').upsert({ tenant_id: tenantId, paso }, { onConflict: 'tenant_id,paso' })
      : await db.from('resico_checklist').delete().eq('tenant_id', tenantId).eq('paso', paso);
    if (error) throw new Error(`No se pudo guardar: ${error.message}`);

    revalidatePath(`/t/${slug}/dashboard/resico`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
}
