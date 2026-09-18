import { describe, it, expect } from 'vitest';
import { pesosToCentavos, centavosToPesos, nextBillingAnchor, PRORATION_BEHAVIOR } from './stripe';

// The two pure calculations that decide how much a rep is charged and
// when. Neither can be checked by clicking through a sandbox, and both
// fail silently: a wrong exponent looks like a working integration until
// a bank statement says otherwise, and a bad anchor charges somebody on
// the wrong day without erroring.

describe('pesosToCentavos', () => {
  it('converts whole pesos to centavos (MXN has ISO 4217 exponent 2)', () => {
    // resellers.wholesale_price_mxn = 700 means seven hundred pesos.
    expect(pesosToCentavos(700)).toBe(70000);
  });

  it('is not the identity — the classic silent bug', () => {
    // Forgetting the conversion bills 7 pesos instead of 700.
    expect(pesosToCentavos(700)).not.toBe(700);
  });

  it('does not double-apply', () => {
    expect(pesosToCentavos(700)).not.toBe(7000000);
  });

  it('handles zero (a rep whose wholesale price is not set yet)', () => {
    expect(pesosToCentavos(0)).toBe(0);
  });

  it('covers the column bounds (0..100000 per db/016)', () => {
    expect(pesosToCentavos(100000)).toBe(10000000);
  });

  it('rounds a float round-trip to the nearest peso before scaling', () => {
    expect(pesosToCentavos(699.9999)).toBe(70000);
  });

  it('refuses a negative or non-finite price instead of billing a credit', () => {
    expect(() => pesosToCentavos(-1)).toThrow();
    expect(() => pesosToCentavos(Number.NaN)).toThrow();
  });

  it('round-trips through centavosToPesos', () => {
    expect(centavosToPesos(pesosToCentavos(1200))).toBe(1200);
  });
});

describe('nextBillingAnchor', () => {
  const at = (iso: string) => new Date(iso);

  it('lands on the requested day of the current month when it is still ahead', () => {
    const anchor = nextBillingAnchor(20, at('2026-09-17T10:00:00Z'));
    expect(new Date(anchor * 1000).toISOString()).toBe('2026-09-20T12:00:00.000Z');
  });

  it('rolls to next month when the day already passed', () => {
    const anchor = nextBillingAnchor(5, at('2026-09-17T10:00:00Z'));
    expect(new Date(anchor * 1000).toISOString()).toBe('2026-10-05T12:00:00.000Z');
  });

  it('rolls to next month when the day is today but the hour has passed', () => {
    // An anchor at or before "now" makes Stripe bill immediately, which
    // is exactly what saving a card must never do.
    const anchor = nextBillingAnchor(17, at('2026-09-17T15:00:00Z'));
    expect(new Date(anchor * 1000).toISOString()).toBe('2026-10-17T12:00:00.000Z');
  });

  it('is always strictly in the future', () => {
    const now = at('2026-09-17T10:00:00Z');
    for (let day = 1; day <= 28; day++) {
      expect(nextBillingAnchor(day, now) * 1000).toBeGreaterThan(now.getTime());
    }
  });

  it('crosses the year boundary', () => {
    const anchor = nextBillingAnchor(3, at('2026-12-20T10:00:00Z'));
    expect(new Date(anchor * 1000).toISOString()).toBe('2027-01-03T12:00:00.000Z');
  });

  it('clamps out-of-range days to the 1..28 the column allows', () => {
    // 28 is the ceiling precisely so February always has the day.
    const anchor = nextBillingAnchor(31, at('2026-01-01T10:00:00Z'));
    expect(new Date(anchor * 1000).toISOString()).toBe('2026-01-28T12:00:00.000Z');
    const low = nextBillingAnchor(0, at('2026-01-15T10:00:00Z'));
    expect(new Date(low * 1000).toISOString()).toBe('2026-02-01T12:00:00.000Z');
  });

  it('gives a day that exists in February', () => {
    const anchor = nextBillingAnchor(28, at('2027-02-01T10:00:00Z'));
    expect(new Date(anchor * 1000).toISOString()).toBe('2027-02-28T12:00:00.000Z');
  });

  it('returns seconds, not milliseconds (Stripe rejects ms)', () => {
    const anchor = nextBillingAnchor(10, at('2026-09-17T10:00:00Z'));
    expect(anchor).toBeLessThan(10_000_000_000);
    expect(Number.isInteger(anchor)).toBe(true);
  });
});

describe('proration policy', () => {
  it('records prorations for the next renewal instead of invoicing now', () => {
    // The owner's decision, pinned by a test so a future "let's just
    // charge them right away" is a failing test rather than a surprise
    // on somebody's card. 'always_invoice' would charge immediately;
    // 'none' would throw the adjustment away entirely.
    expect(PRORATION_BEHAVIOR).toBe('create_prorations');
  });
});
