import { redirect } from 'next/navigation';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { cargarCaja } from '@/lib/caja/datos';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { CajaBoard } from '@/components/tenant-dash/CajaBoard';

export const dynamic = 'force-dynamic';

// CAJA (db/045) — cuánto vendió, cuánto gastó y cuánto le quedó.
export default async function CajaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  if (!(await productosDe(slug)).caja) redirect('/dashboard');

  const datos = await cargarCaja(tenantId, timezone);

  return (
    <div>
      <PageHeader title="Caja" description="Cuánto vendiste, cuánto gastaste y cuánto te quedó." />
      {'faltaMigracion' in datos ? (
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/045_caja.sql</code> en el SQL Editor de
            Supabase y recarga esta página.
          </p>
        </div>
      ) : (
        <CajaBoard slug={slug} hoy={datos.hoy} movimientos={datos.movimientos} />
      )}
    </div>
  );
}
