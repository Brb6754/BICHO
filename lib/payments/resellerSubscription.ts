import 'server-only';
import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  BILLING_CURRENCY,
  PRORATION_BEHAVIOR,
  getStripe,
  isStripeConfigured,
  nextBillingAnchor,
  pesosToCentavos,
} from '@/lib/payments/stripe';
import { toPaymentError, describeForLog } from '@/lib/payments/errors';

// The one place that decides what a sales rep owes bicho.
//
// THE MODEL, once, so nothing downstream has to infer it: the charge is
//     (number of that rep's ACTIVE businesses) x resellers.wholesale_price_mxn
// billed monthly on resellers.billing_day. Nobody else is billed —
// not the business, not the person booking an appointment. The business
// pays the rep directly, off-platform, and that money never touches this
// system.
//
// In Stripe that is one subscription on a licensed (per-unit) monthly
// price, where `quantity` is the active-business count. The count moves
// constantly — a business goes live, gets suspended, changes rep — so
// the quantity is not a number this code maintains. It is a number this
// code RECOMPUTES from Postgres and sends to Stripe, every time,
// idempotently. See syncResellerSubscriptionQuantity.

type Admin = ReturnType<typeof createAdminClient>;

// db/016: tenants.status is checked against these four, and only the
// third one costs the rep money. A business in trial, suspended or
// cancelled is billed to nobody.
const BILLABLE_TENANT_STATUS = 'active';

export type SyncResult =
  | { ok: true; quantity: number; changed: boolean; note?: string }
  | { ok: false; reason: SyncSkipReason; message: string };

export type SyncSkipReason =
  | 'not_configured'
  | 'no_subscription'
  | 'missing_reseller'
  | 'stripe_error';

type ResellerRow = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  wholesale_price_mxn: number;
  billing_day: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const RESELLER_COLUMNS =
  'id, name, email, active, wholesale_price_mxn, billing_day, stripe_customer_id, stripe_subscription_id';

// ============================================================
// Idempotency (Rule 4)
// ============================================================

// A fresh cryptographic UUID per attempt, recorded in idempotency_keys
// before the call goes out so a crash mid-flight leaves a trace.
//
// Why a NEW key each time rather than one derived from the reseller id:
// an idempotency key answers "is this the same submission I already
// sent", not "is this the same desired state". Deriving it from the
// subject would make Stripe replay the FIRST response forever — a rep
// who goes from 3 businesses to 4 would keep being billed for 3, and the
// bug would look like Stripe ignoring us.
//
// Never Math.random(), never Date.now(), never a concatenated string.
async function withIdempotencyKey<T>(
  admin: Admin,
  operation: string,
  subjectId: string,
  fn: (idempotencyKey: string) => Promise<T>,
  refOf: (result: T) => string | null
): Promise<T> {
  const idempotencyKey = randomUUID();

  await admin.from('idempotency_keys').insert({
    key: idempotencyKey,
    operation,
    subject_id: subjectId,
    status: 'pending',
  });

  try {
    const result = await fn(idempotencyKey);
    await admin
      .from('idempotency_keys')
      .update({ status: 'succeeded', result_ref: refOf(result) })
      .eq('key', idempotencyKey);
    return result;
  } catch (error) {
    const mapped = toPaymentError(error);
    await admin
      .from('idempotency_keys')
      .update({ status: 'failed', error_message: `${mapped.code}${mapped.declineCode ? `:${mapped.declineCode}` : ''}` })
      .eq('key', idempotencyKey);
    throw error;
  }
}

// ============================================================
// The count
// ============================================================

/**
 * How many businesses this rep is billed for, straight from Postgres.
 *
 * `head: true` with an exact count: the rows themselves are never
 * needed, only how many there are, and pulling them would get slower
 * exactly as a rep gets more successful.
 */
export async function countActiveBusinesses(admin: Admin, resellerId: string): Promise<number> {
  const { count, error } = await admin
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('reseller_id', resellerId)
    .eq('status', BILLABLE_TENANT_STATUS);

  if (error) throw new Error(`No se pudo contar los negocios activos: ${error.message}`);
  return count ?? 0;
}

// ============================================================
// Price
// ============================================================

/**
 * The monthly per-unit price, in centavos, for a given wholesale price.
 *
 * Prices are immutable in Stripe, so a rep's price change means a NEW
 * Price object, not an edit. Rather than storing a price id per rep and
 * hunting for drift, the price is addressed by a deterministic
 * lookup_key built from the amount: two reps on the same wholesale price
 * share one Price, and a rep whose price changes simply moves to the
 * Price for the new amount.
 *
 * The product is created inline the first time an amount is used, so
 * there is no STRIPE_PRODUCT_ID to configure and forget.
 */
async function ensureMonthlyPrice(
  stripe: Stripe,
  unitAmountCents: number,
  idempotencyKey: string
): Promise<Stripe.Price> {
  const lookupKey = `bicho_reseller_mxn_${unitAmountCents}`;

  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0];

  try {
    return await stripe.prices.create(
      {
        currency: BILLING_CURRENCY,
        // Centavos. The conversion from whole pesos happened in
        // pesosToCentavos() and must not be repeated here.
        unit_amount: unitAmountCents,
        recurring: { interval: 'month' },
        lookup_key: lookupKey,
        nickname: `Mayoreo bicho — ${unitAmountCents / 100} MXN por negocio activo`,
        product_data: { name: 'bicho — negocio activo (mayoreo)' },
      },
      { idempotencyKey }
    );
  } catch (error) {
    // Two deploys racing on a brand-new amount: whoever loses re-reads
    // the winner's price instead of failing the whole sync.
    const retry = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    if (retry.data[0]) return retry.data[0];
    throw error;
  }
}

// ============================================================
// Customer
// ============================================================

/**
 * The Stripe customer for a rep. The customer IS the rep — there is no
 * other payer in this model.
 *
 * Rule 11: only what billing actually needs (name, email, and the
 * reseller id in metadata so a Stripe-side investigation can find its
 * way back). No address, no tax id, no phone.
 */
export async function ensureStripeCustomer(admin: Admin, reseller: ResellerRow): Promise<string> {
  if (reseller.stripe_customer_id) return reseller.stripe_customer_id;

  const stripe = getStripe();

  const customer = await withIdempotencyKey(
    admin,
    'reseller_customer.create',
    reseller.id,
    (idempotencyKey) =>
      stripe.customers.create(
        {
          name: reseller.name,
          email: reseller.email,
          metadata: { reseller_id: reseller.id, app: 'bicho' },
        },
        { idempotencyKey }
      ),
    (result) => result.id
  );

  const { error } = await admin
    .from('resellers')
    .update({ stripe_customer_id: customer.id })
    .eq('id', reseller.id);

  if (error) throw new Error(`No se pudo guardar el cliente de Stripe: ${error.message}`);
  return customer.id;
}

// ============================================================
// The resync — the heart of this file
// ============================================================

/**
 * Bring Stripe in line with the database. Idempotent, safe to call as
 * often as you like, and the ONLY way the quantity is ever changed.
 *
 * It recomputes the active-business count with a fresh `count(*)` every
 * single time and PUTs the result. It never adds one, never subtracts
 * one, never trusts the number it stored last time — a single dropped
 * webhook or a failed action would otherwise drift the bill permanently,
 * and the drift would be invisible until a rep complained.
 *
 * Never throws. Every call site is a Server Action that is doing
 * something else important (activating a business, moving it to another
 * rep); billing must not be able to fail that operation.
 */
export async function syncResellerSubscriptionQuantity(resellerId: string): Promise<SyncResult> {
  if (!isStripeConfigured()) {
    return { ok: false, reason: 'not_configured', message: 'Stripe no está configurado en este ambiente.' };
  }

  const admin = createAdminClient();

  try {
    const { data, error } = await admin
      .from('resellers')
      .select(RESELLER_COLUMNS)
      .eq('id', resellerId)
      .maybeSingle();

    if (error || !data) {
      return { ok: false, reason: 'missing_reseller', message: 'No se encontró el vendedor.' };
    }
    const reseller = data as unknown as ResellerRow;

    if (!reseller.stripe_subscription_id) {
      // Perfectly normal: the rep has not entered a card yet. The count
      // still has to be right the moment they do, and it will be,
      // because it is computed at creation time from the same query.
      return {
        ok: false,
        reason: 'no_subscription',
        message: 'Este vendedor todavía no tiene suscripción activa.',
      };
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(reseller.stripe_subscription_id);

    // A subscription Stripe has already thrown away cannot be updated.
    // Reactivating means creating a new one, which is a deliberate act
    // by the rep (they re-enter a card), not something a tenant status
    // change should trigger behind their back.
    if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      return {
        ok: false,
        reason: 'no_subscription',
        message: 'La suscripción de este vendedor está cancelada en Stripe.',
      };
    }

    const item = subscription.items.data[0];
    if (!item) {
      return { ok: false, reason: 'stripe_error', message: 'La suscripción no tiene ninguna línea.' };
    }

    const quantity = await countActiveBusinesses(admin, resellerId);

    // THE UNIT CONVERSION. resellers.wholesale_price_mxn is in WHOLE
    // PESOS; MXN has ISO 4217 exponent 2, so Stripe wants centavos.
    // pesosToCentavos() is the only place the x100 exists.
    const unitAmountCents = pesosToCentavos(reseller.wholesale_price_mxn);
    const priceChanged = item.price.unit_amount !== unitAmountCents;

    // db/016 has an `active` flag the internal team uses to switch a rep
    // off. A switched-off rep must not keep paying: their subscription
    // is set to end at the period they already paid for rather than
    // being cancelled on the spot, because cancelling immediately would
    // either strand a paid period or require a refund nobody asked for.
    // Turning them back on clears the flag, which is why this is set on
    // every sync instead of only on the transition.
    const shouldCancelAtPeriodEnd = !reseller.active;

    const nothingToDo =
      item.quantity === quantity &&
      !priceChanged &&
      subscription.cancel_at_period_end === shouldCancelAtPeriodEnd &&
      // `pause_collection` is set below when the count hits zero.
      Boolean(subscription.pause_collection) === (quantity === 0);

    if (nothingToDo) {
      await mirrorLocal(admin, resellerId, subscription, quantity, unitAmountCents, reseller.billing_day);
      return { ok: true, quantity, changed: false };
    }

    const priceId = priceChanged
      ? (await withIdempotencyKey(
          admin,
          'reseller_price.ensure',
          resellerId,
          (key) => ensureMonthlyPrice(stripe, unitAmountCents, key),
          (price) => price.id
        )).id
      : item.price.id;

    const updated = await withIdempotencyKey(
      admin,
      'reseller_subscription.quantity',
      resellerId,
      (idempotencyKey) =>
        stripe.subscriptions.update(
          subscription.id,
          {
            items: [{ id: item.id, price: priceId, quantity }],
            // The owner's proration policy, written down once in
            // lib/payments/stripe.ts: a mid-month change is recorded and
            // settled on the NEXT renewal invoice, never charged on the
            // spot.
            proration_behavior: PRORATION_BEHAVIOR,
            cancel_at_period_end: shouldCancelAtPeriodEnd,
            // A rep with zero active businesses owes zero. Pausing with
            // `void` means Stripe still advances the cycle but throws
            // away the invoice instead of issuing a 0 MXN one; clearing
            // the pause the moment a business goes active resumes normal
            // billing with no further action.
            pause_collection: quantity === 0 ? { behavior: 'void' } : null,
          },
          { idempotencyKey }
        ),
      (result) => result.id
    );

    await mirrorLocal(admin, resellerId, updated, quantity, unitAmountCents, reseller.billing_day);

    return {
      ok: true,
      quantity,
      changed: true,
      note: priceChanged ? 'También se actualizó el precio mayorista.' : undefined,
    };
  } catch (error) {
    const mapped = toPaymentError(error);
    // Rule 6: the code, never the Stripe object (which carries the full
    // request payload, including customer details).
    console.error(describeForLog(mapped, `resync quantity reseller=${resellerId}`));
    return { ok: false, reason: 'stripe_error', message: mapped.message };
  }
}

/** Keeps reseller_subscriptions honest between webhooks. */
async function mirrorLocal(
  admin: Admin,
  resellerId: string,
  subscription: Stripe.Subscription,
  quantity: number,
  unitAmountCents: number,
  billingDay: number
): Promise<void> {
  const item = subscription.items.data[0];
  await admin.from('reseller_subscriptions').upsert(
    {
      reseller_id: resellerId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripe_price_id: item?.price?.id ?? null,
      stripe_item_id: item?.id ?? null,
      status: subscription.status,
      quantity,
      unit_amount_cents: unitAmountCents,
      currency: BILLING_CURRENCY,
      billing_day: billingDay,
      current_period_start: item?.current_period_start
        ? new Date(item.current_period_start * 1000).toISOString()
        : null,
      current_period_end: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    },
    { onConflict: 'reseller_id' }
  );
}

// ============================================================
// Call-site helpers
// ============================================================

/**
 * Resync from a tenant id rather than a rep id.
 *
 * Used by setTenantStatus: the thing that changed is a business, and the
 * caller should not have to know which rep it belongs to (or remember
 * that a business with reseller_id IS NULL generates no charge and needs
 * no sync at all).
 */
export async function syncSubscriptionForTenant(tenantId: string): Promise<SyncResult> {
  const admin = createAdminClient();
  const { data } = await admin.from('tenants').select('reseller_id').eq('id', tenantId).maybeSingle();

  const resellerId = (data?.reseller_id as string | null) ?? null;
  if (!resellerId) {
    // A business that came in directly bills nobody today. Skipping is
    // the correct answer, not an error to surface.
    return { ok: false, reason: 'no_subscription', message: 'Este negocio no tiene vendedor.' };
  }
  return syncResellerSubscriptionQuantity(resellerId);
}

/**
 * Both sides of a reassignment.
 *
 * Moving a business from one rep to another changes TWO bills: the old
 * rep stops paying for it and the new one starts. Syncing only the new
 * rep is the obvious bug here, and it overcharges the person who no
 * longer has the business — which is the version of this bug that
 * nobody notices until they complain.
 */
export async function syncBothSidesOfReassignment(
  previousResellerId: string | null,
  nextResellerId: string | null
): Promise<void> {
  const ids = Array.from(new Set([previousResellerId, nextResellerId].filter(Boolean) as string[]));
  await Promise.all(ids.map((id) => syncResellerSubscriptionQuantity(id)));
}

// ============================================================
// Creating the subscription
// ============================================================

export type ActivationResult =
  | { ok: true; subscriptionId: string; quantity: number }
  | { ok: false; error: string };

/**
 * Turn a saved card into a live subscription.
 *
 * Called after the rep has completed the SetupIntent, so there is
 * already a default payment method on the customer. Nothing is charged
 * at this moment: billing_cycle_anchor points at the rep's next
 * billing_day, and the partial period between now and then is prorated
 * onto that first invoice rather than collected today.
 */
export async function activateResellerSubscription(resellerId: string): Promise<ActivationResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: 'Stripe no está configurado en este ambiente.' };
  }

  const admin = createAdminClient();

  try {
    const { data, error } = await admin
      .from('resellers')
      .select(RESELLER_COLUMNS)
      .eq('id', resellerId)
      .maybeSingle();

    if (error || !data) return { ok: false, error: 'No se encontró el vendedor.' };
    const reseller = data as unknown as ResellerRow;

    const stripe = getStripe();

    // Already has one? Then this is a retry (or a second tab), and the
    // right answer is to reconcile rather than create a second
    // subscription for the same person.
    if (reseller.stripe_subscription_id) {
      const existing = await stripe.subscriptions.retrieve(reseller.stripe_subscription_id);
      if (existing.status !== 'canceled' && existing.status !== 'incomplete_expired') {
        const synced = await syncResellerSubscriptionQuantity(resellerId);
        return {
          ok: true,
          subscriptionId: existing.id,
          quantity: synced.ok ? synced.quantity : (existing.items.data[0]?.quantity ?? 0),
        };
      }
    }

    const customerId = await ensureStripeCustomer(admin, reseller);

    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethod =
      !('deleted' in customer) && customer.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethod) {
      return { ok: false, error: 'Todavía no hay una tarjeta guardada. Registra una primero.' };
    }

    const quantity = await countActiveBusinesses(admin, resellerId);
    const unitAmountCents = pesosToCentavos(reseller.wholesale_price_mxn);

    const price = await withIdempotencyKey(
      admin,
      'reseller_price.ensure',
      resellerId,
      (key) => ensureMonthlyPrice(stripe, unitAmountCents, key),
      (result) => result.id
    );

    const subscription = await withIdempotencyKey(
      admin,
      'reseller_subscription.create',
      resellerId,
      (idempotencyKey) =>
        stripe.subscriptions.create(
          {
            customer: customerId,
            items: [{ price: price.id, quantity }],
            // resellers.billing_day -> the next occurrence of that day.
            // Always in the future, because an anchor in the past makes
            // Stripe bill immediately.
            billing_cycle_anchor: nextBillingAnchor(reseller.billing_day),
            proration_behavior: PRORATION_BEHAVIOR,
            // The renewals are merchant-initiated: nobody is at a
            // keyboard when they run.
            off_session: true,
            // The card is already saved and confirmed by the SetupIntent,
            // so a failure here is a real failure worth surfacing now
            // rather than an "incomplete" subscription the rep never
            // hears about again.
            payment_behavior: 'error_if_incomplete',
            collection_method: 'charge_automatically',
            default_payment_method:
              typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id,
            metadata: { reseller_id: resellerId, app: 'bicho' },
          },
          { idempotencyKey }
        ),
      (result) => result.id
    );

    // pause_collection is not a create parameter, only an update one, so
    // a rep who signs up with zero active businesses is paused a beat
    // later. Harmless: the first invoice is not due until their billing
    // day, which is days or weeks away.
    if (quantity === 0) {
      await stripe.subscriptions.update(subscription.id, { pause_collection: { behavior: 'void' } });
    }

    const { error: pointerError } = await admin
      .from('resellers')
      .update({ stripe_subscription_id: subscription.id })
      .eq('id', resellerId);

    if (pointerError) {
      // The subscription exists in Stripe but this database does not
      // know about it — the one failure here that can actually cost the
      // rep money, so it is loud.
      console.error(
        `[payments] subscription ${subscription.id} created but not linked to reseller ${resellerId}: ${pointerError.message}`
      );
    }

    await mirrorLocal(admin, resellerId, subscription, quantity, unitAmountCents, reseller.billing_day);

    return { ok: true, subscriptionId: subscription.id, quantity };
  } catch (error) {
    const mapped = toPaymentError(error);
    console.error(describeForLog(mapped, `activate subscription reseller=${resellerId}`));
    return { ok: false, error: mapped.message };
  }
}
