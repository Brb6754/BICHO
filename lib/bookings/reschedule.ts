import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingConfirmation } from '@/lib/email/sendBookingConfirmation';
import { tenantManageBookingUrl } from '@/lib/urls';

// Moving an appointment, shared by the two places that can do it: the
// customer from their own link, and the staff from the dashboard.
//
// It lives here instead of in either route because the rules are the
// same for both and they are the kind that go quietly wrong when
// duplicated — the zero-rows check below already shipped as a bug once,
// where a cancelled appointment "moved" successfully and its customer
// got an email about a change that never happened.
export async function rescheduleBooking({
  bookingId,
  slug,
  newStartsAt,
  newEndsAt,
}: {
  bookingId: string;
  slug: string;
  newStartsAt: string;
  newEndsAt: string;
}): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, accent_color, timezone')
    .eq('slug', slug)
    .single();
  if (!tenant) return { error: 'Negocio no encontrado.' };

  if (!(new Date(newStartsAt).getTime() > Date.now())) {
    return { error: 'Elige un horario que todavía no haya pasado.' };
  }

  const { data: updated, error } = await admin
    .from('bookings')
    .update({ starts_at: newStartsAt, ends_at: newEndsAt })
    .eq('id', bookingId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'confirmed')
    .gt('starts_at', new Date().toISOString())
    .select('id');

  if (!error && (!updated || updated.length === 0)) {
    // An update whose filters match nothing is not an error to PostgREST.
    return { error: 'Esta cita ya no se puede cambiar.' };
  }

  if (error) {
    // 23P01 = exclusion_violation — the same anti-double-booking
    // constraint that protects every other write path.
    if (error.code === '23P01') {
      return { error: 'Ese horario ya no está disponible, elige otro.' };
    }
    return { error: 'No se pudo cambiar la cita.' };
  }

  // Best effort: the move already succeeded, and the mailer swallows its
  // own failures. The customer is told either way.
  const { data: booking } = await admin
    .from('bookings')
    .select('customer_id, service_type_id, customers(name, email)')
    .eq('id', bookingId)
    .single();
  const customer = booking?.customers as unknown as { name: string; email: string | null } | null;
  if (customer?.email) {
    const { data: service } = await admin
      .from('service_types')
      .select('name')
      .eq('id', booking!.service_type_id)
      .single();
    await sendBookingConfirmation({
      customerEmail: customer.email,
      customerName: customer.name,
      businessName: tenant.name,
      serviceName: service?.name ?? '',
      startsAt: newStartsAt,
      manageUrl: tenantManageBookingUrl(slug, bookingId),
      accentColor: tenant.accent_color ?? undefined,
      kind: 'rescheduled',
      timezone: tenant.timezone,
    });
  }

  return { error: null };
}
