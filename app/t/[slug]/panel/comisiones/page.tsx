import { notFound } from 'next/navigation';
import { ComisionesBoard } from '@/components/tenant-dash/ComisionesBoard';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { dayKey } from '@/lib/dates/tenantTime';
import { PERIODOS, periodoDe, type PeriodoComision } from '@/lib/comisiones/calculo';
import { demoComisiones } from '@/lib/comisiones/demo';

export const dynamic = 'force-dynamic';

// Comisiones del panel de demostración: la MISMA pantalla que ve la
// dueña, con citas inventadas a partir de su equipo y catálogo reales
// (lib/comisiones/demo.ts), que cuadran con la Caja y la Agenda demo.
// Solo lectura.
export default async function ComisionesDemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const hoy = dayKey(datos.now, datos.tenant.timezone);
  const periodo: PeriodoComision = PERIODOS.includes(sp.periodo as PeriodoComision)
    ? (sp.periodo as PeriodoComision)
    : 'quincena';
  const rango = periodoDe(periodo, hoy, sp.desde, sp.hasta);
  const { filas, pagos, detalle } = demoComisiones(
    slug,
    { ...datos, timezone: datos.tenant.timezone },
    rango,
    hoy
  );

  return (
    <div>
      <ComisionesBoard
        slug={slug}
        basePath="/panel/comisiones"
        periodo={periodo}
        rango={rango}
        hoy={hoy}
        filas={filas}
        pagos={pagos}
        detalle={detalle}
        cajaActiva
        soloLectura
      />
    </div>
  );
}
