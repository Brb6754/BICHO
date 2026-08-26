'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

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
    .eq('status', 'confirmed'); // can't "cancel" something already cancelled/completed
  if (error) throw new Error('No se pudo cancelar la cita.');

  revalidatePath(`/t/${slug}/reservar/cita/${bookingId}`);
}

export async function reschedulePublicBooking(
  bookingId: string,
  slug: string,
  newStartsAt: string,
  newEndsAt: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', slug).single();
  if (!tenant) return { error: 'Negocio no encontrado.' };

  const { error } = await admin
    .from('bookings')
    .update({ starts_at: newStartsAt, ends_at: newEndsAt })
    .eq('id', bookingId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'confirmed');

  if (error) {
    // 23P01 = exclusion_violation — same anti-double-booking constraint
    // used everywhere else (db/001_schema.sql) also protects a
    // reschedule landing on a slot someone else already took.
    if (error.code === '23P01') {
      return { error: 'Ese horario ya no está disponible, elige otro.' };
    }
    return { error: 'No se pudo cambiar la cita.' };
  }

  revalidatePath(`/t/${slug}/reservar/cita/${bookingId}`);
  return { error: null };
}
