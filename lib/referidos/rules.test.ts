import { describe, expect, it } from 'vitest';
import { canLinkReferral, creditApplication, earnsCredit, normalizeReferralCode } from './rules';

const now = new Date('2026-11-11T12:00:00Z');
const days = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();

describe('normalizeReferralCode', () => {
  it('accepts a slug, trimmed and lowercased', () => {
    expect(normalizeReferralCode('  Barber-Uno ')).toBe('barber-uno');
  });
  it('rejects junk, non-strings and reserved names', () => {
    expect(normalizeReferralCode('a')).toBeNull();
    expect(normalizeReferralCode('x; drop table')).toBeNull();
    expect(normalizeReferralCode('../admin')).toBeNull();
    expect(normalizeReferralCode(undefined)).toBeNull();
    expect(normalizeReferralCode(['barber'])).toBeNull();
    expect(normalizeReferralCode('admin')).toBeNull();
  });
});

describe('canLinkReferral', () => {
  it('needs an existing referrer that is not the new business nor the same owner', () => {
    expect(canLinkReferral({ referrerId: 'a', referredId: 'b' })).toBe(true);
    expect(canLinkReferral({ referrerId: null, referredId: 'b' })).toBe(false);
    expect(canLinkReferral({ referrerId: 'b', referredId: 'b' })).toBe(false);
    expect(canLinkReferral({ referrerId: 'a', referredId: 'b', sameOwnerContact: true })).toBe(false);
  });
});

describe('earnsCredit', () => {
  const row = { referrer_tenant_id: 'a', referred_tenant_id: 'b', first_paid_at: null };
  it('grants on the first authorized payment', () => {
    expect(earnsCredit(row, 'authorized')).toBe(true);
  });
  it('is idempotent: a second authorized signal grants nothing', () => {
    expect(earnsCredit({ ...row, first_paid_at: days(-1) }, 'authorized')).toBe(false);
  });
  it('ignores non-payments, missing rows and self-referrals', () => {
    expect(earnsCredit(row, 'pending')).toBe(false);
    expect(earnsCredit(row, 'failed')).toBe(false);
    expect(earnsCredit(null, 'authorized')).toBe(false);
    expect(earnsCredit({ ...row, referred_tenant_id: 'a' }, 'authorized')).toBe(false);
  });
});

describe('creditApplication', () => {
  it('extends a running trial by 30 days from its end', () => {
    expect(creditApplication({ status: 'trial', trial_ends_at: days(5) }, now)).toEqual({ kind: 'extend_trial', trialEndsAt: days(35) });
  });
  it('restarts from today when the trial already ended', () => {
    expect(creditApplication({ status: 'trial', trial_ends_at: days(-10) }, now)).toEqual({ kind: 'extend_trial', trialEndsAt: days(30) });
  });
  it('leaves paying businesses to Bruno', () => {
    expect(
      creditApplication({ status: 'active', mp_preapproval_id: 'p', mp_subscription_status: 'authorized', trial_ends_at: days(-30) }, now)
    ).toEqual({ kind: 'manual' });
  });
  it('never puts a clock on a legacy business without trial date', () => {
    expect(creditApplication({ status: 'trial', trial_ends_at: null }, now)).toEqual({ kind: 'manual' });
    expect(creditApplication({ status: 'active' }, now)).toEqual({ kind: 'manual' });
  });
});
