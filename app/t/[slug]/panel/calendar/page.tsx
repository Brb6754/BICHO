import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { cargarPanelDemo } from '@/lib/demo/panelData';

export const dynamic = 'force-dynamic';

// La agenda completa: lo que ya pasó y lo que viene, en una sola lista.
// En el panel real cada fila trae sus acciones —mover, cancelar, marcar
// si vino— y aquí no: es público y de solo lectura.
export default async function AgendaDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Todas las citas de la semana. En el panel real, cada una se mueve, se cancela o se marca como atendida desde aquí."
      />

      <div className="mt-8">
        <AgendaList
          bookings={datos.citas}
          timezone={datos.tenant.timezone}
          now={datos.now}
          emptyTitle="Sin citas esta semana"
          emptyHint="Las reservas aparecen aquí en cuanto entran."
        />
      </div>
    </div>
  );
}
