import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // platform_admins has zero RLS policies for anon/authenticated on
  // purpose (see db/006) — membership can only be checked via
  // service_role, never via the request-scoped client.
  const admin = createAdminClient();
  const { data: platformAdmin } = await admin
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!platformAdmin) {
    redirect('/login?error=No%20tienes%20acceso%20al%20panel%20interno');
  }

  return <AdminShell email={user.email ?? ''}>{children}</AdminShell>;
}
