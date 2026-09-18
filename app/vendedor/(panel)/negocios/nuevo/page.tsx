import Link from 'next/link';
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
      <Link href="/" className="text-sm text-muted hover:underline">
        ← Mis negocios
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Dar de alta un negocio</h1>
      <p className="mt-1 max-w-xl text-muted">
        Queda registrado a tu nombre, con el precio que tú le pongas. Después de crearlo puedes dejarle lista
        su página de reservas y crear el acceso del dueño desde la misma pantalla.
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
