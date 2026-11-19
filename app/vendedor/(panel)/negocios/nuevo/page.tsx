import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { BACK_LINK } from '@/components/reseller/styles';
import type { Metadata } from 'next';
import { requireReseller } from '@/lib/auth/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { NewBusinessForm } from '@/components/tenant-setup/NewBusinessForm';

export const metadata: Metadata = { title: 'Dar de alta un negocio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function NewBusinessPage() {
  // Not just for the data: this is also the gate. A rep who is switched
  // off can't reach the form at all.
  const actor = await requireReseller();

  const admin = createAdminClient();
  const [{ data: templates }, { data: reseller }] = await Promise.all([
    admin.from('templates').select('vertical, name').order('name'),
    admin.from('resellers').select('default_retail_price_mxn').eq('id', actor.resellerId).maybeSingle(),
  ]);

  return (
    <div>
      <Link href="/" className={BACK_LINK}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Mis negocios
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Dar de alta un negocio</h1>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
        Un minuto: nombre, giro y tu precio. Queda a tu nombre, y después le dejas lista su página y su acceso.
      </p>

      <div className="mt-6">
        {/* No reseller picker here on purpose: createTenant credits the
            rep who is signed in, so a rep can never attribute a business
            to someone else. */}
        <NewBusinessForm
          verticals={templates ?? []}
          basePath="/negocios"
          askRetailPrice
          defaultRetailPrice={(reseller?.default_retail_price_mxn as number | undefined) ?? 0}
        />
      </div>
    </div>
  );
}
