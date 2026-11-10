import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { RegresanBoard } from '@/components/tenant-dash/RegresanBoard';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { DEMO_LINK_RESENA, demoCitasRegresan } from '@/lib/demo/regresanFixtures';
import { armarRegresan } from '@/lib/regresan/armar';
import { SEMANAS_POR_OMISION } from '@/lib/regresan/clientas';
import { tenantBookingPageUrl } from '@/lib/urls';

export const dynamic = 'force-dynamic';

// "Clientes que regresan" en la demo pública: la MISMA armarRegresan y el
// MISMO RegresanBoard que el panel real, sobre citas inventadas. Solo
// lectura: los botones no abren WhatsApp (los teléfonos son de ejemplo).
export default async function RegresanDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { tenant, services, citas, now } = datos;
  const ajustes = { semanas: SEMANAS_POR_OMISION, linkResena: DEMO_LINK_RESENA };
  const listas = armarRegresan({
    citas: demoCitasRegresan({ slug, timezone: tenant.timezone, services, agenda: citas }, now),
    negocio: tenant.name,
    linkReservar: tenantBookingPageUrl(slug),
    ajustes,
    canal: 'whatsapp',
    timezone: tenant.timezone,
    now,
  });

  return (
    <div>
      <PageHeader
        title="Clientes que regresan"
        description="A quién escribirle hoy para que vuelva, a quién pedirle una reseña, y los recordatorios que salen solos."
      />
      <RegresanBoard
        negocio={tenant.name}
        semanas={ajustes.semanas}
        canal="whatsapp"
        tieneLinkResena
        demo
        {...listas}
      />
    </div>
  );
}
