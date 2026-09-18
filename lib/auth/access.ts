import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// WHO IS ASKING — the missing half of every Server Action in the panels.
//
// Server Actions are real POST endpoints: anyone with a session (a
// business owner, a rep, a stranger who signed up) can invoke one by id,
// with whatever arguments they like. Until this file existed, every
// action under /admin ran on the service_role client with no check at
// all, so `setTenantStatus(anyTenantId, 'cancelled')` or
// `createTenantOwner(anyTenantId, ...)` was reachable by any logged-in
// user. Adding reps (who legitimately manage SOME tenants) made that
// gap impossible to leave alone.
//
// Both tables involved (platform_admins, resellers) are service_role
// only by design (db/006, db/016), so membership is always resolved
// here, never from a request-scoped client.

export type Actor =
  | { kind: 'admin'; userId: string; email: string }
  | { kind: 'reseller'; userId: string; email: string; resellerId: string; name: string };

export class AccessError extends Error {
  constructor(message = 'No tienes permiso para hacer esto.') {
    super(message);
    this.name = 'AccessError';
  }
}

async function currentUserId(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? '' } : null;
}

export async function getActor(): Promise<Actor | null> {
  const user = await currentUserId();
  if (!user) return null;

  const admin = createAdminClient();

  const { data: platformAdmin } = await admin
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (platformAdmin) {
    return { kind: 'admin', userId: user.id, email: user.email };
  }

  // Missing table (db/016 not applied yet) resolves to "not a rep"
  // rather than throwing — the admin panel must keep working on an
  // environment that hasn't run the migration.
  const { data: reseller } = await admin
    .from('resellers')
    .select('id, name, active')
    .eq('user_id', user.id)
    .maybeSingle();
  if (reseller && reseller.active) {
    return {
      kind: 'reseller',
      userId: user.id,
      email: user.email,
      resellerId: reseller.id as string,
      name: reseller.name as string,
    };
  }

  return null;
}

export async function requireAdmin(): Promise<Extract<Actor, { kind: 'admin' }>> {
  const actor = await getActor();
  if (actor?.kind !== 'admin') throw new AccessError();
  return actor;
}

export async function requireReseller(): Promise<Extract<Actor, { kind: 'reseller' }>> {
  const actor = await getActor();
  if (actor?.kind !== 'reseller') throw new AccessError();
  return actor;
}

// Who may write to a given business: the internal team, or the rep that
// business belongs to — never a rep reaching into someone else's tenant.
export async function requireTenantManager(tenantId: string): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new AccessError();
  if (actor.kind === 'admin') return actor;

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('reseller_id')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenant || tenant.reseller_id !== actor.resellerId) {
    throw new AccessError('Este negocio no es tuyo.');
  }
  return actor;
}
