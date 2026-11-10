import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { LealtadVista } from '@/components/tenant-dash/LealtadVista';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { lealtadDemo, TOKEN_DEMO } from '@/lib/lealtad/demo';
import { waTarjetaHref } from '@/lib/lealtad/tarjeta';
import { dayKey } from '@/lib/dates/tenantTime';

export const dynamic = 'force-dynamic';

// Lealtad en el panel de demostración: la MISMA vista del panel real,
// en solo lectura, con clientas inventadas (lib/lealtad/demo.ts).
export default async function LealtadDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { tenant, now } = datos;
  const lealtad = lealtadDemo(now, tenant.timezone);
  const url = `/t/${slug}/tarjeta/${TOKEN_DEMO}`;
  const tarjetas = lealtad.tarjetas.map((t) => ({ ...t, url, wa: waTarjetaHref(null, tenant.name, t.nombre, url) }));

  return (
    <div>
      <PageHeader
        title="Lealtad"
        description="La tarjeta de sellos de siempre, pero en el teléfono de tus clientas. Y promociones con fecha de caducidad."
      />
      <LealtadVista slug={slug} datos={lealtad} tarjetas={tarjetas} hoy={dayKey(now, tenant.timezone)} soloLectura />
    </div>
  );
}
