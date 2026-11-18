import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { DemoNote } from '@/components/demo/DemoNote';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { Conversaciones, type ConversacionVista } from '@/app/t/[slug]/dashboard/whatsapp/Conversaciones';
import { CotizacionesWhatsapp, type CotizacionWA } from '@/app/t/[slug]/dashboard/whatsapp/CotizacionesWhatsapp';
import { Intro, Pestanas, vistaDe } from '@/app/t/[slug]/dashboard/whatsapp/Secciones';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';

export const dynamic = 'force-dynamic';

// La recepcionista de WhatsApp en la demo pública: el MISMO componente
// del panel real, con pláticas inventadas (teléfonos 618 000 …) y sin
// acciones. Los servicios salen del catálogo real del negocio demo.
export default async function WhatsappDemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { slug } = await params;
  const vista = vistaDe((await searchParams).vista);
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
        { role: 'user', content: 'Hola, ¿tienen lugar mañana?' },
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

  // Cotizaciones de ejemplo: nombres, teléfonos (618 000 …), montos y RFC inventados (EKU9003173C9 es el RFC de pruebas del SAT).
  const base = { seguimiento_enviado_at: null, factura_estado: null, receptor_rfc: null, receptor_razon_social: null, receptor_regimen: null, receptor_codigo_postal: null, receptor_uso_cfdi: null };
  const cotizaciones: CotizacionWA[] = [
    { ...base, id: 'demo-q1', folio: 41, customer_name: 'Ejemplo: Laura Méndez', whatsapp_telefono: '526180002203', status: 'sent', created_at: hace(60 * 5), total_cents: 348000 },
    { ...base, id: 'demo-q2', folio: 38, customer_name: 'Ejemplo: Taller Ríos', whatsapp_telefono: '526180002204', status: 'sent', seguimiento_enviado_at: hace(60 * 20), created_at: hace(60 * 72), total_cents: 1276000 },
    {
      ...base,
      id: 'demo-q3',
      folio: 35,
      customer_name: 'Ejemplo: Empresa Demo',
      whatsapp_telefono: '526180002205',
      status: 'accepted',
      factura_estado: 'por_aprobar',
      created_at: hace(60 * 30),
      total_cents: 580000,
      receptor_rfc: 'EKU9003173C9',
      receptor_razon_social: 'ESCUELA KEMPER URGATE',
      receptor_regimen: '601',
      receptor_codigo_postal: '42501',
      receptor_uso_cfdi: 'G03',
    },
    { ...base, id: 'demo-q4', folio: 31, customer_name: 'Ejemplo: Carlos Ibarra', whatsapp_telefono: '526180002206', status: 'accepted', factura_estado: 'timbrada', created_at: hace(60 * 96), total_cents: 232000 },
  ];

  return (
    <div>
      <PageHeader title="WhatsApp" description="Que tus clientas agenden y pidan precio por WhatsApp aunque tú estés ocupada." />
      <Pestanas
        actual={vista}
        estados={{ recepcionista: { texto: 'Prendida', prendido: true }, cotiza: { texto: 'Prendido', prendido: true } }}
      />
      <Intro vista={vista} />
      {vista === 'recepcionista' ? (
        <section className="mt-10">
          <SectionHeading title="Conversaciones" />
          <Conversaciones conversaciones={ejemplo} timezone={tenant.timezone} />
          <DemoNote>Conversaciones de ejemplo: los teléfonos y mensajes son inventados y los botones no envían nada.</DemoNote>
        </section>
      ) : (
        <section className="mt-10">
          <SectionHeading title="Cotizaciones por WhatsApp" />
          <CotizacionesWhatsapp cotizaciones={cotizaciones} timezone={tenant.timezone} />
          <DemoNote>Cotizaciones de ejemplo: clientes, montos y datos para la factura inventados. No se hace ninguna factura.</DemoNote>
        </section>
      )}
    </div>
  );
}
