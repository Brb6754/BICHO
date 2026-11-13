'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff, StaffAccessError } from '@/lib/auth/tenantStaff';
import { ESTILOS, type Estilo } from '@/lib/branding/dashEstilo';
import { LOGO_EXT, isHexColor, logoFileError, sniffImageType } from '@/lib/branding/logoUpload';

const BUCKET = 'tenant-logos';

export type BrandResult = { ok: true; logoUrl: string | null } | { ok: false; error: string };

// Marca desde el panel del dueño: logo + color principal y de acento (los
// mismos campos que edita el admin en BrandEditor). Es un endpoint POST
// alcanzable, así que la pertenencia y el rol se comprueban aquí, no solo
// en el layout. El update de `tenants` va con el cliente de cookies:
// RLS (tenants_update_owner, db/002) vuelve a exigir que sea el owner.
export async function updateOwnBrand(slug: string, formData: FormData): Promise<BrandResult> {
  let tenantId: string;
  try {
    const staff = await requireTenantStaff(slug);
    if (staff.role !== 'owner') return { ok: false, error: 'Solo el dueño puede cambiar la marca.' };
    tenantId = staff.tenantId;
  } catch (err) {
    if (err instanceof StaffAccessError) return { ok: false, error: err.message };
    throw err;
  }

  const primary = formData.get('primary_color');
  const accent = formData.get('accent_color');
  if (!isHexColor(primary) || !isHexColor(accent)) return { ok: false, error: 'Elige colores válidos.' };

  const update: Record<string, string> = { primary_color: primary, accent_color: accent };

  const file = formData.get('logo');
  if (file instanceof File && file.size > 0) {
    const sizeErr = logoFileError(file);
    if (sizeErr) return { ok: false, error: sizeErr };
    const bytes = new Uint8Array(await file.arrayBuffer());
    // El tipo real, no el que dice el navegador: un SVG/HTML con la
    // extensión cambiada no entra a un bucket público.
    const type = sniffImageType(bytes);
    if (!type) return { ok: false, error: 'Sube el logo en JPG, PNG o WebP.' };

    // service_role: el bucket no tiene policies de escritura (db/043); la
    // pertenencia ya se comprobó arriba. Nombre nuevo cada vez para que
    // ningún CDN/navegador sirva el logo viejo.
    const storage = createAdminClient().storage.from(BUCKET);
    const path = `${tenantId}/logo-${Date.now()}.${LOGO_EXT[type]}`;
    const { error: upErr } = await storage.upload(path, bytes, { contentType: type, upsert: false });
    if (upErr) {
      console.error('updateOwnBrand: upload', slug, upErr);
      return { ok: false, error: 'No se pudo subir el logo. Intenta de nuevo en un momento.' };
    }
    update.logo_url = storage.getPublicUrl(path).data.publicUrl;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenants')
    .update(update)
    .eq('id', tenantId)
    .select('logo_url')
    .maybeSingle();
  // Sin fila = RLS no lo dejó (no es owner según la base).
  if (error || !data) {
    console.error('updateOwnBrand: update', slug, error);
    return { ok: false, error: 'No se pudo guardar la marca.' };
  }

  revalidatePath(`/t/${slug}/dashboard`, 'layout');
  revalidatePath(`/t/${slug}/reservar`);
  revalidatePath(`/t/${slug}`);
  return { ok: true, logoUrl: (data.logo_url as string | null) ?? null };
}

// Estilo del panel (db/054). Mismo patrón que la marca: pertenencia y rol
// aquí (es un POST alcanzable), update con el cliente de cookies para que
// RLS vuelva a exigir owner, y el valor validado contra la lista.
export async function updateDashboardEstilo(slug: string, estilo: Estilo): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const staff = await requireTenantStaff(slug);
    if (staff.role !== 'owner') return { ok: false, error: 'Solo el dueño puede cambiar el estilo del panel.' };
    if (!ESTILOS.some((e) => e.id === estilo)) return { ok: false, error: 'Ese estilo no existe.' };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tenants')
      .update({ dashboard_estilo: estilo })
      .eq('id', staff.tenantId)
      .select('id')
      .maybeSingle();
    if (error || !data) {
      console.error('updateDashboardEstilo', slug, error);
      // 42703 = columna inexistente: falta correr db/054.
      return { ok: false, error: error?.code === '42703' ? 'Todavía no se puede guardar: falta activar esta opción en tu cuenta.' : 'No se pudo guardar el estilo.' };
    }
  } catch (err) {
    if (err instanceof StaffAccessError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath(`/t/${slug}/dashboard`, 'layout');
  return { ok: true };
}
