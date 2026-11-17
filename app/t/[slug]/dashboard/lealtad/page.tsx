import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { LealtadVista } from '@/components/tenant-dash/LealtadVista';
import { cargarLealtad } from '@/lib/lealtad/datos';
import { waTarjetaHref } from '@/lib/lealtad/tarjeta';
import { tenantLoyaltyCardUrl } from '@/lib/urls';
import { dayKey } from '@/lib/dates/tenantTime';
import { Bloqueado } from '../plan/Bloqueado';

const DESCRIPCION = 'La tarjeta de sellos de siempre, en el teléfono de tus clientas, y promociones con fecha.';

export const dynamic = 'force-dynamic';

// LEALTAD — la tarjeta de sellos de papel, digital, y promociones.
export default async function LealtadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.lealtad) {
    const { data: t } = await createAdminClient().from('tenants').select('plan').eq('id', tenantId).maybeSingle();
    return (
      <div>
        <PageHeader title="Lealtad" description={DESCRIPCION} />
        <Bloqueado
          modulo="lealtad"
          plan={t?.plan}
          ejemplo="/panel/lealtad"
          ganas={[
            'Una tarjeta de sellos en el teléfono de cada clienta, que no se pierde.',
            'Sellos que se suman solos cada vez que viene.',
            'Promociones con fecha que salen en tu página de reservas.',
          ]}
        />
      </div>
    );
  }

  const [datos, { data: tenant }] = await Promise.all([
    cargarLealtad(tenantId),
    createAdminClient().from('tenants').select('name').eq('id', tenantId).maybeSingle(),
  ]);

  const header = <PageHeader title="Lealtad" description={DESCRIPCION} />;

  if (datos.falta) {
    return (
      <div>
        {header}
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          {/* Sin db/047_lealtad.sql corrida. */}
          <p className="text-[15px] font-medium text-ink">Estamos terminando de activar Lealtad en tu cuenta</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Falta un paso de nuestro lado. Escríbenos y te avisamos en cuanto quede lista.
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
