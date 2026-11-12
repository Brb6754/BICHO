import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { InventarioBoard } from '@/components/tenant-dash/InventarioBoard';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { demoInventario } from '@/lib/inventario/demo';
import { dayKey } from '@/lib/dates/tenantTime';

export const dynamic = 'force-dynamic';

// Inventario del panel de demostración: la MISMA pantalla que ve la
// dueña, con productos inventados (lib/inventario/demo.ts). Solo lectura.
export default async function InventarioDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const hoy = dayKey(datos.now, datos.tenant.timezone);
  const { productos, movimientos } = demoInventario(slug, hoy);
  return (
    <div>
      <PageHeader title="Inventario" description="Lo que usas y vendes, y lo que se te está acabando." />
      <InventarioBoard slug={slug} hoy={hoy} productos={productos} movimientos={movimientos} soloLectura />
    </div>
  );
}
