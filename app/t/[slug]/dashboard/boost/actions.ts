'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { planPermiteBoost } from '@/lib/boost/reglas';

// Acciones del panel de Boost. Membresía (requireTenantStaff) + dueño o
// administrador; escriben con service_role filtrando por tenant_id.

const faltaColumna = (code?: string) => code === '42703' || code === 'PGRST204';
// Sin db/058_boost.sql corrida.
const FALTA = 'Esto todavía no está activo en tu cuenta. Escríbenos y lo activamos.';

async function gestor(slug: string) {
  const { tenantId, role } = await requireTenantStaff(slug);
  if (role !== 'owner' && role !== 'admin') throw new Error('Solo el dueño o un administrador puede cambiar esto.');
  return tenantId;
}

export async function cambiarBoost(slug: string, tipo: 'vip' | 'flojas', prender: boolean) {
  const tenantId = await gestor(slug);
  const db = createAdminClient();
  if (prender) {
    const { data: t } = await db.from('tenants').select('plan').eq('id', tenantId).single();
    if (!planPermiteBoost(t?.plan)) throw new Error('Este extra se contrata en los planes Negocio y Pro. Revisa «Mi plan».');
  }
  const columna = tipo === 'vip' ? 'boost_vip_enabled' : 'boost_flojas_enabled';
  const { error } = await db.from('tenants').update({ [columna]: prender }).eq('id', tenantId);
  if (error) throw new Error(faltaColumna(error.code) ? FALTA : 'No se pudo guardar. Inténtalo otra vez.');
  revalidatePath(`/t/${slug}/dashboard/boost`);
}

const entero = (v: FormDataEntryValue | null, min: number, max: number): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export async function guardarHorasFlojas(slug: string, formData: FormData) {
  const tenantId = await gestor(slug);
  const descuento = entero(formData.get('descuento'), 5, 50);
  const aviso = entero(formData.get('aviso'), 1, 12);
  const desde = entero(formData.get('desde'), 0, 23);
  const hasta = entero(formData.get('hasta'), 1, 24);
  const dias = [...new Set(formData.getAll('dias').map((d) => entero(d, 0, 6)).filter((d): d is number => d !== null))].sort();
  if (descuento === null || aviso === null || desde === null || hasta === null || desde >= hasta) {
    if (descuento === null) throw new Error('El descuento va de 5 a 50%. Por ejemplo, 15.');
    if (aviso === null) throw new Error('Las horas de aviso van de 1 a 12. Por ejemplo, 4.');
    throw new Error('La hora «Desde» tiene que ser antes que la hora «Hasta».');
  }
  const { error } = await createAdminClient()
    .from('tenants')
    .update({ boost_descuento_max: descuento, boost_aviso_horas: aviso, boost_hora_desde: desde, boost_hora_hasta: hasta, boost_dias: dias })
    .eq('id', tenantId);
  if (error) throw new Error(faltaColumna(error.code) ? FALTA : 'No se pudo guardar. Inténtalo otra vez.');
  revalidatePath(`/t/${slug}/dashboard/boost`);
}
