import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AjustesRegresan, AyudaRegresan, RegresanBoard } from '@/components/tenant-dash/RegresanBoard';
import { ajustesDe, armarRegresan, type CitaRegresan } from '@/lib/regresan/armar';
import { tenantBookingPageUrl } from '@/lib/urls';
import { guardarAjustesRegresan, marcarContactada } from './actions';
import { Bloqueado } from '../plan/Bloqueado';

const TITULO = 'Clientes que regresan';
const DESCRIPCION = 'Mensajes listos para que tus clientas vuelvan y te dejen reseña en Google.';

export const dynamic = 'force-dynamic';

// CLIENTES QUE REGRESAN — recordatorio de 24 h, clientas que no han
// vuelto y pedir reseña de Google.
//
// Lee con service_role tras requireTenantStaff, filtrando por tenant_id,
// por lo mismo que Reuniones: `bookings` y `customers` guardan teléfonos
// y no tienen policies para la sesión del panel.

// Mismo techo que la pantalla de Clientes.
const BOOKING_LIMIT = 4000;

export default async function RegresanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  const db = createAdminClient();
  if (!productos.regresan) {
    const { data: t } = await db.from('tenants').select('plan').eq('id', tenantId).maybeSingle();
    return (
      <div>
        <PageHeader title={TITULO} description={DESCRIPCION} />
        <Bloqueado
          modulo="regresan"
          plan={t?.plan}
          ejemplo="/panel/regresan"
          ganas={[
            'Ver qué clientas llevan semanas sin venir y escribirles con un toque.',
            'Pedir reseñas de Google a quien vino esta semana.',
            'Que cada clienta reciba un recordatorio un día antes de su cita.',
          ]}
        />
      </div>
    );
  }

  const [{ data: tenant }, { data: raw }, contactosRes] = await Promise.all([
    // select('*'): sin db/046 los ajustes caen a sus valores por omisión.
    db.from('tenants').select('*').eq('id', tenantId).maybeSingle(),
    db
      .from('bookings')
      .select('*, customers(name, phone, email), service_types(name)')
      .eq('tenant_id', tenantId)
      .order('starts_at', { ascending: false })
      .limit(BOOKING_LIMIT),
    // "Ya le escribiste" (db/060), últimos 30 días. Sin la tabla: null y la pantalla usa el teléfono.
    db
      .from('regresan_contactos')
      .select('clave, contactado_at')
      .eq('tenant_id', tenantId)
      .gte('contactado_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
  ]);
  const escritasBase = contactosRes.error
    ? null
    : Object.fromEntries(
        (contactosRes.data ?? []).map((c) => [c.clave as string, new Date(c.contactado_at as string).getTime()]),
      );

  const ajustes = ajustesDe(tenant);
  const negocio = (tenant?.name as string) ?? 'tu negocio';
  // Igual que el cron: WhatsApp solo con el extra prendido y la plantilla
  // de recordatorio aprobada; si no, correo.
  const canal = tenant?.whatsapp_enabled && process.env.WHATSAPP_TEMPLATE_REMINDER ? 'whatsapp' : 'correo';

  const datos = armarRegresan({
    citas: (raw ?? []) as unknown as CitaRegresan[],
    negocio,
    linkReservar: tenantBookingPageUrl(slug),
    ajustes,
    canal,
    timezone,
    now: new Date(),
  });

  return (
    <div>
      <PageHeader title={TITULO} description={DESCRIPCION} help={<AyudaRegresan />} />
      <RegresanBoard
        negocio={negocio}
        semanas={ajustes.semanas}
        canal={canal}
        tieneLinkResena={Boolean(ajustes.linkResena)}
        {...datos}
        escritasBase={escritasBase}
        onContactada={marcarContactada.bind(null, slug)}
        ajustes={
          <AjustesRegresan
            semanas={ajustes.semanas}
            linkResena={ajustes.linkResena ?? ''}
            onGuardar={guardarAjustesRegresan.bind(null, slug)}
          />
        }
      />
    </div>
  );
}
