import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Who is allowed to act on a business's agenda from its dashboard.
//
// Most dashboard actions lean on RLS: they use the cookie-bound client,
// and Postgres refuses anything that isn't theirs. The ones that CREATE a
// booking can't — create_booking is SECURITY DEFINER and granted only to
// service_role (db/010), because the public flow needs it to write
// customers+bookings atomically as an anonymous visitor. So a staff
// action calling it bypasses RLS entirely and has to prove membership
// itself, first. A Server Action is a reachable POST endpoint; the layout
// gate above it protects the page, not the action.
export class StaffAccessError extends Error {}

export async function requireTenantStaff(slug: string): Promise<{
  tenantId: string;
  timezone: string | null;
  userId: string;
  role: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new StaffAccessError('Inicia sesión para continuar.');
  if (!user.email_confirmed_at) throw new StaffAccessError('Confirma tu correo para continuar.');

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, timezone')
    .eq('slug', slug)
    .single();
  if (!tenant) throw new StaffAccessError('Negocio no encontrado.');

  const { data: membership } = await admin
    .from('business_users')
    .select('role')
    .eq('tenant_id', tenant.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) throw new StaffAccessError('No tienes acceso a este negocio.');

  return { tenantId: tenant.id, timezone: tenant.timezone, userId: user.id, role: membership.role as string };
}
