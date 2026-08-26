'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createScheduleSlot(slug: string, formData: FormData) {
  const resourceId = formData.get('resource_id') as string;
  const dayOfWeek = Number(formData.get('day_of_week'));
  const startsAt = formData.get('starts_at') as string;
  const endsAt = formData.get('ends_at') as string;

  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  // The <select> only ever lists this tenant's own resources, but the
  // form still submits a raw resource_id — nothing stops a crafted
  // request from naming a different tenant's resource. RLS's insert
  // policy only checks that the caller belongs to tenant_id (which the
  // app sets correctly), not that resource_id actually belongs to that
  // same tenant, so without this check the row would insert fine with
  // tenant_id=ours but resource_id=someone else's — polluting a
  // different tenant's computed availability. Documented as a known,
  // unresolved gap in db/README.md before this fix.
  const { data: resource } = await supabase
    .from('resources')
    .select('id')
    .eq('id', resourceId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();
  if (!resource) {
    throw new Error('Ese recurso no pertenece a este negocio.');
  }

  const { error } = await supabase.from('resource_schedules').insert({
    tenant_id: tenant.id,
    resource_id: resourceId,
    day_of_week: dayOfWeek,
    starts_at: startsAt,
    ends_at: endsAt,
  });
  if (error) throw new Error(`No se pudo crear el horario: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/schedule`);
}

export async function deleteScheduleSlot(scheduleId: string, slug: string) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase
    .from('resource_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('tenant_id', tenant.id);
  if (error) throw new Error(`No se pudo borrar el horario: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/schedule`);
}
