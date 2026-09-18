'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { rescheduleBooking } from '@/lib/bookings/reschedule';

// Both actions here are reachable with NO login — the booking's own
// UUID (unguessable, 128 bits) is the only thing standing in for auth,
// same trust model /api/reservar already uses for creating a booking.
// That's why every mutation is scoped by BOTH bookingId AND the
// tenant resolved from `slug` — a booking id from tenant A can never
// touch tenant B's row even if somehow guessed, and `service_role` is
// required here because anon has zero RLS access to `bookings` at all
// (see db/002_rls_policies.sql) — by design, the public flow only ever
// touches bookings through code that has independently verified the
// tenant/id relationship itself, never through a logged-in session.

export async function cancelPublicBooking(bookingId: string, slug: string) {
  const admin = createAdminClient();
  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return;

  const { error } = await admin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'confirmed') // can't "cancel" something already cancelled/completed
    .gt('starts_at', new Date().toISOString()); // ...or an appointment that already happened
  if (error) throw new Error('No se pudo cancelar la cita.');

  revalidatePath(`/t/${slug}/reservar/cita/${bookingId}`);
}

export async function reschedulePublicBooking(
  bookingId: string,
  slug: string,
  newStartsAt: string,
  newEndsAt: string
): Promise<{ error: string | null }> {
  // The rules (future only, still confirmed, the exclusion constraint,
  // the "moved" email) are identical whether the customer moves their own
  // appointment or the business moves it from the dashboard, so they live
  // in one place — lib/bookings/reschedule.ts — instead of in two copies
  // that drift.
  const result = await rescheduleBooking({ bookingId, slug, newStartsAt, newEndsAt });
  if (!result.error) {
    revalidatePath(`/t/${slug}/reservar/cita/${bookingId}`);
  }
  return result;
}
