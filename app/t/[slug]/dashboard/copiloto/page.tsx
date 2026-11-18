import Link from 'next/link';
import { FileText } from 'lucide-react';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { CopilotoChat } from '@/components/tenant-dash/CopilotoChat';
import { Bloqueado } from '../plan/Bloqueado';

export const dynamic = 'force-dynamic';

const DESCRIPCION = 'Pregúntale a tu negocio como a una persona. Solo lee, no cambia nada.';

export default async function CopilotoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId } = await requireTenantStaff(slug);

  if (!(await productosDe(slug)).copiloto) {
    const { data: t } = await createAdminClient().from('tenants').select('plan').eq('id', tenantId).maybeSingle();
    return (
      <>
        <PageHeader title="Copiloto" description={DESCRIPCION} />
        <Bloqueado
          modulo="copiloto"
          plan={t?.plan}
          ganas={[
            'Preguntar «¿cuántas citas tuve esta semana?» y tener la respuesta al momento.',
            'Encontrar quién no ha vuelto, qué servicio se vende más o qué cotización vence.',
            'Subir tus listas de precios y políticas para que también las consulte.',
          ]}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Copiloto"
        description={DESCRIPCION}
        help={
          <HelpTip title="¿Qué le puedo preguntar?">
            Lo que esté en tu panel: citas, clientas, servicios, cotizaciones y reuniones, y los documentos que subas (listas
            de precios, políticas). Pregunta como le preguntarías a una persona. Debajo de cada respuesta puedes ver qué
            revisó para contestarte.
          </HelpTip>
        }
        actions={
          <Link
            href="/dashboard/copiloto/documentos"
            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-sm:flex-1 max-sm:justify-center"
          >
            <FileText className="h-4 w-4 text-muted" aria-hidden="true" />
            Mis documentos
          </Link>
        }
      />
      <CopilotoChat />
    </>
  );
}
