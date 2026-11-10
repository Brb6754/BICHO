import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { LealtadVista } from '@/components/tenant-dash/LealtadVista';
import { cargarLealtad } from '@/lib/lealtad/datos';
import { waTarjetaHref } from '@/lib/lealtad/tarjeta';
import { tenantLoyaltyCardUrl } from '@/lib/urls';
import { dayKey } from '@/lib/dates/tenantTime';

export const dynamic = 'force-dynamic';

// LEALTAD — la tarjeta de sellos de papel, digital, y promociones.
export default async function LealtadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.lealtad) redirect('/dashboard');

  const [datos, { data: tenant }] = await Promise.all([
    cargarLealtad(tenantId),
    createAdminClient().from('tenants').select('name').eq('id', tenantId).maybeSingle(),
  ]);

  const header = (
    <PageHeader
      title="Lealtad"
      description="La tarjeta de sellos de siempre, pero en el teléfono de tus clientas. Y promociones con fecha de caducidad."
    />
  );

  if (datos.falta) {
    return (
      <div>
        {header}
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/047_lealtad.sql</code> en el SQL
            Editor de Supabase y recarga esta página.
          </p>
        </div>
      </div>
    );
  }

  const negocio = tenant?.name ?? 'tu negocio';
  const tarjetas = datos.tarjetas.map((t) => {
    const url = tenantLoyaltyCardUrl(slug, t.token);
    return { ...t, url, wa: waTarjetaHref(t.telefono, negocio, t.nombre, url) };
  });

  return (
    <div>
      {header}
      <LealtadVista slug={slug} datos={datos} tarjetas={tarjetas} hoy={dayKey(new Date(), timezone)} />
    </div>
  );
}
