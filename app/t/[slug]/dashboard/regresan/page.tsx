import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AjustesRegresan, RegresanBoard } from '@/components/tenant-dash/RegresanBoard';
import { ajustesDe, armarRegresan, type CitaRegresan } from '@/lib/regresan/armar';
import { tenantBookingPageUrl } from '@/lib/urls';
import { guardarAjustesRegresan } from './actions';

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
  if (!productos.regresan) redirect('/dashboard');

  const db = createAdminClient();
  const [{ data: tenant }, { data: raw }] = await Promise.all([
    // select('*'): sin db/046 los ajustes caen a sus valores por omisión.
    db.from('tenants').select('*').eq('id', tenantId).maybeSingle(),
    db
      .from('bookings')
      .select('*, customers(name, phone, email), service_types(name)')
      .eq('tenant_id', tenantId)
      .order('starts_at', { ascending: false })
      .limit(BOOKING_LIMIT),
  ]);

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
      <PageHeader
        title="Clientes que regresan"
        description="A quién escribirle hoy para que vuelva, a quién pedirle una reseña, y los recordatorios que salen solos."
      />
      <RegresanBoard
        negocio={negocio}
        semanas={ajustes.semanas}
        canal={canal}
        tieneLinkResena={Boolean(ajustes.linkResena)}
        {...datos}
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
