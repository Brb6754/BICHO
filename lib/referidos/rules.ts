// Reglas puras de Referidos (db/052): sin red ni reloj implícito.
import { slugError } from '@/lib/onboarding/slug';

export const REFERRAL_FREE_DAYS = 30;
const DAY_MS = 86_400_000;

/** El código de referido ES el slug del negocio. null = no es un código válido. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toLowerCase();
  return slugError(code) ? null : code;
}

/** ¿Se puede ligar este alta a ese referidor? (existe, no es él mismo, no es el mismo dueño). */
export function canLinkReferral(p: {
  referrerId: string | null | undefined;
  referredId: string;
  sameOwnerContact?: boolean;
}): boolean {
  return Boolean(p.referrerId) && p.referrerId !== p.referredId && !p.sameOwnerContact;
}

export type ReferralRow = {
  referrer_tenant_id: string;
  referred_tenant_id: string;
  first_paid_at: string | null;
};

/** El mes gratis se gana solo con el PRIMER pago autorizado, y una sola vez por referido. */
export function earnsCredit(row: ReferralRow | null | undefined, signalKind: string): boolean {
  if (!row || signalKind !== 'authorized') return false;
  if (row.first_paid_at) return false;
  return row.referrer_tenant_id !== row.referred_tenant_id;
}

export type ReferrerBillingRow = {
  status?: string | null;
  trial_ends_at?: string | null;
  mp_preapproval_id?: string | null;
  mp_subscription_status?: string | null;
};

export type CreditApplication = { kind: 'extend_trial'; trialEndsAt: string } | { kind: 'manual' };

/**
 * Cómo se aplica el mes ganado. Solo se toca sola la prueba de un negocio
 * que de verdad está en prueba con fecha: un negocio sin fecha (alta
 * vieja, nunca se bloquea) se volvería "con reloj" al ponérsela, y uno
 * activo ignora trial_ends_at (lib/billing/trial.ts). Esos van a mano.
 */
export function creditApplication(referrer: ReferrerBillingRow, now: Date = new Date()): CreditApplication {
  const paying = referrer.status === 'active' && referrer.mp_preapproval_id && referrer.mp_subscription_status === 'authorized';
  if (paying) return { kind: 'manual' };
  if (referrer.status !== 'trial' || !referrer.trial_ends_at) return { kind: 'manual' };
  const current = Date.parse(referrer.trial_ends_at);
  if (Number.isNaN(current)) return { kind: 'manual' };
  // Si la prueba ya venció (gracia o pausa), los 30 días cuentan desde hoy.
  const base = Math.max(current, now.getTime());
  return { kind: 'extend_trial', trialEndsAt: new Date(base + REFERRAL_FREE_DAYS * DAY_MS).toISOString() };
}

/** Link que comparte el negocio. */
export function referralUrl(code: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${rootDomain}/registro?ref=${encodeURIComponent(code)}`;
}
