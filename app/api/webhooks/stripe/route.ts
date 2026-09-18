import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, WEBHOOK_TOLERANCE_SECONDS, centavosToPesos } from '@/lib/payments/stripe';
import { verifyStripeSignature } from '@/lib/payments/webhookSignature';
import { sendResellerDunning } from '@/lib/email/sendResellerDunning';
import { resellerSubscriptionUrl } from '@/lib/urls';

// Stripe webhook for the sales-rep subscription (db/018).
//
// PATH: /api/webhooks/stripe — NOT the /api/webhook/<provider>/ default.
// proxy.ts rewrites every subdomain to /t/{slug} or /admin/vendedor, but
// explicitly skips anything under /api, so this literal path resolves on
// any host. In production the endpoint is
//   https://reservas-saas-sigma.vercel.app/api/webhooks/stripe
// (no custom domain yet, so tenant subdomains do not resolve on
// *.vercel.app — a subdomain-based webhook URL would simply never
// connect).
//
// Rule 5: this route must run on Node, not Edge. Signature verification
// needs node:crypto and the exact request bytes; the Edge runtime gives
// neither the same crypto surface nor a guarantee about body handling.
export const runtime = 'nodejs';
// Nothing here is cacheable and a cached webhook response would be a
// very confusing outage.
export const dynamic = 'force-dynamic';

// Rule 10: a webhook endpoint is a public URL that accepts POST bodies.
// Real Stripe events are a few KB; 256 KB is generous headroom and still
// refuses to buffer a body someone sends to exhaust the function's
// memory.
const MAX_BODY_BYTES = 256 * 1024;

// Rule 6: only ever these three fields. The event body carries the rep's
// email, billing address and card last4, and anything written to
// console here is retained by Vercel's log drain indefinitely.
function logEvent(event: Stripe.Event, note: string): void {
  console.log(`[stripe-webhook] ${note} id=${event.id} type=${event.type} created=${event.created}`);
}

type Admin = ReturnType<typeof createAdminClient>;

function toIso(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null;
}

function idOf(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : (value.id ?? null);
}

// The Stripe customer IS the rep (db/018), so every event resolves back
// to a reseller row through this one lookup. A null answer is normal and
// not an error: a Stripe account can hold customers created by other
// experiments, and a webhook that 500s on those would retry forever.
async function resellerIdForCustomer(admin: Admin, customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await admin
    .from('resellers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function resellerForSubscription(
  admin: Admin,
  subscriptionId: string | null
): Promise<{ id: string; name: string; email: string } | null> {
  if (!subscriptionId) return null;
  const { data } = await admin
    .from('resellers')
    .select('id, name, email')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id as string, name: data.name as string, email: data.email as string };
}

// ============================================================
// Subscription lifecycle
// ============================================================

// In the Basil API the billing period moved off the Subscription and
// onto each SubscriptionItem. Reading subscription.current_period_end
// (which is what every older tutorial does) now yields undefined, and
// the mirror silently stores nulls instead of erroring — worth the
// explicit helper so the next person does not have to rediscover it.
function periodOf(subscription: Stripe.Subscription): { start: string | null; end: string | null } {
  const item = subscription.items?.data?.[0];
  return { start: toIso(item?.current_period_start), end: toIso(item?.current_period_end) };
}

async function mirrorSubscription(admin: Admin, subscription: Stripe.Subscription): Promise<void> {
  const customerId = idOf(subscription.customer as string | Stripe.Customer);
  const resellerId = await resellerIdForCustomer(admin, customerId);
  if (!resellerId || !customerId) return;

  const item = subscription.items?.data?.[0];
  const period = periodOf(subscription);

  // `past_due` is handled explicitly rather than being just another
  // status string: it is the only state where the rep has to DO
  // something, so the panel needs to know when it started in order to
  // say "van N días". Clearing it the moment Stripe reports any healthy
  // status is what makes a recovered payment actually remove the banner.
  const healthy = subscription.status === 'active' || subscription.status === 'trialing';

  const { data: existing } = await admin
    .from('reseller_subscriptions')
    .select('past_due_since')
    .eq('reseller_id', resellerId)
    .maybeSingle();

  const pastDueSince =
    subscription.status === 'past_due' || subscription.status === 'unpaid'
      ? ((existing?.past_due_since as string | null) ?? new Date().toISOString())
      : healthy
        ? null
        : ((existing?.past_due_since as string | null) ?? null);

  await admin.from('reseller_subscriptions').upsert(
    {
      reseller_id: resellerId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      stripe_price_id: item?.price?.id ?? null,
      stripe_item_id: item?.id ?? null,
      status: subscription.status,
      quantity: item?.quantity ?? 0,
      unit_amount_cents: item?.price?.unit_amount ?? 0,
      currency: (item?.price?.currency ?? subscription.currency ?? 'mxn').toLowerCase(),
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      canceled_at: toIso(subscription.canceled_at),
      past_due_since: pastDueSince,
    },
    { onConflict: 'reseller_id' }
  );

  // Keep the pointer on `resellers` in step. It is what every other
  // lookup in the app keys off, so letting it drift from the mirror
  // would mean two answers to "which subscription is this rep on".
  await admin
    .from('resellers')
    .update({ stripe_subscription_id: subscription.id })
    .eq('id', resellerId);
}

async function handleSubscriptionDeleted(admin: Admin, subscription: Stripe.Subscription): Promise<void> {
  const resellerId = await resellerIdForCustomer(
    admin,
    idOf(subscription.customer as string | Stripe.Customer)
  );
  if (!resellerId) return;

  await admin
    .from('reseller_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: toIso(subscription.canceled_at) ?? new Date().toISOString(),
      cancel_at_period_end: false,
    })
    .eq('reseller_id', resellerId);

  // The pointer is cleared so the panel offers "activar suscripción"
  // again instead of trying to update a subscription Stripe has already
  // thrown away. The mirror row stays for history.
  await admin.from('resellers').update({ stripe_subscription_id: null }).eq('id', resellerId);
}

// ============================================================
// Invoices
// ============================================================

// Basil moved the subscription reference under invoice.parent. Same
// story as the billing period above: the old top-level field is simply
// absent now, so reading it returns undefined instead of failing.
function subscriptionIdOfInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (parent?.type !== 'subscription_details') return null;
  return idOf(parent.subscription_details?.subscription ?? null);
}

function paymentIntentIdOfInvoice(invoice: Stripe.Invoice): string | null {
  const payment = invoice.payments?.data?.[0]?.payment;
  if (!payment) return null;
  return idOf(payment.payment_intent ?? null);
}

async function recordInvoice(
  admin: Admin,
  invoice: Stripe.Invoice,
  extra: { failureMessage?: string | null }
): Promise<{ resellerId: string; amountMxn: number } | null> {
  if (!invoice.id) return null;

  const resellerId = await resellerIdForCustomer(
    admin,
    idOf(invoice.customer as string | Stripe.Customer | null)
  );
  if (!resellerId) return null;

  // Quantity and unit price come off the invoice line, not off the
  // subscription as it is right now: an invoice must keep saying what it
  // charged for even after the rep gains or loses a business.
  const line = invoice.lines?.data?.[0];

  await admin.from('reseller_charges').upsert(
    {
      reseller_id: resellerId,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: paymentIntentIdOfInvoice(invoice),
      status: invoice.status ?? 'open',
      amount_due_cents: invoice.amount_due ?? 0,
      amount_paid_cents: invoice.amount_paid ?? 0,
      currency: (invoice.currency ?? 'mxn').toLowerCase(),
      quantity: line?.quantity ?? null,
      unit_amount_cents: line?.pricing?.unit_amount_decimal
        ? Math.round(Number(line.pricing.unit_amount_decimal))
        : null,
      period_start: toIso(invoice.period_start),
      period_end: toIso(invoice.period_end),
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf_url: invoice.invoice_pdf ?? null,
      failure_message: extra.failureMessage ?? null,
    },
    { onConflict: 'stripe_invoice_id' }
  );

  return { resellerId, amountMxn: centavosToPesos(invoice.amount_due ?? 0) };
}

async function handleInvoicePaid(admin: Admin, invoice: Stripe.Invoice): Promise<void> {
  const recorded = await recordInvoice(admin, invoice, { failureMessage: null });
  if (!recorded) return;

  // A successful payment is what ends dunning. Doing it here as well as
  // in mirrorSubscription is deliberate: customer.subscription.updated
  // and invoice.paid arrive in an order Stripe does not promise, and the
  // banner must not survive a payment that already went through.
  await admin
    .from('reseller_subscriptions')
    .update({ past_due_since: null })
    .eq('reseller_id', recorded.resellerId);
}

async function handleInvoicePaymentFailed(admin: Admin, invoice: Stripe.Invoice): Promise<void> {
  const failureMessage = invoice.last_finalization_error?.message ?? null;
  const recorded = await recordInvoice(admin, invoice, { failureMessage });
  if (!recorded) return;

  const now = new Date().toISOString();
  const { data: mirror } = await admin
    .from('reseller_subscriptions')
    .select('past_due_since')
    .eq('reseller_id', recorded.resellerId)
    .maybeSingle();

  await admin
    .from('reseller_subscriptions')
    .update({
      status: 'past_due',
      past_due_since: (mirror?.past_due_since as string | null) ?? now,
    })
    .eq('reseller_id', recorded.resellerId);

  // The dunning path. next_payment_attempt being null means Stripe has
  // given up retrying, which is the difference between "heads up" and
  // "this is now cancelled" — two very different emails.
  const { data: reseller } = await admin
    .from('resellers')
    .select('name, email')
    .eq('id', recorded.resellerId)
    .maybeSingle();

  if (reseller?.email) {
    await sendResellerDunning({
      email: reseller.email as string,
      name: (reseller.name as string) ?? '',
      amountMxn: recorded.amountMxn,
      stage: invoice.next_payment_attempt ? 'first_failure' : 'final_notice',
      panelUrl: resellerSubscriptionUrl(),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    });
  }
}

// ============================================================
// Charges: the network transaction id, refunds and disputes
// ============================================================

async function handleChargeSucceeded(admin: Admin, charge: Stripe.Charge): Promise<void> {
  const resellerId = await resellerIdForCustomer(
    admin,
    idOf(charge.customer as string | Stripe.Customer | null)
  );
  if (!resellerId) return;

  await admin
    .from('reseller_charges')
    .update({ stripe_charge_id: charge.id })
    .eq('stripe_payment_intent_id', idOf(charge.payment_intent as string | Stripe.PaymentIntent | null));

  // The card networks' Trace ID for this authorisation. It only exists
  // once a real charge settles, which is why it is captured here and not
  // at card-setup time. Every later renewal is a merchant-initiated
  // transaction and has to reference it; Stripe sends it automatically
  // while it owns the mandate, and persisting it is what makes the chain
  // provable (and portable) afterwards.
  const networkTransactionId = charge.payment_method_details?.card?.network_transaction_id ?? null;
  const paymentMethodId = charge.payment_method;

  if (networkTransactionId && paymentMethodId) {
    await admin
      .from('reseller_payment_methods')
      .update({ network_transaction_id: networkTransactionId })
      .eq('reseller_id', resellerId)
      .eq('stripe_payment_method_id', paymentMethodId)
      .is('network_transaction_id', null);
  }
}

async function handleChargeRefunded(admin: Admin, charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = idOf(charge.payment_intent as string | Stripe.PaymentIntent | null);
  if (!paymentIntentId) return;

  await admin
    .from('reseller_charges')
    .update({
      amount_refunded_cents: charge.amount_refunded ?? 0,
      stripe_charge_id: charge.id,
    })
    .eq('stripe_payment_intent_id', paymentIntentId);
}

async function handleDisputeCreated(admin: Admin, dispute: Stripe.Dispute): Promise<void> {
  const chargeId = idOf(dispute.charge as string | Stripe.Charge);
  if (!chargeId) return;

  // A disputed charge is not a refunded charge and must never be shown
  // as one: the money is held, not returned, and the outcome can still
  // go either way.
  await admin
    .from('reseller_charges')
    .update({ disputed_at: new Date().toISOString() })
    .eq('stripe_charge_id', chargeId);
}

// ============================================================
// Saved cards
// ============================================================

// Rule 12: brand, last four and expiry only. There is nowhere in this
// function, or in the table it writes to, for a PAN or a CVV — the card
// itself never leaves Stripe.
async function upsertPaymentMethod(
  admin: Admin,
  paymentMethod: Stripe.PaymentMethod,
  opts: { makeDefault: boolean }
): Promise<void> {
  const resellerId = await resellerIdForCustomer(
    admin,
    idOf(paymentMethod.customer as string | Stripe.Customer | null)
  );
  if (!resellerId) return;

  if (opts.makeDefault) {
    await admin
      .from('reseller_payment_methods')
      .update({ is_default: false })
      .eq('reseller_id', resellerId);
  }

  await admin.from('reseller_payment_methods').upsert(
    {
      reseller_id: resellerId,
      stripe_payment_method_id: paymentMethod.id,
      is_default: opts.makeDefault,
      brand: paymentMethod.card?.brand ?? null,
      last4: paymentMethod.card?.last4 ?? null,
      exp_month: paymentMethod.card?.exp_month ?? null,
      exp_year: paymentMethod.card?.exp_year ?? null,
    },
    { onConflict: 'stripe_payment_method_id' }
  );
}

async function handleSetupIntentSucceeded(admin: Admin, setupIntent: Stripe.SetupIntent): Promise<void> {
  const paymentMethodId = idOf(setupIntent.payment_method as string | Stripe.PaymentMethod | null);
  const customerId = idOf(setupIntent.customer as string | Stripe.Customer | null);
  if (!paymentMethodId || !customerId) return;

  const stripe = getStripe();
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  await upsertPaymentMethod(admin, paymentMethod, { makeDefault: true });
}

// ============================================================
// The handler
// ============================================================

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // 500 on purpose: Stripe retries, so a deploy that forgot the secret
    // recovers on its own once the variable is set, instead of silently
    // dropping every event in the meantime.
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set');
    return new Response('webhook not configured', { status: 500 });
  }

  // Rule 10, cheap half: refuse before buffering anything.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return new Response('payload too large', { status: 413 });
  }

  const signature = request.headers.get('stripe-signature');

  // Rule 5: the exact bytes Stripe sent. request.json() here would parse
  // and re-serialise the body, the HMAC would then be computed over
  // different bytes than Stripe signed, and every single event would
  // look forged — a failure that reads like a wrong secret and costs
  // hours.
  const rawBody = await request.text();

  // Rule 10, honest half: Content-Length is attacker-controlled, so the
  // real cap is on what actually arrived.
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return new Response('payload too large', { status: 413 });
  }

  // Rule 3 + Rule 9. Verified BEFORE anything parses the body. The
  // secret used here is STRIPE_WEBHOOK_SECRET (whsec_...), never
  // STRIPE_SECRET_KEY: verifying with the API key fails on every event
  // and looks exactly like an attack.
  const verified = verifyStripeSignature({
    rawBody,
    signatureHeader: signature,
    secret: webhookSecret,
    toleranceSeconds: WEBHOOK_TOLERANCE_SECONDS,
  });

  if (!verified.ok) {
    // The reason is logged, the body is not. 400 rather than 500 because
    // a forged request should not make Stripe retry.
    console.warn(`[stripe-webhook] rejected signature reason=${verified.reason}`);
    return new Response('invalid signature', { status: 400 });
  }

  // Canonical parse. constructEvent re-verifies and is the authority on
  // turning the raw bytes into a typed event; if it ever disagrees with
  // the check above, the request is rejected rather than reconciled.
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature as string, webhookSecret);
  } catch (error) {
    console.warn(
      `[stripe-webhook] constructEvent rejected: ${error instanceof Error ? error.name : 'unknown'}`
    );
    return new Response('invalid signature', { status: 400 });
  }

  const admin = createAdminClient();

  // Rule 9, second half. The timestamp window stops a replay from
  // yesterday; it does nothing about the retries Stripe itself sends
  // when this endpoint is slow, and those carry the SAME event id. The
  // unique index on (provider, event_id) IS the check: winning the
  // insert is what grants the right to process.
  const { error: claimError } = await admin.from('webhook_events_processed').insert({
    provider: 'stripe',
    event_id: event.id,
    event_type: event.type,
    event_created_at: new Date(event.created * 1000).toISOString(),
  });

  if (claimError) {
    // 23505 = unique_violation: somebody already has this event.
    if (claimError.code === '23505') {
      logEvent(event, 'duplicate, skipped');
      return Response.json({ received: true, duplicate: true });
    }
    // Anything else means the dedup table is unreachable, and processing
    // without it risks double-charging. Let Stripe retry.
    console.error(`[stripe-webhook] dedup insert failed code=${claimError.code}`);
    return new Response('dedup unavailable', { status: 500 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        // Covers past_due, unpaid, paused and cancel_at_period_end in
        // one place — the status is mirrored verbatim and the panel
        // reads it from there.
        await mirrorSubscription(admin, event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(admin, event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(admin, event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(admin, event.data.object);
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(admin, event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(admin, event.data.object);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(admin, event.data.object);
        break;

      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(admin, event.data.object);
        break;

      case 'payment_method.attached':
        await upsertPaymentMethod(admin, event.data.object, { makeDefault: false });
        break;

      case 'payment_method.automatically_updated':
        // The card networks pushed a new expiry or number to Stripe.
        // Refreshing the stored metadata is what keeps the panel from
        // telling a rep their card expired when it did not.
        await upsertPaymentMethod(admin, event.data.object, { makeDefault: false });
        break;

      case 'payment_method.detached':
        await admin
          .from('reseller_payment_methods')
          .delete()
          .eq('stripe_payment_method_id', event.data.object.id);
        break;

      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        // Subscribed to because they are part of the provider's minimum
        // event set and because they are the first signal in the Stripe
        // dashboard when something is wrong. The money itself is
        // recorded from the invoice events above, which carry the period
        // and the line items; acting on the PaymentIntent too would
        // write the same charge twice.
        logEvent(event, 'acknowledged (money is recorded from invoice.* events)');
        break;

      default:
        // Rule 14: default only logs. It must never fulfil anything —
        // any event type Stripe adds later lands here, including ones
        // this handler was never designed for.
        // TODO: if a new event type shows up in these logs and needs
        // real handling, add an explicit `case` above rather than
        // widening this branch.
        logEvent(event, 'unhandled event type');
        break;
    }
  } catch (error) {
    // Release the claim so Stripe's retry can actually reprocess. Without
    // this, one transient Postgres error would mark the event done
    // forever and the charge would never be recorded.
    await admin.from('webhook_events_processed').delete().eq('event_id', event.id);
    console.error(
      `[stripe-webhook] handler failed id=${event.id} type=${event.type}: ` +
        (error instanceof Error ? error.message : 'unknown error')
    );
    return new Response('handler error', { status: 500 });
  }

  logEvent(event, 'processed');
  return Response.json({ received: true });
}
