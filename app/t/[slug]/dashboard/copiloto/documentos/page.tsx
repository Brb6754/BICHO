import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { DocumentosCopiloto, type DocumentoFila } from '@/components/tenant-dash/DocumentosCopiloto';

export const dynamic = 'force-dynamic';

export default async function DocumentosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId } = await requireTenantStaff(slug);
  if (!(await productosDe(slug)).copiloto) redirect('/dashboard');

  const { data, error } = await createAdminClient()
    .from('copiloto_documentos')
    .select('id, nombre, tipo, fragmentos, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  return (
    <>
      <PageHeader
        eyebrow="Copiloto"
        title="Documentos"
        description="Lo que subas aquí lo puede consultar el copiloto: listas de precios, fichas técnicas, garantías, políticas."
        action={
          <Link href="/dashboard/copiloto" className="text-sm font-medium text-primary hover:underline">
            Volver al chat
          </Link>
        }
      />
      {error ? (
        <p className="mt-8 text-sm text-error">
          {error.code === '42P01' || error.code === 'PGRST205'
            ? 'Falta correr la migración db/041_copiloto_documentos.sql.'
            : 'No se pudieron cargar los documentos.'}
        </p>
      ) : (
        <DocumentosCopiloto documentos={(data ?? []) as DocumentoFila[]} />
      )}
    </>
  );
}
