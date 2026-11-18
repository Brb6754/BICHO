import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff, StaffAccessError } from '@/lib/auth/tenantStaff';
import { tenantShareUrl } from '@/lib/urls';

// POST (form con `slug`) desde el panel: borra la conexión de Mercado Pago
// del negocio. No exige el flag, para poder desconectar aunque se apague.
// TODO: MP no documenta un endpoint de revocación; el dueño puede quitar
// el permiso desde su cuenta de MP (Seguridad → aplicaciones conectadas).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // CSRF: el form sale del mismo host; un POST de otro sitio trae otro Origin (o ninguno).
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  let mismoSitio = false;
  try {
    mismoSitio = Boolean(origin && host && new URL(origin).host === host);
  } catch {}
  if (!mismoSitio) return new Response('forbidden', { status: 403 });

  const form = await request.formData().catch(() => null);
  const slug = String(form?.get('slug') ?? '');
  let tenantId: string;
  try {
    ({ tenantId } = await requireTenantStaff(slug));
  } catch (e) {
    if (e instanceof StaffAccessError) return new Response(e.message, { status: 403 });
    throw e;
  }

  const { error } = await createAdminClient().from('tenant_mp_connections').delete().eq('tenant_id', tenantId);
  if (error) console.error(`[mp-connect] desconectar falló code=${error.code}`);
  return Response.redirect(`${tenantShareUrl(slug)}/dashboard/whatsapp?mp=${error ? 'error' : 'desconectado'}`, 303);
}
