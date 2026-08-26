'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createService(slug: string, formData: FormData) {
  const name = formData.get('name') as string;
  const durationMinutes = Number(formData.get('duration_minutes'));
  const priceMxn = Number(formData.get('price_mxn'));
  const requiresStaff = formData.get('requires_staff') === 'on';

  // Number(...) on a missing/malformed field silently produces NaN or 0,
  // which would otherwise hit the DB's `check (duration_minutes > 0)`
  // constraint and fail with an opaque Postgres error instead of a clear
  // one — validate here so the message actually says what's wrong.
  if (!name?.trim()) {
    throw new Error('Falta el nombre del servicio.');
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error('La duración debe ser un número mayor a 0.');
  }
  if (!Number.isFinite(priceMxn) || priceMxn < 0) {
    throw new Error('El precio debe ser un número igual o mayor a 0.');
  }

  const supabase = createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase.from('service_types').insert({
    tenant_id: tenant.id,
    name,
    duration_minutes: durationMinutes,
    price_cents: Math.round(priceMxn * 100),
    requires_staff: requiresStaff,
  });
  if (error) throw new Error(`No se pudo crear el servicio: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/services`);
}

export async function toggleServiceActive(serviceId: string, active: boolean, slug: string) {
  const supabase = createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase
    .from('service_types')
    .update({ active })
    .eq('id', serviceId)
    .eq('tenant_id', tenant.id);
  if (error) throw new Error(`No se pudo actualizar el servicio: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/services`);
}

export async function deleteService(serviceId: string, slug: string) {
  const supabase = createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase
    .from('service_types')
    .delete()
    .eq('id', serviceId)
    .eq('tenant_id', tenant.id);
  if (error) throw new Error(`No se pudo borrar el servicio: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/services`);
}
