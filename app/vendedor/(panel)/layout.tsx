import { redirect } from 'next/navigation';
import { getActor } from '@/lib/auth/access';
import { ResellerShell } from '@/components/reseller/ResellerShell';

// The gate for every rep page. `resellers` has zero RLS policies
// (db/016), so membership resolves through the service_role client
// inside getActor() — never from a request-scoped query.
//
// An inactive rep (active = false in the panel) resolves to "not a
// rep": their login still works, but this panel turns them away, which
// is how the internal team switches someone off without deleting their
// record or the businesses credited to them.
export default async function ResellerPanelLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();

  if (!actor) {
    redirect('/login');
  }
  if (actor.kind !== 'reseller') {
    redirect('/login?error=Esta%20cuenta%20no%20es%20de%20vendedor');
  }

  return (
    <ResellerShell name={actor.name} email={actor.email}>
      {children}
    </ResellerShell>
  );
}
