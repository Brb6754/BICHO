import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { SemanaVisual } from '@/components/tenant-dash/fichas/SemanaVisual';
import { BlocksSection } from '@/components/tenant-dash/BlocksSection';
import { dayKey } from '@/lib/dates/tenantTime';

export const dynamic = 'force-dynamic';

// Horario de la demo: el REAL del negocio (el que decide qué horas ofrece
// su página), con la misma semana tocable y los mismos botones de
// bloquear. Todo se puede probar; al guardar solo confirma "Ejemplo: …".
export default async function HorarioDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { resources, schedules, tenant, now } = datos;
  const hoy = dayKey(now, tenant.timezone);

  return (
    <div>
      <PageHeader title="Horario" description="A qué hora te pueden reservar. Toca una barra para cambiarla." />

      <div className="mt-6">
        <SemanaVisual personas={resources} franjas={schedules} timezone={tenant.timezone} hoyKey={hoy} />
      </div>

      <BlocksSection slug={slug} blocks={[]} resources={resources} timezone={tenant.timezone} today={hoy} />
    </div>
  );
}
