import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { DemoNote } from '@/components/demo/DemoNote';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { Conversaciones, type ConversacionVista } from '@/app/t/[slug]/dashboard/whatsapp/Conversaciones';

export const dynamic = 'force-dynamic';

// La recepcionista de WhatsApp en la demo pública: el MISMO componente
// del panel real, con pláticas inventadas (teléfonos 618 000 …) y sin
// acciones. Los servicios salen del catálogo real del negocio demo.
export default async function WhatsappDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { tenant, services, now } = datos;
  const servicio = services[0]?.name ?? 'Corte';
  const hace = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();

  const ejemplo: ConversacionVista[] = [
    {
      id: 'demo-1',
      telefono: '526180002201',
      estado: 'ia',
      last_message_at: hace(12),
      historial: [
        { role: 'user', content: `Hola ${slug}` },
        { role: 'assistant', content: `¡Hola! Soy la recepcionista de ${tenant.name}. ¿Qué te gustaría agendar?` },
        { role: 'user', content: `Un ${servicio.toLowerCase()} mañana en la tarde` },
        { role: 'assistant', content: 'Mañana tengo libre a las 4:00, 5:30 y 6:00. ¿Cuál te acomoda y a nombre de quién?' },
        { role: 'user', content: '5:30, a nombre de Daniela' },
        { role: 'assistant', content: `Listo, Daniela: ${servicio} mañana a las 5:30. Si necesitas cambiarla, aquí está tu link.` },
      ],
    },
    {
      id: 'demo-2',
      telefono: '526180002202',
      estado: 'humano',
      last_message_at: hace(95),
      historial: [
        { role: 'user', content: '¿Hacen precio especial para grupos de 5?' },
        { role: 'assistant', content: 'Eso lo ve directo el negocio. Ya le avisé a alguien para que te escriba por aquí.' },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Recepcionista de WhatsApp"
        description="Contesta a tus clientes por WhatsApp y agenda directo en tu agenda. Si una plática se complica, la tomas tú."
      />
      <div className="mt-6">
        <Conversaciones conversaciones={ejemplo} timezone={tenant.timezone} />
      </div>
      <DemoNote>Conversaciones de ejemplo: los teléfonos y mensajes son inventados y los botones no envían nada.</DemoNote>
    </div>
  );
}
