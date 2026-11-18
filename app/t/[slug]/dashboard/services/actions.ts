'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Lo que manda la hoja de agregar o de editar, ya validado. Las dos
// acciones validan igual: editar no puede dejar pasar lo que agregar no.
function leerServicio(formData: FormData) {
  const name = formData.get('name') as string;
  const durationMinutes = Number(formData.get('duration_minutes'));
  const priceMxn = Number(formData.get('price_mxn'));

  // Number(...) on a missing/malformed field silently produces NaN or 0,
  // which would otherwise hit the DB's `check (duration_minutes > 0)`
  // constraint and fail with an opaque Postgres error instead of a clear
  // one — validate here so the message actually says what's wrong.
  if (!name?.trim()) {
    throw new Error('Escribe el nombre del servicio, por ejemplo "Corte de dama".');
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error('Pon cuántos minutos dura, por ejemplo 45.');
  }
  // Un campo vacío llega como '' y Number('') es 0: sin esta revisión,
  // olvidar el precio publicaba el servicio como gratis.
  if (String(formData.get('price_mxn') ?? '').trim() === '') {
    throw new Error('Pon el precio, por ejemplo 250. Si es gratis, pon 0.');
  }
  if (!Number.isFinite(priceMxn) || priceMxn < 0) {
    throw new Error('El precio tiene que ser 0 o más, por ejemplo 250.');
  }
  return {
    name: name.trim(),
    duration_minutes: durationMinutes,
    price_cents: Math.round(priceMxn * 100),
    requires_staff: formData.get('requires_staff') === 'on',
    show_price: formData.get('show_price') === 'on',
  };
}

export async function createService(slug: string, formData: FormData) {
  const campos = leerServicio(formData);

  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const fila = { tenant_id: tenant.id, ...campos };

  let { error } = await supabase.from('service_types').insert(fila);

  // 42703 = la columna no existe: db/031 no se ha corrido en este
  // ambiente. Reintenta sin ella, para que una migración pendiente
  // cueste la casilla nueva y no la posibilidad de crear servicios.
  // Mismo patrón que ya usan page_blocks, reseller_id y resource_label.
  if (error?.code === '42703') {
    const { show_price: _sp, ...sinColumna } = fila;
    ({ error } = await supabase.from('service_types').insert(sinColumna));
  }

  if (error) {
    console.error('createService', error);
    throw new Error('No se pudo agregar el servicio. Revisa tu internet e inténtalo otra vez.');
  }

  revalidatePath(`/t/${slug}/dashboard/services`);
}

// Editar desde la hoja: los mismos campos que al agregar, sobre el mismo
// servicio y siempre filtrando por tenant (no solo por RLS).
export async function updateService(serviceId: string, slug: string, formData: FormData) {
  const campos = leerServicio(formData);
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  let { error } = await supabase.from('service_types').update(campos).eq('id', serviceId).eq('tenant_id', tenant.id);
  // 42703: sin db/031 no existe show_price; mismo respaldo que al agregar.
  if (error?.code === '42703') {
    const { show_price: _sp, ...sinColumna } = campos;
    ({ error } = await supabase.from('service_types').update(sinColumna).eq('id', serviceId).eq('tenant_id', tenant.id));
  }
  if (error) {
    console.error('updateService', error);
    throw new Error('No se pudo guardar el servicio. Revisa tu internet e inténtalo otra vez.');
  }

  revalidatePath(`/t/${slug}/dashboard/services`);
}

export async function toggleServiceActive(serviceId: string, active: boolean, slug: string) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase
    .from('service_types')
    .update({ active })
    .eq('id', serviceId)
    .eq('tenant_id', tenant.id);
  if (error) {
    console.error('toggleServiceActive', error);
    throw new Error('No se pudo cambiar el servicio. Inténtalo otra vez.');
  }

  revalidatePath(`/t/${slug}/dashboard/services`);
}

export async function deleteService(serviceId: string, slug: string) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase
    .from('service_types')
    .delete()
    .eq('id', serviceId)
    .eq('tenant_id', tenant.id);
  if (error) {
    console.error('deleteService', error);
    // 23503: hay citas que apuntan a este servicio y la base no deja borrarlo.
    throw new Error(
      error.code === '23503'
        ? 'Este servicio ya tiene citas, así que no se puede borrar. Apaga el interruptor para ocultarlo de tu página.'
        : 'No se pudo borrar el servicio. Inténtalo otra vez.'
    );
  }

  revalidatePath(`/t/${slug}/dashboard/services`);
}
