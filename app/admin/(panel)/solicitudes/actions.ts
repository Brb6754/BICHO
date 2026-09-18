'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/access';
import { DEMO_STATUSES, type DemoStatus } from './statuses';

// Only the internal team touches leads. A reseller has no business
// reading them: these are people who came to bicho directly, and the
// list holds a phone number and an email for each one.
async function guard() {
  await requireAdmin();
  return createAdminClient();
}

export async function setDemoRequestStatus(id: string, status: DemoStatus) {
  if (!DEMO_STATUSES.includes(status)) {
    throw new Error('Estado inválido.');
  }
  const admin = await guard();
  // `.select('id')` so a filter that matches nothing is caught: an
  // UPDATE matching zero rows is not an error for PostgREST, and this
  // project has already shipped a silent no-op that way once (the
  // public reschedule flow).
  const { data, error } = await admin
    .from('demo_requests')
    .update({ status })
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Esa solicitud ya no existe.');

  // The real file path, not the public URL — revalidatePath works on
  // Next's route tree, and the (panel) group doesn't appear in it.
  revalidatePath('/admin/solicitudes');
}

export async function deleteDemoRequest(id: string) {
  const admin = await guard();
  const { error } = await admin.from('demo_requests').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/solicitudes');
}
