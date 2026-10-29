import { redirect } from 'next/navigation';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { CopilotoChat } from '@/components/tenant-dash/CopilotoChat';

export const dynamic = 'force-dynamic';

export default async function CopilotoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireTenantStaff(slug);
  if (!(await productosDe(slug)).copiloto) redirect('/dashboard');

  return (
    <>
      <PageHeader
        eyebrow="Copiloto"
        title="Pregúntale a tu negocio"
        description="Consulta tus cotizaciones, reuniones y clientes en español. Solo lee: no cambia ni envía nada."
      />
      <CopilotoChat />
    </>
  );
}
