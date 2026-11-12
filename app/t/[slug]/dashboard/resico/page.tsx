import { redirect } from 'next/navigation';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { createAdminClient } from '@/lib/supabase/admin';
import { cargarCaja } from '@/lib/caja/datos';
import { rangoDe, resumir } from '@/lib/caja/resumen';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ResicoGuia } from '@/components/tenant-dash/ResicoGuia';
import type { PasoResico } from '@/lib/resico/pasos';

export const dynamic = 'force-dynamic';

// GUÍA RESICO (db/051) — cómo formalizarse + checklist + ISR estimado.
export default async function ResicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.resico) redirect('/dashboard');

  const { data, error } = await createAdminClient()
    .from('resico_checklist')
    .select('paso')
    .eq('tenant_id', tenantId);

  // Con Caja prendida, se ofrece precargar lo vendido este mes.
  let ventasCajaCents: number | null = null;
  if (productos.caja) {
    const caja = await cargarCaja(tenantId, timezone);
    if (!('faltaMigracion' in caja)) {
      ventasCajaCents = resumir(caja.movimientos, rangoDe('mes', caja.hoy).desde, caja.hoy).vendidoCents;
    }
  }

  return (
    <div>
      <PageHeader title="Guía RESICO" description="¿Cómo me formalizo? Los trámites, lo que te toca y cuánto ISR pagarías." />
      {error ? (
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/051_guia_resico.sql</code> en el SQL Editor de
            Supabase y recarga esta página.
          </p>
        </div>
      ) : (
        <ResicoGuia
          slug={slug}
          hechos={(data ?? []).map((f) => f.paso as PasoResico)}
          facturacion={productos.facturacion}
          ventasCajaCents={ventasCajaCents}
        />
      )}
    </div>
  );
}
