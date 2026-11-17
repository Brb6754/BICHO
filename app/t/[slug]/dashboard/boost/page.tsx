import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AyudaBoost, BoostVista, type ContactoVista } from '@/components/tenant-dash/BoostVista';
import { ADDON_BOOST, TOPE_BOOST_MENSAJES_MES } from '@/lib/billing/planes';
import { planPermiteBoost, resumirResultados } from '@/lib/boost/reglas';
import { inicioDeMes } from '@/lib/posts/contexto';
import { tenantBookingPageUrl } from '@/lib/urls';
import { cambiarBoost, guardarHorasFlojas } from './actions';
import { Bloqueado } from '../plan/Bloqueado';

export const dynamic = 'force-dynamic';

// El nombre humano de la página es "Llena tus huecos"; Boost queda de apellido (docs/UX-PANEL.md §2.1).
const TITULO = 'Llena tus huecos';
const DESCRIPCION = 'Avisa a tus clientas cuando se libera un horario o te quedan horas vacías.';

export default async function BoostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone, role } = await requireTenantStaff(slug);

  // `*`: sin db/058 corrida, las columnas nuevas simplemente no vienen.
  const { data: tenant } = await createAdminClient().from('tenants').select('*').eq('id', tenantId).single();

  if (!planPermiteBoost(tenant?.plan)) {
    return (
      <>
        <PageHeader title={TITULO} description={DESCRIPCION} help={<AyudaBoost />} />
        <Bloqueado
          modulo="boost"
          plan={tenant?.plan}
          ejemplo="/panel/boost"
          aviso={`Es un extra de $${ADDON_BOOST.precio} al mes para los planes Negocio y Pro.`}
          ganas={[
            'Cuando alguien cancela, avisamos a las clientas que querían ese horario.',
            'Ofrecer con descuento las horas que se quedan vacías, solo a quien aceptó promociones.',
            `${ADDON_BOOST.topeMensajes} mensajes de WhatsApp al mes incluidos.`,
          ]}
        />
      </>
    );
  }

  const migrada = tenant != null && 'boost_vip_enabled' in tenant;
  const desde = inicioDeMes(new Date(), timezone);

  // Lectura con la sesión del usuario: la RLS de db/058 limita a sus negocios; el filtro por tenant elige ESTE.
  const supabase = await createClient();
  const [contactos, servicios, ofertas, mensajes, citas] = migrada
    ? await Promise.all([
        supabase.from('boost_contactos').select('id, nombre, telefono, service_type_id, dias, franjas, consentimiento_promos, baja_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200),
        supabase.from('service_types').select('id, name').eq('tenant_id', tenantId),
        supabase.from('boost_ofertas').select('resource_id, starts_at').eq('tenant_id', tenantId).gte('created_at', desde),
        supabase.from('boost_mensajes').select('tipo, status').eq('tenant_id', tenantId).gte('created_at', desde),
        supabase.from('bookings').select('status, boost_precio_cents').eq('tenant_id', tenantId).not('boost_oferta_id', 'is', null).gte('created_at', desde),
      ])
    : [];

  const nombres = new Map(((servicios?.data ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));
  type Fila = { id: string; nombre: string; telefono: string; service_type_id: string | null; dias: number[] | null; franjas: string[] | null; consentimiento_promos: boolean; baja_at: string | null };
  const lista: ContactoVista[] = ((contactos?.data ?? []) as Fila[]).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    servicio: c.service_type_id ? (nombres.get(c.service_type_id) ?? null) : null,
    dias: c.dias ?? [],
    franjas: c.franjas ?? [],
    promos: c.consentimiento_promos,
    baja: Boolean(c.baja_at),
  }));

  const msgs = (mensajes?.data ?? []) as { tipo: string; status: string }[];
  const resultados = resumirResultados(
    (ofertas?.data ?? []) as { resource_id: string; starts_at: string }[],
    (citas?.data ?? []) as { status: string; boost_precio_cents: number | null }[],
    msgs
  );
  const sinWhatsApp = msgs.some((m) => m.status === 'skipped') && !msgs.some((m) => m.status === 'sent');
  const puedeCambiar = role === 'owner' || role === 'admin';

  return (
    <>
      <PageHeader title={TITULO} description={DESCRIPCION} help={<AyudaBoost />} />
      <BoostVista
        usados={msgs.filter((m) => m.status === 'sent').length}
        tope={TOPE_BOOST_MENSAJES_MES}
        resultados={resultados}
        vipPrendido={tenant?.boost_vip_enabled === true}
        flojasPrendido={tenant?.boost_flojas_enabled === true}
        config={{
          descuento: tenant?.boost_descuento_max ?? 15,
          aviso: tenant?.boost_aviso_horas ?? 4,
          dias: tenant?.boost_dias ?? [1, 2, 3, 4, 5],
          desde: tenant?.boost_hora_desde ?? 11,
          hasta: tenant?.boost_hora_hasta ?? 17,
        }}
        contactos={lista}
        linkPublico={tenantBookingPageUrl(slug)}
        aviso={
          // !migrada = falta db/058_boost.sql.
          !migrada
            ? 'Estamos terminando de activar esto en tu cuenta. Mientras, no se guarda ni se manda nada.'
            : sinWhatsApp
              ? 'Hubo horarios para ofrecer, pero tu WhatsApp todavía no está conectado (eso lo hacemos nosotros): no salió ningún mensaje y no se gastó ninguno de los incluidos.'
              : !puedeCambiar
                ? 'Solo el dueño o un administrador puede prender esto o cambiar las reglas.'
                : null
        }
        acciones={
          puedeCambiar && migrada
            ? {
                vip: cambiarBoost.bind(null, slug, 'vip', tenant?.boost_vip_enabled !== true),
                flojas: cambiarBoost.bind(null, slug, 'flojas', tenant?.boost_flojas_enabled !== true),
                guardar: guardarHorasFlojas.bind(null, slug),
              }
            : undefined
        }
      />
    </>
  );
}
