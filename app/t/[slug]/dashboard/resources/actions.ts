'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// No redirect() here, so none of these hit the Server-Action-redirect-
// bypasses-middleware issue documented in CLAUDE.md — these only mutate
// + revalidate. RLS (private.is_member_of_tenant) is the real
// enforcement layer for tenant isolation, but every mutation below also
// filters by tenant_id explicitly — defense in depth, so a bug in a
// future RLS policy change isn't the only thing standing between a
// stray form submission and another tenant's row.

export async function createResource(slug: string, formData: FormData) {
  const name = formData.get('name') as string;
  const supabase = await createClient();

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase.from('resources').insert({ tenant_id: tenant.id, name });
  // Throwing (rather than swallowing) surfaces to the nearest error.tsx —
  // silently doing nothing here is exactly the bug class this whole pass
  // is fixing: the business owner clicks "Agregar" and sees no error, no
  // new row, no explanation.
  if (error) throw new Error(`No se pudo crear el recurso: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/resources`);
}

export async function toggleResourceActive(resourceId: string, active: boolean, slug: string) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase
    .from('resources')
    .update({ active })
    .eq('id', resourceId)
    .eq('tenant_id', tenant.id);
  if (error) throw new Error(`No se pudo actualizar el recurso: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/resources`);
}

export async function deleteResource(resourceId: string, slug: string) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', resourceId)
    .eq('tenant_id', tenant.id);
  if (error) throw new Error(`No se pudo borrar el recurso: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/resources`);
}

// Qué servicios da este recurso (db/032).
//
// Reemplaza el conjunto completo en vez de ir sumando y restando: la
// pantalla manda las casillas que quedaron marcadas, que es el estado
// final, y pensar en diferencias abre la puerta a quedarse a medias si
// una de las dos escrituras falla.
//
// Marcar TODOS los servicios se guarda como NINGUNA fila, no como todas:
// "hace de todo" es la ausencia de restricción, y así un servicio nuevo
// que el negocio cree mañana lo hereda solo, sin tener que volver aquí
// a marcarlo recurso por recurso.
export async function setResourceServices(slug: string, resourceId: string, serviceIds: string[]) {
  const supabase = await createClient();

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  // El recurso tiene que ser de ESTE negocio. RLS ya lo impediría, pero
  // una Server Action es un endpoint POST real: se comprueba aquí.
  const { data: recurso } = await supabase
    .from('resources')
    .select('id')
    .eq('id', resourceId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();
  if (!recurso) throw new Error('Ese recurso no es de este negocio.');

  const { data: servicios } = await supabase
    .from('service_types')
    .select('id')
    .eq('tenant_id', tenant.id);

  const validos = new Set((servicios ?? []).map((s) => s.id));
  const elegidos = serviceIds.filter((id) => validos.has(id));
  const todos = elegidos.length === validos.size;

  const { error: eBorrar } = await supabase
    .from('resource_services')
    .delete()
    .eq('resource_id', resourceId)
    .eq('tenant_id', tenant.id);
  if (eBorrar) throw new Error(`No se pudo guardar: ${eBorrar.message}`);

  if (elegidos.length > 0 && !todos) {
    const { error } = await supabase.from('resource_services').insert(
      elegidos.map((service_type_id) => ({
        resource_id: resourceId,
        service_type_id,
        tenant_id: tenant.id,
      }))
    );
    if (error) throw new Error(`No se pudo guardar: ${error.message}`);
  }

  revalidatePath(`/t/${slug}/dashboard/resources`);
  revalidatePath(`/t/${slug}/reservar`);
}
