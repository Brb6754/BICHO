import { createHmac, timingSafeEqual } from 'node:crypto';

// Rule 3 + Rule 9 — the signature check, written out rather than left
// implicit inside the SDK.
//
// The route also calls stripe.webhooks.constructEvent(), which is the
// canonical verifier and stays the authority on parsing. This module
// exists next to it for two reasons that are worth the duplication:
//
//  1. It is testable without a Stripe account. Signature verification is
//     the one piece of this integration that must be right on the first
//     real event and that cannot be exercised by clicking around a
//     sandbox, so it gets a unit test that forges headers on purpose
//     (see webhookSignature.test.ts). Everything else in the payments
//     path can be checked against Stripe's test mode; this cannot.
//  2. It makes the two properties a reviewer actually cares about —
//     constant-time comparison and the replay tolerance — visible in
//     this repository instead of being a property of a dependency.
//
// If the two verifiers ever disagree, the request is rejected. There is
// no path where a signature is "good enough".

export type SignatureFailure =
  | 'missing_header'
  | 'malformed_header'
  | 'timestamp_out_of_tolerance'
  | 'no_matching_signature';

export type SignatureResult =
  | { ok: true; timestamp: number }
  | { ok: false; reason: SignatureFailure };

/**
 * Stripe-Signature looks like:
 *   t=1712345678,v1=5257a869e7...,v1=<older key during rotation>
 *
 * More than one v1 is normal: while a signing secret is being rotated,
 * Stripe signs with both, and rejecting the second one would take the
 * endpoint down for the length of the rotation.
 */
function parseHeader(header: string): { timestamp: number; signatures: string[] } | null {
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return null;
      timestamp = parsed;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

/**
 * Constant-time comparison of two hex digests.
 *
 * timingSafeEqual throws if the buffers differ in length, and a length
 * check before it is NOT a timing leak: the length of a hex SHA-256
 * digest is public information (always 64 chars), so all a mismatched
 * length reveals is that the attacker sent something the wrong shape.
 * What must not leak is WHERE two equal-length digests diverge, and that
 * is exactly what timingSafeEqual protects.
 */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyStripeSignature(params: {
  /** The exact bytes Stripe sent, as read by request.text(). */
  rawBody: string;
  /** The Stripe-Signature header, verbatim. */
  signatureHeader: string | null;
  /** STRIPE_WEBHOOK_SECRET (whsec_...). NOT the API key. */
  secret: string;
  /** Rule 9 replay window. Stripe's recommendation is 300s. */
  toleranceSeconds: number;
  /** Injectable so the test can pin a clock. */
  nowSeconds?: number;
}): SignatureResult {
  const { rawBody, signatureHeader, secret, toleranceSeconds } = params;
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!signatureHeader) return { ok: false, reason: 'missing_header' };

  const parsed = parseHeader(signatureHeader);
  if (!parsed) return { ok: false, reason: 'malformed_header' };

  // Rule 9, first half. Checked BEFORE the HMAC so a captured-and-replayed
  // request from last week is rejected on arithmetic rather than on a
  // comparison that would succeed — the signature on a replayed request
  // is genuinely valid, which is the whole problem replay protection
  // exists to solve.
  //
  // Absolute difference, not `now - t`: a future timestamp is just as
  // wrong as an old one and usually means a clock is broken somewhere.
  if (Math.abs(now - parsed.timestamp) > toleranceSeconds) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' };
  }

  // Stripe's signed payload is `${timestamp}.${rawBody}` — the timestamp
  // is inside the HMAC, which is what stops an attacker from replaying an
  // old body with a fresh `t=`.
  //
  // The secret is used raw (not base64-decoded): Stripe's whsec_ value is
  // the HMAC key as-is. Decoding it first is a real and popular bug, and
  // it fails in the worst way — every signature mismatches and the
  // failure looks like a network problem.
  const expected = createHmac('sha256', secret)
    .update(`${parsed.timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  for (const candidate of parsed.signatures) {
    if (safeEqualHex(expected, candidate)) {
      return { ok: true, timestamp: parsed.timestamp };
    }
  }

  return { ok: false, reason: 'no_matching_signature' };
}
