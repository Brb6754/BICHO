'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { addDaysKey, instantFromLocal } from '@/lib/dates/tenantTime';
import { mergeRanges, mismosRangos, planDia, type Rango } from '@/lib/schedule/merge';

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

  if (days.length === 0) throw new Error('Marca al menos un día, por ejemplo L a V.');
  if (!startsAt || !endsAt) throw new Error('Pon a qué hora abres y a qué hora cierras.');
  // Nadie abre a las 18:00 y cierra a las 9:00. Sin este chequeo la fila
  // entra igual y el día simplemente deja de ofrecer horarios, sin que
  // nada diga por qué.
  if (startsAt >= endsAt) throw new Error('La hora de cierre tiene que ser después de la de apertura, por ejemplo de 9:00 a 18:00.');

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
    if (resourceIds.length === 0) throw new Error('No hay nadie prendido en “Quién atiende”. Prende o agrega a alguien primero.');
  } else {
    const { data: resource } = await supabase
      .from('resources')
      .select('id')
      .eq('id', resourceId)
      .eq('tenant_id', tenant.id)
      .maybeSingle();
    if (!resource) throw new Error('No encontramos a esa persona en tu negocio. Recarga la página.');
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

      await reescribirDia(supabase, tenant.id, rid, d, delDia, unidos);
    }
  }

  revalidatePath(`/t/${slug}/dashboard/schedule`);
}

type Supa = Awaited<ReturnType<typeof createClient>>;
type FilaHorario = Rango & { id: string };

/**
 * Deja las filas de (recurso, día) iguales a `deseados`. Primero inserta
 * lo que falta y luego borra lo que sobra (lib/schedule/merge.ts →
 * planDia): si la segunda llamada falla, el día conserva horario. Se
 * borra por id para no tocar ninguna fila que la consulta no haya visto.
 */
async function reescribirDia(
  supabase: Supa,
  tenantId: string,
  resourceId: string,
  dia: number,
  existentes: FilaHorario[],
  deseados: Rango[],
) {
  const { insertar, borrarIds } = planDia(existentes, deseados);
  if (insertar.length > 0) {
    const { error } = await supabase.from('resource_schedules').insert(
      insertar.map((r) => ({
        tenant_id: tenantId,
        resource_id: resourceId,
        day_of_week: dia,
        starts_at: r.starts_at,
        ends_at: r.ends_at,
      })),
    );
    if (error) {
      console.error('No se pudo crear el horario', error);
      throw new Error('No se pudo guardar el horario. Inténtalo otra vez.');
    }
  }
  if (borrarIds.length > 0) {
    const { error } = await supabase.from('resource_schedules').delete().eq('tenant_id', tenantId).in('id', borrarIds);
    if (error) {
      console.error('No se pudo actualizar el horario', error);
      throw new Error('El horario nuevo quedó guardado, pero no se pudo quitar el anterior. Revisa ese día.');
    }
  }
}

/**
 * Cambiar las horas de UNA franja. Antes la pantalla borraba la franja y
 * luego creaba la nueva; si fallaba la segunda llamada, ese día se quedaba
 * sin horario. Ahora el día completo se recalcula (las otras franjas + la
 * nueva, unidas) y se escribe con reescribirDia: crear primero, borrar después.
 */
export async function updateScheduleSlot(scheduleId: string, slug: string, formData: FormData) {
  const startsAt = (formData.get('starts_at') as string)?.trim();
  const endsAt = (formData.get('ends_at') as string)?.trim();
  if (!startsAt || !endsAt) throw new Error('Pon a qué hora abres y a qué hora cierras.');
  if (startsAt >= endsAt)
    throw new Error('La hora de cierre tiene que ser después de la de apertura, por ejemplo de 9:00 a 18:00.');

  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { data: fila } = await supabase
    .from('resource_schedules')
    .select('id, resource_id, day_of_week')
    .eq('id', scheduleId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();
  if (!fila) throw new Error('Ese horario ya no existe. Recarga la página.');

  const { data: delDia } = await supabase
    .from('resource_schedules')
    .select('id, starts_at, ends_at')
    .eq('tenant_id', tenant.id)
    .eq('resource_id', fila.resource_id)
    .eq('day_of_week', fila.day_of_week);

  const otras = (delDia ?? []).filter((e) => e.id !== scheduleId);
  const deseados = mergeRanges([...otras, { starts_at: startsAt, ends_at: endsAt }]);
  await reescribirDia(supabase, tenant.id, fila.resource_id, fila.day_of_week, delDia ?? [], deseados);

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
  if (error) {
    console.error('No se pudo borrar el horario', error);
    throw new Error('No se pudo quitar ese horario. Inténtalo otra vez.');
  }

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
    throw new Error('Elige el día que no vas a atender.');
  }
  if (endDate < startDate) {
    throw new Error('El último día no puede ser antes del primero.');
  }
  if (!allDay && endTime <= startTime) {
    throw new Error('La hora final tiene que ser después de la inicial, por ejemplo de 14:00 a 16:00.');
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
    if (!resource) throw new Error('No encontramos a esa persona en tu negocio. Recarga la página.');
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
  if (error) {
    console.error('No se pudo guardar el bloqueo', error);
    throw new Error('No se pudo bloquear. Inténtalo otra vez.');
  }

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
  if (error) {
    console.error('No se pudo quitar el bloqueo', error);
    throw new Error('No se pudo quitar el bloqueo. Inténtalo otra vez.');
  }

  revalidatePath(`/t/${slug}/dashboard/schedule`);
}
