import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyStripeSignature } from './webhookSignature';

// Signature verification is the one piece of the payments path that has
// to be right on the very first real event and that a sandbox click-through
// cannot exercise, so it is tested by forging headers directly.

const SECRET = 'whsec_test_not_a_real_secret_value_0123456789';
const BODY = '{"id":"evt_test_1","type":"invoice.paid","created":1712345678}';
const NOW = 1712345678;

function sign(body: string, timestamp: number, secret = SECRET): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

describe('verifyStripeSignature', () => {
  it('accepts a correctly signed payload', () => {
    const result = verifyStripeSignature({
      rawBody: BODY,
      signatureHeader: sign(BODY, NOW),
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: true, timestamp: NOW });
  });

  it('rejects a body that changed after signing', () => {
    // The exact attack raw-body handling exists to prevent: a valid
    // signature attached to a payload someone edited in flight.
    const header = sign(BODY, NOW);
    const tampered = BODY.replace('invoice.paid', 'invoice.payment_failed');
    const result = verifyStripeSignature({
      rawBody: tampered,
      signatureHeader: header,
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: false, reason: 'no_matching_signature' });
  });

  it('rejects a signature made with a different secret', () => {
    const result = verifyStripeSignature({
      rawBody: BODY,
      signatureHeader: sign(BODY, NOW, 'whsec_someone_elses_secret_0123456789'),
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: false, reason: 'no_matching_signature' });
  });

  it('rejects a replayed request outside the tolerance window', () => {
    // Genuinely signed by Stripe, captured, and resent an hour later.
    // The signature still verifies; only the timestamp window stops it.
    const header = sign(BODY, NOW - 3600);
    const result = verifyStripeSignature({
      rawBody: BODY,
      signatureHeader: header,
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: false, reason: 'timestamp_out_of_tolerance' });
  });

  it('rejects a timestamp too far in the future', () => {
    const header = sign(BODY, NOW + 3600);
    const result = verifyStripeSignature({
      rawBody: BODY,
      signatureHeader: header,
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: false, reason: 'timestamp_out_of_tolerance' });
  });

  it('accepts a request inside the window', () => {
    const header = sign(BODY, NOW - 299);
    const result = verifyStripeSignature({
      rawBody: BODY,
      signatureHeader: header,
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it('accepts when one of several v1 signatures matches (secret rotation)', () => {
    // Stripe signs with both the old and the new secret while a rotation
    // is in progress. Taking only the first v1 would black out the
    // endpoint for the length of the rotation.
    const good = createHmac('sha256', SECRET).update(`${NOW}.${BODY}`, 'utf8').digest('hex');
    const header = `t=${NOW},v1=${'0'.repeat(64)},v1=${good}`;
    const result = verifyStripeSignature({
      rawBody: BODY,
      signatureHeader: header,
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a missing header', () => {
    const result = verifyStripeSignature({
      rawBody: BODY,
      signatureHeader: null,
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: false, reason: 'missing_header' });
  });

  it('rejects a header with no v1 part', () => {
    const result = verifyStripeSignature({
      rawBody: BODY,
      signatureHeader: `t=${NOW}`,
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: false, reason: 'malformed_header' });
  });

  it('rejects a signature of the wrong length instead of throwing', () => {
    // timingSafeEqual throws on mismatched buffer lengths; a handler that
    // lets that escape turns a forged request into a 500 and a noisy
    // alert instead of a clean 400.
    const result = verifyStripeSignature({
      rawBody: BODY,
      signatureHeader: `t=${NOW},v1=abcd`,
      secret: SECRET,
      toleranceSeconds: 300,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: false, reason: 'no_matching_signature' });
  });
});
