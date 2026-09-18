import Stripe from 'stripe';

// The single place the Stripe SDK is constructed. Server-only: nothing
// under app/ that carries 'use client' may import this file, or the
// secret key ends up in the browser bundle.
//
// Rule 1: the key is read from the environment, never inlined. There is
// no fallback string and no "demo" value on purpose — a placeholder key
// would make a misconfigured deployment look like it is working right up
// until the first real charge.

// Pinned explicitly. Stripe versions its API by date, and an unpinned
// client silently follows the account's default version, so an account
// setting changed in the dashboard can alter the shape of objects this
// code parses without a single line changing here.
//
// This value is the version the installed SDK (stripe@18.5.x) was built
// against — Stripe.LatestApiVersion. The PagoKit catalog names the older
// '2025-04-30.basil' from the same generation; pinning to the SDK's own
// version keeps the TypeScript types and the wire format in agreement,
// which is the point of pinning at all. When the SDK is upgraded, bump
// this deliberately and read the release notes, do not delete the line.
export const STRIPE_API_VERSION = '2025-08-27.basil' as const;

// MXN, lowercase, the way Stripe wants it. Declared once so a second
// currency can never appear by typo.
export const BILLING_CURRENCY = 'mxn' as const;

// Rule 9: Stripe signs a timestamp inside Stripe-Signature and this is
// how far out of date an event may be before the handler rejects it.
// 300s is Stripe's own recommendation and also the SDK default; naming
// it here makes it reviewable instead of implicit.
export const WEBHOOK_TOLERANCE_SECONDS = 300;

let cached: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    // Thrown, not returned: every caller already handles a thrown error
    // through toPaymentError(), and a null client would push the same
    // check into a dozen call sites where forgetting it is silent.
    throw new Error('STRIPE_SECRET_KEY no está configurada en este ambiente.');
  }

  cached = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    // Shows up in the Stripe dashboard's request log, which is what you
    // read at 2am when you are trying to work out which deployment made
    // a call.
    appInfo: { name: 'bicho reservas-saas', url: 'https://reservas-saas-sigma.vercel.app' },
    // Vercel functions have a hard wall-clock limit; a Stripe call that
    // hangs past it takes the whole invocation down with no error to
    // log. Two retries cover a transient network blip without turning a
    // slow Stripe into a slow panel.
    timeout: 20_000,
    maxNetworkRetries: 2,
  });

  return cached;
}

// ============================================================
// Money.
// ============================================================

// THE conversion, and the single most likely silent bug in this whole
// integration, so it lives in one function that everything else calls.
//
// resellers.wholesale_price_mxn is an INTEGER IN WHOLE PESOS (the column
// is constrained 0..100000 and is typed by hand in the internal panel —
// "700" means seven hundred pesos, not seven pesos).
//
// MXN has ISO 4217 exponent 2, so Stripe's unit_amount is in CENTAVOS.
// The conversion is therefore x100: 700 pesos -> 70000 centavos.
//
// Getting this wrong is invisible in code review and very visible on a
// bank statement: forget the x100 and you bill 7 pesos instead of 700;
// apply it twice and you bill 70,000. Never write `* 100` at a call
// site — call this.
export function pesosToCentavos(wholePesos: number): number {
  if (!Number.isFinite(wholePesos) || wholePesos < 0) {
    throw new Error(`Precio mayorista inválido: ${wholePesos}`);
  }
  // Math.round, not Math.trunc: the column is an integer, but a value
  // arriving as 699.9999 from a float round-trip should bill 700.00, not
  // 699.99.
  return Math.round(wholePesos) * 100;
}

// The inverse, for display only. Never feed the result back to Stripe.
export function centavosToPesos(centavos: number): number {
  return Math.round(centavos) / 100;
}

// ============================================================
// Billing day -> billing_cycle_anchor.
// ============================================================

// resellers.billing_day is a smallint constrained 1..28 (28 so the day
// exists in February too). Stripe wants an absolute unix timestamp for
// billing_cycle_anchor, and it must be in the FUTURE — an anchor in the
// past makes Stripe bill immediately, which is exactly what the owner
// asked not to happen.
//
// So: the next occurrence of that day-of-month. If today is the 5th and
// billing_day is 5, the answer is the 5th of NEXT month, not today —
// otherwise the anchor is "now", Stripe treats it as immediate, and the
// rep gets charged the second they save their card.
export function nextBillingAnchor(billingDay: number, now: Date = new Date()): number {
  const day = Math.min(28, Math.max(1, Math.round(billingDay)));

  // Built in UTC because Stripe stores and compares timestamps in UTC.
  // The practical effect for a Mexican rep is that the charge lands
  // early on the morning of their billing day, which is fine and is what
  // any monthly subscription does; what matters is that the DAY does not
  // drift, and anchoring in UTC is what keeps it stable.
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  let anchor = Date.UTC(year, month, day, 12, 0, 0);

  // Midday UTC rather than midnight: it puts a comfortable margin
  // between the anchor and a day boundary in either direction, so no
  // timezone rounding anywhere in the chain can shift the charge into
  // the previous or next calendar day.
  if (anchor <= now.getTime()) {
    anchor = Date.UTC(year, month + 1, day, 12, 0, 0);
  }

  return Math.floor(anchor / 1000);
}

// ============================================================
// Proration policy — written down here so it is decided once.
// ============================================================

// The owner's decision: a quantity change NEVER charges the rep on the
// spot. When a business turns active mid-month, or stops being active,
// Stripe records the difference as a proration line item and settles it
// on the next renewal invoice.
//
// In Stripe's vocabulary that is 'create_prorations'. The two things it
// is NOT:
//   - 'always_invoice' would invoice the difference immediately. That is
//     the behaviour the owner explicitly ruled out.
//   - 'none' would throw the difference away entirely, so a rep who
//     activated ten businesses on the 2nd would get them free until the
//     next cutoff.
//
// Same constant is used when the subscription is first created with a
// future billing_cycle_anchor: the partial first period is prorated onto
// that first invoice rather than charged at signup, which is why saving
// a card does not move any money.
export const PRORATION_BEHAVIOR = 'create_prorations' as const;
