import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { PLATFORM_ACCENT, PLATFORM_PRIMARY } from '@/lib/branding/colors';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { BrandForm } from './BrandForm';
import { updateOwnBrand } from './actions';

// Logo y colores, editables por el dueño. El resto de la marca (fuentes,
// tema, imágenes de portada) sigue en el admin.
export default async function MarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, role } = await requireTenantStaff(slug);
  if (role !== 'owner') redirect('/dashboard');

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, logo_url, primary_color, accent_color')
    .eq('id', tenantId)
    .single();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Mi marca" description="Tu logo y tus colores salen en tu página de reservas y en este panel." />
      <BrandForm
        name={tenant?.name ?? ''}
        initialLogo={tenant?.logo_url ?? null}
        initialPrimary={tenant?.primary_color ?? PLATFORM_PRIMARY}
        initialAccent={tenant?.accent_color ?? PLATFORM_ACCENT}
        onSave={updateOwnBrand.bind(null, slug)}
      />
    </div>
  );
}
