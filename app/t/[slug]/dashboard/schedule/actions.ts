'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { addDaysKey, instantFromLocal } from '@/lib/dates/tenantTime';
import { mergeRanges, mismosRangos } from '@/lib/schedule/merge';

// Un horario se captura en bloque, no renglón por renglón.
//
// Antes esta acción creaba UN rango para UN recurso en UN día. Un salón
// con tres estilistas abierto de martes a sábado son quince envíos
// idénticos salvo por el día, y eso es trabajo que la computadora
// debería estar haciendo. Ahora el formulario manda varios días y,
// opcionalmente, todos los recursos a la vez.
//
// Y los rangos del mismo día se UNEN con lo que ya había en vez de
// apilarse: dos rangos encimados no son dos turnos, son uno mal
// capturado, y la disponibilidad se calcula sobre estas filas — así
// que apilarlos ofrece la misma hora dos veces en la página pública.
export async function createScheduleSlot(slug: string, formData: FormData) {
  const resourceId = formData.get('resource_id') as string;
  const days = formData
    .getAll('day_of_week')
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const startsAt = (formData.get('starts_at') as string)?.trim();
  const endsAt = (formData.get('ends_at') as string)?.trim();

  if (days.length === 0) throw new Error('Elige al menos un día.');
  if (!startsAt || !endsAt) throw new Error('Falta la hora de inicio o la de fin.');
  // Nadie abre a las 18:00 y cierra a las 9:00. Sin este chequeo la fila
  // entra igual y el día simplemente deja de ofrecer horarios, sin que
  // nada diga por qué.
  if (startsAt >= endsAt) throw new Error('La hora de fin tiene que ser posterior a la de inicio.');

  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  // A qué recursos aplica. "__todos__" resuelve contra la base, no
  // contra lo que mandó el formulario: así no hay forma de colar un id
  // ajeno en la lista.
  //
  // El formulario solo lista recursos de este negocio, pero manda el id
  // crudo — y la policy de RLS solo comprueba que quien escribe pertenece
  // a tenant_id, no que resource_id sea de ESE tenant. Sin esta
  // verificación la fila entraría con tenant_id nuestro y resource_id
  // ajeno, ensuciando la disponibilidad de otro negocio. Estaba
  // documentado como hueco abierto en db/README.md antes de arreglarse.
  let resourceIds: string[];
  if (resourceId === '__todos__') {
    const { data: todos } = await supabase
      .from('resources')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('active', true);
    resourceIds = (todos ?? []).map((r) => r.id);
    if (resourceIds.length === 0) throw new Error('No hay nadie activo a quien ponerle horario.');
  } else {
    const { data: resource } = await supabase
      .from('resources')
      .select('id')
      .eq('id', resourceId)
      .eq('tenant_id', tenant.id)
      .maybeSingle();
    if (!resource) throw new Error('Ese recurso no pertenece a este negocio.');
    resourceIds = [resource.id];
  }

  const { data: existentes } = await supabase
    .from('resource_schedules')
    .select('id, resource_id, day_of_week, starts_at, ends_at')
    .eq('tenant_id', tenant.id)
    .in('resource_id', resourceIds);

  // Día por día: se une el rango nuevo con lo que ya había y se reescribe
  // SOLO si el resultado cambió. Ver lib/schedule/merge.ts para por qué
  // unir y no reemplazar — en resumen, reemplazar le borraría la mañana
  // a quien parte el día en dos, que es justo lo que esta pantalla
  // recomienda hacer.
  for (const rid of resourceIds) {
    for (const d of days) {
      const delDia = (existentes ?? []).filter((e) => e.resource_id === rid && e.day_of_week === d);
      const unidos = mergeRanges([...delDia, { starts_at: startsAt, ends_at: endsAt }]);

      if (mismosRangos(delDia, unidos)) continue;

      // Se borran por id y no por (recurso, día) para no tocar ninguna
      // fila que esta consulta no haya visto.
      const ids = delDia.map((e) => e.id);
      if (ids.length > 0) {
        const { error } = await supabase
          .from('resource_schedules')
          .delete()
          .eq('tenant_id', tenant.id)
          .in('id', ids);
        if (error) throw new Error(`No se pudo actualizar el horario: ${error.message}`);
      }

      const { error } = await supabase.from('resource_schedules').insert(
        unidos.map((r) => ({
          tenant_id: tenant.id,
          resource_id: rid,
          day_of_week: d,
          starts_at: r.starts_at,
          ends_at: r.ends_at,
        }))
      );
      if (error) throw new Error(`No se pudo crear el horario: ${error.message}`);
    }
  }

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
