import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { NewBusinessForm } from '@/components/tenant-setup/NewBusinessForm';
import { isMissingResellersTable } from '@/lib/resellers';

export default async function NewTenantPage({
  searchParams,
}: {
  // Set when arriving from a template's "Crear negocio con esta
  // plantilla" button, so the choice you already made isn't asked
  // again.
  searchParams: Promise<{ vertical?: string }>;
}) {
  const { vertical } = await searchParams;
  const admin = createAdminClient();
  const { data: templates } = await admin.from('templates').select('vertical, name').order('name');
  // Reps are optional here: the list is empty (and the picker hidden)
  // until db/016 runs and somebody registers one.
  const { data: resellers, error: resellersError } = await admin
    .from('resellers')
    .select('id, name')
    .eq('active', true)
    .order('name');

  return (
    <div>
      <Link href="/tenants" className="text-sm text-muted hover:underline">
        ← Tenants
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Nuevo negocio</h1>
      <p className="mt-1 text-muted">
        La plantilla que elijas se copia a la página de este negocio al crearlo — desde ahí es suya y editar
        la plantilla ya no la toca. Recursos, servicios y horarios se configuran después, desde el dashboard
        del negocio.
      </p>

      <div className="mt-6">
        <NewBusinessForm
          verticals={templates ?? []}
          initialVertical={vertical}
          basePath="/tenants"
          resellers={isMissingResellersTable(resellersError) ? [] : (resellers ?? [])}
        />
      </div>
    </div>
  );
}
