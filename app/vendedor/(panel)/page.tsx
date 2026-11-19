import type { Metadata } from 'next';
import { requireReseller } from '@/lib/auth/access';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Reseller, ResellerTenant } from '@/lib/resellers';
import { ResellerOverview } from '@/components/reseller/ResellerOverview';

export const metadata: Metadata = { title: 'Mis negocios', robots: { index: false, follow: false } };

// Reading the tenant rows happens through service_role, but only ever
// filtered by THIS rep's id — a rep never sees another rep's businesses.
export const dynamic = 'force-dynamic';

export default async function ResellerOverviewPage() {
  const actor = await requireReseller();
  const admin = createAdminClient();

  const [{ data: resellerRow }, { data: tenantRows }] = await Promise.all([
    admin.from('resellers').select('*').eq('id', actor.resellerId).maybeSingle(),
    admin
      .from('tenants')
      .select('id, name, slug, status, vertical, retail_price_mxn, created_at')
      .eq('reseller_id', actor.resellerId)
      .order('created_at', { ascending: false }),
  ]);

  const reseller = resellerRow as Reseller | null;
  const tenants = (tenantRows ?? []) as ResellerTenant[];

  return (
    <ResellerOverview
      name={actor.name}
      zone={reseller?.zone ?? null}
      wholesale={reseller?.wholesale_price_mxn ?? 0}
      billingDay={reseller?.billing_day ?? 1}
      tenants={tenants}
    />
  );
}
