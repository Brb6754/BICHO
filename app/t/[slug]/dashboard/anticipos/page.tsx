import { redirect } from 'next/navigation';
import { Hourglass } from 'lucide-react';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { productosDeFila } from '@/lib/products';
import { configDesdeFila, mpConnectHabilitado } from '@/lib/anticipos/config';
import { esServicio } from '@/lib/meetings/kinds';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { Card } from '@/components/ui/Card';
import { AnticiposVista, AyudaAnticipos, type ConexionMp } from '@/components/tenant-dash/AnticiposVista';
import { guardarAnticipos } from './actions';

export const dynamic = 'force-dynamic';

// ANTICIPOS — vivía dentro de WhatsApp (plan Pro), pero la página de
// reservas también aparta con anticipo: lo configura cualquier negocio con citas.
const TITULO = 'Anticipos';
const DESCRIPCION = 'Pide un anticipo para apartar la cita y que no te dejen plantada.';

export default async function AnticiposPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone, role } = await requireTenantStaff(slug);
  const admin = createAdminClient();

  // `*`: sin db/061 (o db/062) las columnas simplemente no vienen.
  const { data: tenant } = await admin.from('tenants').select('*').eq('id', tenantId).single();
  // Sin el producto de citas no hay nada que apartar (mismo criterio que Servicios).
  if (!productosDeFila(tenant).reservas) redirect('/dashboard');

  const encabezado = <PageHeader title={TITULO} description={DESCRIPCION} help={<AyudaAnticipos />} />;

  if (!tenant || !('anticipo_enabled' in tenant)) {
    // Falta db/061_anticipos.sql.
    return (
      <>
        {encabezado}
        <Card className="mt-8 max-w-3xl">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Hourglass className="h-4 w-4 shrink-0" aria-hidden="true" />
            Próximamente: pedir anticipo para apartar la cita
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">Todavía no está activo en tu cuenta. Te lo activamos nosotros.</p>
        </Card>
      </>
    );
  }

  const [{ data: sv }, mp] = await Promise.all([
    admin.from('service_types').select('*').eq('tenant_id', tenantId).eq('active', true).order('name'),
    // Solo columnas no secretas; con service_role porque la tabla no tiene policies (ya probamos membresía arriba).
    mpConnectHabilitado()
      ? admin.from('tenant_mp_connections').select('mp_user_id, live_mode, connected_at').eq('tenant_id', tenantId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const servicios = (sv ?? []).filter(esServicio) as { id: string; name: string; deposit_mxn?: number | null }[];
  const c = mp.data as { mp_user_id: string; live_mode: boolean; connected_at: string } | null;
  const conexionMp: ConexionMp = c ? { mpUserId: c.mp_user_id, liveMode: c.live_mode, connectedAt: c.connected_at } : null;

  return (
    <>
      {encabezado}
      <AnticiposVista
        slug={slug}
        config={configDesdeFila(tenant)}
        servicios={servicios}
        mp={{ habilitado: mpConnectHabilitado(), conexion: conexionMp }}
        timezone={timezone}
        puedeCambiar={role === 'owner' || role === 'admin'}
        guardar={guardarAnticipos.bind(null, slug)}
        sinInstrucciones={!('anticipo_instrucciones' in tenant)}
      />
    </>
  );
}
