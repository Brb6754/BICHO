import Link from 'next/link';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { Bloqueado } from '../../plan/Bloqueado';
import { DocumentosCopiloto, type DocumentoFila } from '@/components/tenant-dash/DocumentosCopiloto';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DocumentosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId } = await requireTenantStaff(slug);
  // Sin Copiloto en el plan, la página del chat ya explica qué ganaría.
  if (!(await productosDe(slug)).copiloto) return <CopilotoBloqueado />;

  const { data, error } = await createAdminClient()
    .from('copiloto_documentos')
    .select('id, nombre, tipo, fragmentos, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  return (
    <>
      <PageHeader
        title="Mis documentos"
        description="Lo que subas aquí lo consulta el copiloto: listas de precios, políticas, garantías."
        actions={
          <Link
            href="/dashboard/copiloto"
            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-sm:flex-1 max-sm:justify-center"
          >
            <ArrowLeft className="h-4 w-4 text-muted" aria-hidden="true" />
            Volver a preguntar
          </Link>
        }
      />
      {error ? (
        <p className="mt-8 rounded-2xl bg-error-soft px-4 py-3 text-sm text-error">
          {/* 42P01/PGRST205 = falta db/041_copiloto_documentos.sql. */}
          {error.code === '42P01' || error.code === 'PGRST205'
            ? 'Esto todavía no está activo en tu cuenta. Escríbenos y lo activamos.'
            : 'No se pudieron cargar tus documentos. Recarga la página en un momento.'}
        </p>
      ) : (
        <DocumentosCopiloto documentos={(data ?? []) as DocumentoFila[]} />
      )}
    </>
  );
}

function CopilotoBloqueado() {
  return (
    <>
      <PageHeader title="Mis documentos" description="Lo que subas aquí lo consulta el copiloto: listas de precios, políticas, garantías." />
      <Bloqueado
        modulo="copiloto"
        plan={null}
        aviso="Los documentos son parte del Copiloto, que viene en el plan Pro."
        ganas={['Subir tus listas de precios, políticas y garantías.', 'Que el copiloto las consulte cuando le preguntes.']}
      />
    </>
  );
}
