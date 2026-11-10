'use server';

import { requireTenantStaff, StaffAccessError } from '@/lib/auth/tenantStaff';
import { createClient } from '@/lib/supabase/server';
import { createTenantPreapproval, isMercadoPagoConfigured } from '@/lib/payments/mercadopago';

// Crea la suscripción en Mercado Pago y devuelve la URL de su checkout.
// No hace redirect() aquí (trampa documentada en CLAUDE.md): el cliente
// navega con window.location.
export async function startPlanCheckout(slug: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let tenantId: string;
  try {
    ({ tenantId } = await requireTenantStaff(slug));
  } catch (e) {
    return { ok: false, error: e instanceof StaffAccessError ? e.message : 'No tienes acceso a este negocio.' };
  }

  if (!isMercadoPagoConfigured()) {
    return { ok: false, error: 'Los pagos todavía no están configurados. Escríbele al equipo de bicho.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: 'Tu cuenta no tiene correo; no podemos abrir el pago.' };

  // MP exige back_url https; en local se puede apuntar MP_BACK_URL_BASE a un túnel.
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const base = process.env.MP_BACK_URL_BASE ?? `${rootDomain.startsWith('localhost') ? 'http' : 'https'}://${rootDomain}`;

  try {
    const pre = await createTenantPreapproval({
      tenantId,
      payerEmail: user.email,
      backUrl: `${base}/t/${slug}/dashboard/plan?vuelta=1`,
    });
    if (!pre.init_point) return { ok: false, error: 'Mercado Pago no devolvió la página de pago. Intenta de nuevo.' };
    return { ok: true, url: pre.init_point };
  } catch (e) {
    console.error(`[plan] preapproval failed: ${e instanceof Error ? e.message : 'unknown'}`);
    return { ok: false, error: 'No pudimos abrir Mercado Pago. Intenta de nuevo en un momento.' };
  }
}
