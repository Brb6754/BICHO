import { redirect } from 'next/navigation';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { cargarCaja } from '@/lib/caja/datos';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { CajaBoard } from '@/components/tenant-dash/CajaBoard';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// CAJA (db/045) — cuánto vendió, cuánto gastó y cuánto le quedó.
export default async function CajaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  if (!(await productosDe(slug)).caja) redirect('/dashboard');

  const datos = await cargarCaja(tenantId, timezone);
  const clientas = 'faltaMigracion' in datos ? {} : await nombresPorCobrar(tenantId, datos.hoy, datos.movimientos);

  return (
    <div>
      {'faltaMigracion' in datos ? (
        <>
          <PageHeader title="Caja" description="Cuánto vendiste, cuánto gastaste y cuánto debe haber en el cajón." />
          <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
            <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/045_caja.sql</code> en el SQL Editor de
              Supabase y recarga esta página.
            </p>
          </div>
        </>
      ) : (
        // El encabezado vive dentro de CajaBoard: sus botones abren el formulario.
        <CajaBoard slug={slug} hoy={datos.hoy} movimientos={datos.movimientos} corteBase={datos.corte} clientas={clientas} />
      )}
    </div>
  );
}

// El nombre de quien se va a cobrar: cargarCaja solo trae el servicio.
// service_role tras requireTenantStaff, filtrando por este negocio. Si falla, la lista sale sin nombres.
async function nombresPorCobrar(tenantId: string, hoy: string, movs: { porCobrar?: boolean; dia: string; bookingId: string | null }[]) {
  const ids = movs.filter((m) => m.porCobrar && m.dia === hoy && m.bookingId).map((m) => m.bookingId as string);
  if (!ids.length) return {};
  const { data } = await createAdminClient().from('bookings').select('id, customers(name)').eq('tenant_id', tenantId).in('id', ids);
  return Object.fromEntries(
    ((data ?? []) as unknown as { id: string; customers: { name?: string | null } | null }[])
      .filter((b) => b.customers?.name)
      .map((b) => [b.id, b.customers!.name as string])
  );
}
