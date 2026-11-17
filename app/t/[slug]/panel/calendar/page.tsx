import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { dayKey } from '@/lib/dates/tenantTime';

export const dynamic = 'force-dynamic';

// La agenda, igual que la real: de HOY en adelante. Los días que ya
// pasaron se quedan fuera, como en el panel de verdad; empezar por el
// lunes pasado hacía que la demo abriera con citas viejas.
// En el panel real cada fila trae sus acciones —mover, cancelar, marcar
// si vino— y aquí no: es público y de solo lectura.
export default async function AgendaDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const tz = datos.tenant.timezone;
  const hoy = dayKey(datos.now, tz);
  const citas = datos.citas.filter((c) => dayKey(c.starts_at, tz) >= hoy);
  const activas = citas.filter((c) => c.status === 'confirmed').length;

  return (
    <div>
      <PageHeader
        title="Agenda"
        eyebrow={activas > 0 ? `${activas} ${activas === 1 ? 'cita' : 'citas'} de hoy en adelante` : undefined}
        description="Tus citas día por día. En el panel real cada una se mueve, se cancela o se marca si la clienta vino."
      />

      <div className="mt-8">
        <AgendaList
          bookings={citas}
          timezone={tz}
          now={datos.now}
          emptyTitle="Sin citas próximas"
          emptyHint="Las reservas aparecen aquí en cuanto entran."
        />
      </div>
    </div>
  );
}
