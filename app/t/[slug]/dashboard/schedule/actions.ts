'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { addDaysKey, instantFromLocal } from '@/lib/dates/tenantTime';

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

// ── Bloqueos: exceptions to the weekly schedule ─────────────────────
//
// The weekly schedule says what a normal week looks like. This says when
// that week doesn't apply: a holiday, a vacation, a morning off. Without
// it the booking page kept selling hours the business couldn't honour,
// and the owner only found out when they had to call someone to cancel.

export async function createScheduleBlock(slug: string, formData: FormData) {
  const startDate = String(formData.get('start_date') ?? '');
  const endDate = String(formData.get('end_date') ?? '') || startDate;
  const allDay = formData.get('all_day') === 'on';
  const startTime = String(formData.get('start_time') ?? '09:00');
  const endTime = String(formData.get('end_time') ?? '18:00');
  const resourceId = String(formData.get('resource_id') ?? '');
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 200);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('Elige una fecha válida.');
  }
  if (endDate < startDate) {
    throw new Error('La fecha final no puede ser antes de la inicial.');
  }
  if (!allDay && endTime <= startTime) {
    throw new Error('La hora final tiene que ser después de la inicial.');
  }

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, timezone')
    .eq('slug', slug)
    .single();
  if (!tenant) return;

  // Same check as createScheduleSlot: RLS verifies the caller belongs to
  // tenant_id, not that resource_id does.
  if (resourceId) {
    const { data: resource } = await supabase
      .from('resources')
      .select('id')
      .eq('id', resourceId)
      .eq('tenant_id', tenant.id)
      .maybeSingle();
    if (!resource) throw new Error('Ese recurso no pertenece a este negocio.');
  }

  // The owner types wall-clock time in their own city; the column is
  // timestamptz. instantFromLocal is what keeps a "9am" typed in Durango
  // from being stored as 9am UTC (3am local) on a Vercel server.
  const startsAt = instantFromLocal(startDate, allDay ? '00:00' : startTime, tenant.timezone);
  const endsAt = allDay
    ? // An all-day block runs to midnight of the NEXT day, so the last
      // hour of the last day is covered too.
      instantFromLocal(addDaysKey(endDate, 1), '00:00', tenant.timezone)
    : instantFromLocal(endDate, endTime, tenant.timezone);

  const { error } = await supabase.from('schedule_blocks').insert({
    tenant_id: tenant.id,
    resource_id: resourceId || null,
    starts_at: startsAt,
    ends_at: endsAt,
    reason: reason || null,
  });
  if (error) throw new Error(`No se pudo guardar el bloqueo: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/schedule`);
}

export async function deleteScheduleBlock(blockId: string, slug: string) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('id', blockId)
    .eq('tenant_id', tenant.id);
  if (error) throw new Error(`No se pudo quitar el bloqueo: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/schedule`);
}
