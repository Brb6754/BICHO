'use server';

import { requireTenantStaff, StaffAccessError } from '@/lib/auth/tenantStaff';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTenantPreapproval, isMercadoPagoConfigured } from '@/lib/payments/mercadopago';
import { planDe, precioCheckout } from '@/lib/billing/planes';
import { cambiarPlan, fundadoresUsados } from '@/lib/billing/planServer';

// El dueño cambia su plan (Esencial/Negocio/Pro). Si ya paga, el monto de
// su suscripción en MP se ajusta para el siguiente cobro.
export async function changeMyPlan(slug: string, plan: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const nuevo = planDe(plan);
  if (!nuevo) return { ok: false, error: 'Ese plan no existe.' };
  try {
    const { tenantId, role } = await requireTenantStaff(slug);
    if (role !== 'owner') return { ok: false, error: 'Solo el dueño puede cambiar el plan.' };
    await cambiarPlan(tenantId, nuevo);
  } catch (e) {
    if (e instanceof StaffAccessError) return { ok: false, error: e.message };
    console.error(`[plan] change failed: ${e instanceof Error ? e.message : 'unknown'}`);
    return { ok: false, error: 'No se pudo cambiar el plan. Intenta de nuevo.' };
  }
  revalidatePath(`/t/${slug}/dashboard`, 'layout');
  return { ok: true };
}

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

  const admin = createAdminClient();
  const { data: tenant } = await admin.from('tenants').select('*').eq('id', tenantId).maybeSingle();
  const { monto } = precioCheckout(planDe(tenant?.plan), tenant?.precio_fundador_mxn ?? null, await fundadoresUsados(admin));

  try {
    const pre = await createTenantPreapproval({
      tenantId,
      amountMxn: monto,
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
