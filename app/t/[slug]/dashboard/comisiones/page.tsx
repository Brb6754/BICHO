import { redirect } from 'next/navigation';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { dayKey } from '@/lib/dates/tenantTime';
import { PERIODOS, periodoDe, type PeriodoComision } from '@/lib/comisiones/calculo';
import { cargarComisiones } from '@/lib/comisiones/datos';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ComisionesBoard } from '@/components/tenant-dash/ComisionesBoard';

export const dynamic = 'force-dynamic';

// COMISIONES (db/050) — cuánto vendió cada quien y cuánto le toca.
export default async function ComisionesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.comisiones) redirect('/dashboard');

  const periodo: PeriodoComision = PERIODOS.includes(sp.periodo as PeriodoComision)
    ? (sp.periodo as PeriodoComision)
    : 'quincena';
  const rango = periodoDe(periodo, dayKey(new Date(), timezone), sp.desde, sp.hasta);
  const datos = await cargarComisiones(tenantId, timezone, rango);

  return (
    <div>
      <PageHeader title="Comisiones" description="Cuánto vendió cada quien y cuánto le toca." />
      {'faltaMigracion' in datos ? (
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/050_comisiones.sql</code> en el SQL Editor
            de Supabase y recarga esta página.
          </p>
        </div>
      ) : (
        <ComisionesBoard
          slug={slug}
          basePath="/dashboard/comisiones"
          periodo={periodo}
          rango={rango}
          hoy={datos.hoy}
          filas={datos.filas}
          pagos={datos.pagos}
          cajaActiva={productos.caja}
        />
      )}
    </div>
  );
}
