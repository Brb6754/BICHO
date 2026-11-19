'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { faltaMigracion } from '@/lib/anticipos/config';
import { leerFormAnticipo, MIGRACION_ANTICIPOS, MIGRACION_INSTRUCCIONES } from '@/lib/anticiposPanel';

// Anticipos (db/061). Antes vivía en la página de WhatsApp; se movió porque
// la página de reservas también cobra anticipo. Prueba membresía y filtra por tenant_id.

const faltaColumna = (code?: string) => code === '42703' || code === 'PGRST204';

/**
 * Guarda la configuración de anticipos del negocio y el monto de cada
 * servicio. Sin db/062 guarda todo menos las instrucciones de pago y lo
 * devuelve en `aviso`.
 */
export async function guardarAnticipos(slug: string, formData: FormData): Promise<{ aviso?: string }> {
  const { tenantId, role } = await requireTenantStaff(slug);
  if (role !== 'owner' && role !== 'admin') throw new Error('Solo el dueño o un administrador puede cambiar esto.');
  const r = leerFormAnticipo(formData);
  if (!r.ok) throw new Error(r.error);
  const v = r.valor;
  const db = createAdminClient();

  const general = {
    anticipo_enabled: v.activado,
    anticipo_mxn: v.montoGeneralMxn,
    anticipo_apartado_min: v.minutosApartado,
    anticipo_reagendar_horas: v.plazoReagendarHoras,
    anticipo_politica: v.politica,
  };
  let aviso: string | undefined;
  let { error } = await db.from('tenants').update({ ...general, anticipo_instrucciones: v.instrucciones }).eq('id', tenantId);
  // Sin db/062 (columna nueva): se reintenta sin las instrucciones para no perder lo demás.
  if (error && faltaColumna(error.code)) {
    ({ error } = await db.from('tenants').update(general).eq('id', tenantId));
    if (!error) aviso = MIGRACION_INSTRUCCIONES;
  }
  if (error) throw new Error(faltaMigracion(error) ? MIGRACION_ANTICIPOS : 'No se pudo guardar. Inténtalo otra vez.');

  // Un update por servicio; el filtro por tenant hace que un id ajeno no toque nada.
  const resultados = await Promise.all(
    v.porServicio.map((s) => db.from('service_types').update({ deposit_mxn: s.depositMxn }).eq('id', s.id).eq('tenant_id', tenantId))
  );
  const fallo = resultados.find((x) => x.error)?.error;
  if (fallo) throw new Error(faltaMigracion(fallo) ? MIGRACION_ANTICIPOS : 'Se guardó lo general, pero no el anticipo de algún servicio. Inténtalo otra vez.');

  revalidatePath(`/t/${slug}/dashboard/anticipos`);
  revalidatePath(`/t/${slug}/dashboard/services`); // muestra el anticipo de cada servicio
  return { aviso };
}
