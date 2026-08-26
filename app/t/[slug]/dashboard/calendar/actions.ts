'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function cancelBooking(bookingId: string, slug: string) {
  const supabase = createClient();
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
