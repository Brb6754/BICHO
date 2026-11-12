import { redirect } from 'next/navigation';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { cargarInventario } from '@/lib/inventario/datos';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { InventarioBoard } from '@/components/tenant-dash/InventarioBoard';

export const dynamic = 'force-dynamic';

// INVENTARIO (db/049) — qué productos hay y cuáles se están acabando.
export default async function InventarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.inventario) redirect('/dashboard');

  const datos = await cargarInventario(tenantId, timezone);

  return (
    <div>
      <PageHeader title="Inventario" description="Lo que usas y vendes, y lo que se te está acabando." />
      {'faltaMigracion' in datos ? (
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/049_inventario.sql</code> en el SQL Editor
            de Supabase y recarga esta página.
          </p>
        </div>
      ) : (
        <InventarioBoard
          slug={slug}
          hoy={datos.hoy}
          productos={datos.productos}
          movimientos={datos.movimientos}
          cajaActiva={productos.caja}
        />
      )}
    </div>
  );
}
