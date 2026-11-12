import type { createAdminClient } from '@/lib/supabase/admin';
import { sendReferralCreditNotice } from '@/lib/email/registro';
import { creditApplication, earnsCredit } from './rules';

type Admin = ReturnType<typeof createAdminClient>;

// Tabla o columna que aún no existe (db/052 sin correr): Referidos se apaga
// en silencio en vez de tumbar el registro o el webhook.
export function isMissingReferrals(error: { code?: string } | null | undefined): boolean {
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error?.code ?? '');
}

/**
 * Llamar cuando la suscripción de `referredTenantId` queda autorizada.
 * Gana el mes gratis solo el primer aviso: el UPDATE ... WHERE
 * first_paid_at IS NULL es el candado, aunque MP mande el mismo pago
 * por dos caminos (preapproval + authorized_payment).
 * Lanza en errores reales para que el webhook libere el evento y MP reintente.
 */
export async function grantReferralCredit(admin: Admin, referredTenantId: string, now: Date = new Date()): Promise<void> {
  const { data: row, error } = await admin
    .from('referrals')
    .select('referrer_tenant_id, referred_tenant_id, first_paid_at, referred_name')
    .eq('referred_tenant_id', referredTenantId)
    .maybeSingle();
  if (error) {
    if (isMissingReferrals(error)) return;
    throw new Error(`referral lookup failed code=${error.code}`);
  }
  if (!earnsCredit(row, 'authorized')) return;

  const { data: claimed, error: claimError } = await admin
    .from('referrals')
    .update({ first_paid_at: now.toISOString() })
    .eq('referred_tenant_id', referredTenantId)
    .is('first_paid_at', null)
    .select('referrer_tenant_id');
  if (claimError) throw new Error(`referral claim failed code=${claimError.code}`);
  if (!claimed?.length) return; // otro aviso ya lo ganó

  const release = () =>
    admin.from('referrals').update({ first_paid_at: null }).eq('referred_tenant_id', referredTenantId);

  const { data: referrer, error: refError } = await admin
    .from('tenants')
    .select('id, name, slug, status, trial_ends_at, mp_preapproval_id, mp_subscription_status')
    .eq('id', row!.referrer_tenant_id)
    .maybeSingle();
  if (refError || !referrer) {
    await release();
    if (refError) throw new Error(`referrer lookup failed code=${refError.code}`);
    return;
  }

  const plan = creditApplication(referrer, now);
  if (plan.kind === 'extend_trial') {
    const { error: extError } = await admin.from('tenants').update({ trial_ends_at: plan.trialEndsAt }).eq('id', referrer.id);
    if (extError) {
      await release();
      throw new Error(`trial extension failed code=${extError.code}`);
    }
  }

  const { error: statusError } = await admin
    .from('referrals')
    .update(
      plan.kind === 'extend_trial'
        ? { credit_status: 'applied', credit_applied_at: now.toISOString() }
        : { credit_status: 'pending' }
    )
    .eq('referred_tenant_id', referredTenantId);
  // El mes ya se aplicó (o se avisa abajo); solo queda mal la etiqueta.
  if (statusError) console.error(`[referidos] credit_status no guardado code=${statusError.code}`);

  if (plan.kind === 'manual') {
    // shortcut: el referidor ya paga (o no tiene prueba con fecha), así que el mes
    // se aplica a mano en Mercado Pago (luego credit_status='done' en Supabase). Automatizarlo
    // cuando haya volumen: saltar un cobro con la API de preapproval.
    await sendReferralCreditNotice({ referrer: referrer.name, referrerSlug: referrer.slug, referred: row!.referred_name as string });
  }
}
