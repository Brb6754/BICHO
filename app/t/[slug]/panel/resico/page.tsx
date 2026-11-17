import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ResicoGuia } from '@/components/tenant-dash/ResicoGuia';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { demoCaja } from '@/lib/caja/demo';
import { rangoDe, resumir } from '@/lib/caja/resumen';
import { dayKey } from '@/lib/dates/tenantTime';

export const dynamic = 'force-dynamic';

// Guía RESICO del panel de demostración: la MISMA pantalla, con dos
// pasos ya marcados y las ventas inventadas de la Caja demo para
// precargar la calculadora. Marcar no guarda nada.
export default async function ResicoDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { timezone } = datos.tenant;
  const hoy = dayKey(datos.now, timezone);
  const movs = demoCaja(slug, datos.services, timezone, datos.now);
  const ventasCajaCents = resumir(movs, rangoDe('mes', hoy).desde, hoy).vendidoCents;

  return (
    <div>
      <PageHeader
        title="Impuestos (RESICO)"
        description="Cuánto pagarías de impuestos y qué trámites te faltan, sin enredos."
      />
      <ResicoGuia slug={slug} hechos={['rfc', 'efirma']} ventasCajaCents={ventasCajaCents} soloLectura />
    </div>
  );
}
