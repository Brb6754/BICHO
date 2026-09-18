'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { rescheduleBooking } from '@/lib/bookings/reschedule';

export async function cancelBooking(bookingId: string, slug: string) {
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('tenant_id', tenant.id);
  if (error) throw new Error(`No se pudo cancelar la cita: ${error.message}`);

  revalidatePath(`/t/${slug}/dashboard/calendar`);
}

// Booking for someone who called, walked in, or is standing at the
// counter. Without this the owner keeps a parallel notebook, the system
// only ever sees half the day, and the next online visitor books straight
// over a real appointment — which defeats the one guarantee the product
// makes.
export async function createStaffBooking({
  slug,
  resourceId,
  serviceTypeId,
  startsAt,
  endsAt,
  customerName,
  customerPhone,
  notes,
}: {
  slug: string;
  resourceId: string;
  serviceTypeId: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
}): Promise<{ ok: true; bookingId: string } | { ok: false; error: string }> {
  let tenantId: string;
  try {
    ({ tenantId } = await requireTenantStaff(slug));
  } catch {
    return { ok: false, error: 'No tienes acceso a este negocio.' };
  }

  const name = customerName.trim().slice(0, 120);
  const phone = customerPhone.trim().slice(0, 30);
  if (!name) return { ok: false, error: 'Escribe el nombre del cliente.' };
  if (!phone) return { ok: false, error: 'Escribe un teléfono de contacto.' };

  const admin = createAdminClient();

  // The resource and the service both have to belong to THIS tenant.
  // create_booking takes the tenant id as a parameter and trusts it, so
  // without this check a staff member of one business could write a
  // booking onto another's chair by passing its id.
  const [{ data: resource }, { data: service }] = await Promise.all([
    admin.from('resources').select('id').eq('id', resourceId).eq('tenant_id', tenantId).maybeSingle(),
    admin
      .from('service_types')
      .select('id')
      .eq('id', serviceTypeId)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ]);
  if (!resource || !service) {
    return { ok: false, error: 'Ese servicio o recurso ya no existe.' };
  }

  const { data, error } = await admin.rpc('create_booking', {
    p_tenant_id: tenantId,
    p_resource_id: resourceId,
    p_service_type_id: serviceTypeId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_customer_name: name,
    p_customer_phone: phone,
    p_customer_email: null,
    p_notes: notes?.trim().slice(0, 2000) || null,
  });

  if (error) {
    // Same exclusion constraint that protects the public flow: someone
    // booked that slot online while this form was open.
    if (error.code === '23P01') {
      return { ok: false, error: 'Ese horario acaba de ocuparse. Elige otro.' };
    }
    console.error('createStaffBooking failed', error);
    return { ok: false, error: 'No se pudo agendar la cita.' };
  }

  revalidatePath(`/t/${slug}/dashboard/calendar`);
  revalidatePath(`/t/${slug}/dashboard`);
  return { ok: true, bookingId: data as string };
}

// "¿Me lo pasas a las 5?" over the phone. The customer could already do
// this from their own link; the owner couldn't, which is backwards.
export async function rescheduleBookingFromDashboard(
  bookingId: string,
  slug: string,
  newStartsAt: string,
  newEndsAt: string
): Promise<{ error: string | null }> {
  try {
    await requireTenantStaff(slug);
  } catch {
    return { error: 'No tienes acceso a este negocio.' };
  }

  const result = await rescheduleBooking({ bookingId, slug, newStartsAt, newEndsAt });
  if (!result.error) {
    revalidatePath(`/t/${slug}/dashboard/calendar`);
    revalidatePath(`/t/${slug}/dashboard`);
  }
  return result;
}
