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
  const supabase = createClient();

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
  const supabase = createClient();
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
  const supabase = createClient();
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
