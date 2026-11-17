import { notFound } from 'next/navigation';
import { CajaBoard } from '@/components/tenant-dash/CajaBoard';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { demoCaja } from '@/lib/caja/demo';
import { dayKey } from '@/lib/dates/tenantTime';

export const dynamic = 'force-dynamic';

// Caja del panel de demostración: la MISMA pantalla que ve el dueño,
// con ventas y gastos inventados a partir del catálogo real del negocio
// (lib/caja/demo.ts). Solo lectura.
export default async function CajaDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { timezone } = datos.tenant;
  return (
    <div>
      <CajaBoard
        slug={slug}
        hoy={dayKey(datos.now, timezone)}
        movimientos={demoCaja(slug, datos.services, timezone, datos.now)}
        soloLectura
      />
    </div>
  );
}
