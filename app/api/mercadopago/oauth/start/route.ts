import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff, StaffAccessError } from '@/lib/auth/tenantStaff';
import { mpConnectHabilitado } from '@/lib/anticipos/config';
import { configConnect, crearState, urlAutorizacion } from '@/lib/payments/mpConnect';

// Inicia la conexión de la cuenta de Mercado Pago del negocio (OAuth).
// GET /api/mercadopago/oauth/start?slug=<slug> desde el panel: la sesión
// vive en el host del panel y /api no pasa por el rewrite de subdominio.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!mpConnectHabilitado()) return new Response('not found', { status: 404 });
  const cfg = configConnect();
  if (!cfg) return new Response('Mercado Pago Connect no está configurado.', { status: 503 });

  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  let tenantId: string;
  try {
    ({ tenantId } = await requireTenantStaff(slug));
  } catch (e) {
    if (e instanceof StaffAccessError) return new Response(e.message, { status: 403 });
    throw e;
  }

  const state = await crearState(createAdminClient(), tenantId);
  if (!state) {
    console.error('[mp-connect] no se pudo crear el state (¿falta db/061?)');
    return new Response('No se pudo iniciar la conexión.', { status: 503 });
  }
  return Response.redirect(urlAutorizacion(cfg, state), 302);
}
