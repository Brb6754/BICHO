import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { DemoNote } from '@/components/demo/DemoNote';
import { LealtadVista } from '@/components/tenant-dash/LealtadVista';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { lealtadDemo, TOKEN_DEMO } from '@/lib/lealtad/demo';
import { waTarjetaHref } from '@/lib/lealtad/tarjeta';
import { dayKey } from '@/lib/dates/tenantTime';
import { tenantLoyaltyCardUrl } from '@/lib/urls';

export const dynamic = 'force-dynamic';

// Lealtad en el panel de demostración: la MISMA vista del panel real,
// en solo lectura, con clientas inventadas (lib/lealtad/demo.ts).
export default async function LealtadDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { tenant, now } = datos;
  const lealtad = lealtadDemo(now, tenant.timezone);
  // URL completa, como en el panel real: el link viaja por WhatsApp.
  const url = tenantLoyaltyCardUrl(slug, TOKEN_DEMO);
  const tarjetas = lealtad.tarjetas.map((t) => ({ ...t, url, wa: waTarjetaHref(null, tenant.name, t.nombre, url) }));

  return (
    <div>
      <PageHeader
        title="Lealtad"
        description="La tarjeta de sellos de siempre, ahora en el teléfono de tus clientas."
      />
      <LealtadVista slug={slug} negocio={tenant.name} datos={lealtad} tarjetas={tarjetas} hoy={dayKey(now, tenant.timezone)} soloLectura />
      <DemoNote>Clientas, sellos y promociones de ejemplo. Prueba ponerle un sello: en la demo no se guarda nada.</DemoNote>
    </div>
  );
}
