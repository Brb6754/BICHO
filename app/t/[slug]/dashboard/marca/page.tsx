import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { PLATFORM_ACCENT, PLATFORM_PRIMARY } from '@/lib/branding/colors';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { BrandForm } from './BrandForm';
import { updateOwnBrand, updateOwnDirectorio } from './actions';
import { DirectorioForm } from '@/components/tenant-setup/DirectorioForm';
import { direccionDeBloques, estadoDirectorio } from '@/lib/directorio/servidor';
import { isDemoSlug } from '@/lib/domains';

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

  // Directorio (db/055): consultas aparte, sin la migración el form sale deshabilitado.
  const [dir, { data: conBloques }] = await Promise.all([
    estadoDirectorio(supabase, tenantId),
    supabase.from('tenants').select('page_blocks').eq('id', tenantId).maybeSingle(),
  ]);
  const direccionBloque = direccionDeBloques((conBloques as { page_blocks?: unknown } | null)?.page_blocks);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Mi marca" description="Tu logo y tus colores. Mira en vivo cómo queda tu página." />
      <BrandForm
        name={tenant?.name ?? ''}
        initialLogo={tenant?.logo_url ?? null}
        initialPrimary={tenant?.primary_color ?? PLATFORM_PRIMARY}
        initialAccent={tenant?.accent_color ?? PLATFORM_ACCENT}
        onSave={updateOwnBrand.bind(null, slug)}
      />
      {!isDemoSlug(slug) && (
        <DirectorioForm
          slug={slug}
          disponible={dir !== null}
          conPin={dir?.conPin ?? false}
          inicial={{ enDirectorio: dir?.enDirectorio ?? false, ciudad: dir?.ciudad ?? '', direccion: dir?.direccion || direccionBloque }}
          onSave={updateOwnDirectorio.bind(null, slug)}
        />
      )}
    </div>
  );
}
