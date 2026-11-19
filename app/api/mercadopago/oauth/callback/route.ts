import { createAdminClient } from '@/lib/supabase/admin';
import { mpConnectHabilitado } from '@/lib/anticipos/config';
import { configConnect, consumirState, guardarConexion, intercambiarCodigo } from '@/lib/payments/mpConnect';
import { tenantShareUrl } from '@/lib/urls';

// Regreso del OAuth de Mercado Pago (MP_CONNECT_REDIRECT_URI apunta aquí,
// en el dominio raíz). No necesita sesión: el state de un solo uso, creado
// por un miembro del negocio hace < 10 min, es lo que liga el regreso al negocio.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!mpConnectHabilitado()) return new Response('not found', { status: 404 });
  const cfg = configConnect();
  if (!cfg) return new Response('Mercado Pago Connect no está configurado.', { status: 503 });

  const q = new URL(request.url).searchParams;
  const db = createAdminClient();
  const tenantId = await consumirState(db, q.get('state') ?? '');
  if (!tenantId) return new Response('El enlace de conexión venció o ya se usó. Vuelve a intentarlo desde tu panel.', { status: 400 });

  const { data: tenant } = await db.from('tenants').select('slug').eq('id', tenantId).maybeSingle();
  if (!tenant?.slug) return new Response('Negocio no encontrado.', { status: 404 });
  const volver = (r: 'ok' | 'error') => Response.redirect(`${tenantShareUrl(tenant.slug)}/dashboard/anticipos?mp=${r}`, 302);

  const code = q.get('code');
  if (!code) return volver('error'); // el dueño rechazó o MP devolvió error
  try {
    await guardarConexion(db, tenantId, await intercambiarCodigo(cfg, code));
  } catch (e) {
    console.error(`[mp-connect] callback falló tenant=${tenantId}: ${e instanceof Error ? e.message : 'desconocido'}`);
    return volver('error');
  }
  return volver('ok');
}
