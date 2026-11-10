import { describe, expect, it } from 'vitest';
import { acceptsNewBookings, billingPatchFor, preapprovalSignal, tenantAccess } from './trial';

const now = new Date('2026-11-09T12:00:00Z');
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();

describe('tenantAccess', () => {
  it('legacy tenants without trial date or subscription are never blocked', () => {
    expect(tenantAccess({ status: 'trial', trial_ends_at: null }, now)).toEqual({ kind: 'active' });
    expect(tenantAccess({ status: 'suspended' }, now)).toEqual({ kind: 'active' });
    expect(tenantAccess(null, now)).toEqual({ kind: 'active' });
  });

  it('counts trial days left, rounding up', () => {
    expect(tenantAccess({ status: 'trial', trial_ends_at: daysFromNow(15) }, now)).toEqual({ kind: 'trial', daysLeft: 15 });
    expect(tenantAccess({ status: 'trial', trial_ends_at: daysFromNow(0.2) }, now)).toEqual({ kind: 'trial', daysLeft: 1 });
  });

  it('gives 3 days of grace after the trial, then suspends', () => {
    expect(tenantAccess({ status: 'trial', trial_ends_at: daysFromNow(-1) }, now)).toEqual({
      kind: 'grace',
      daysLeft: 2,
      reason: 'trial_ended',
    });
    expect(tenantAccess({ status: 'trial', trial_ends_at: daysFromNow(-3) }, now)).toEqual({ kind: 'suspended' });
  });

  it('active and paid is active even after the trial date', () => {
    expect(tenantAccess({ status: 'active', trial_ends_at: daysFromNow(-30) }, now)).toEqual({ kind: 'active' });
  });

  it('a failed payment on an active tenant opens grace, then suspends', () => {
    const row = { status: 'active', trial_ends_at: daysFromNow(-40) };
    expect(tenantAccess({ ...row, past_due_since: daysFromNow(-1) }, now)).toMatchObject({ kind: 'grace', reason: 'payment_failed' });
    expect(tenantAccess({ ...row, past_due_since: daysFromNow(-4) }, now)).toEqual({ kind: 'suspended' });
  });

  it('only suspended stops new bookings', () => {
    expect(acceptsNewBookings({ status: 'trial', trial_ends_at: daysFromNow(-2) }, now)).toBe(true);
    expect(acceptsNewBookings({ status: 'trial', trial_ends_at: daysFromNow(-5) }, now)).toBe(false);
    expect(acceptsNewBookings({ status: 'cancelled', trial_ends_at: daysFromNow(5) }, now)).toBe(false);
  });
});

describe('billingPatchFor (Mercado Pago transitions)', () => {
  it('authorized activates and adopts the preapproval', () => {
    const patch = billingPatchFor({ status: 'trial', trial_ends_at: daysFromNow(-5) }, preapprovalSignal('pre_1', 'authorized'), now);
    expect(patch).toEqual({ status: 'active', mp_preapproval_id: 'pre_1', mp_subscription_status: 'authorized', past_due_since: null });
    expect(tenantAccess({ trial_ends_at: daysFromNow(-5), ...patch }, now)).toEqual({ kind: 'active' });
  });

  it('cancelled on an active tenant starts grace', () => {
    const patch = billingPatchFor({ status: 'active', mp_preapproval_id: 'pre_1' }, preapprovalSignal('pre_1', 'cancelled'), now);
    expect(patch).toEqual({ mp_subscription_status: 'cancelled', past_due_since: now.toISOString() });
  });

  it('failed payment keeps the original past_due_since', () => {
    const since = daysFromNow(-1);
    const patch = billingPatchFor(
      { status: 'active', mp_preapproval_id: 'pre_1', past_due_since: since },
      { preapprovalId: 'pre_1', kind: 'failed', mpStatus: 'payment_rejected' },
      now
    );
    expect(patch).toEqual({ mp_subscription_status: 'payment_rejected' });
  });

  it('an old or abandoned preapproval cannot touch the current one', () => {
    expect(billingPatchFor({ status: 'active', mp_preapproval_id: 'pre_new' }, preapprovalSignal('pre_old', 'cancelled'), now)).toBeNull();
  });

  it('pending changes nothing, and a trial tenant does not get a second clock', () => {
    expect(billingPatchFor({ status: 'active', mp_preapproval_id: 'p' }, preapprovalSignal('p', 'pending'), now)).toBeNull();
    expect(billingPatchFor({ status: 'trial', mp_preapproval_id: 'p' }, preapprovalSignal('p', 'paused'), now)).toEqual({
      mp_subscription_status: 'paused',
    });
  });
});
