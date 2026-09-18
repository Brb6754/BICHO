'use server';

import { revalidatePath } from 'next/cache';
import { requireReseller } from '@/lib/auth/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, isStripeConfigured } from '@/lib/payments/stripe';
import { toPaymentError, describeForLog } from '@/lib/payments/errors';
import {
  activateResellerSubscription,
  ensureStripeCustomer,
  syncResellerSubscriptionQuantity,
} from '@/lib/payments/resellerSubscription';

// The rep's own payment screen. Every action starts with
// requireReseller() and then only ever touches THAT rep's row — a
// Server Action is a reachable POST endpoint, so "the id came from my
// own page" is not a permission check.
//
// Rule 12: none of this ever sees a card number. The browser sends the
// card straight to Stripe through the Payment Element; what comes back
// here is a SetupIntent id, and even that is re-read from Stripe rather
// than trusted.

const RESELLER_COLUMNS = 'id, name, email, active, wholesale_price_mxn, billing_day, stripe_customer_id, stripe_subscription_id';

/**
 * Step 1 — open a card-collection session.
 *
 * A SetupIntent, not a PaymentIntent: saving the card must not move any
 * money. The charge happens later, unattended, on the rep's billing day.
 * `usage: 'off_session'` is what tells the card network this credential
 * is being stored for merchant-initiated charges, and it is what makes
 * the later renewals authorise instead of getting soft-declined.
 */
export async function startCardSetup(): Promise<
  { ok: true; clientSecret: string } | { ok: false; error: string }
> {
  const actor = await requireReseller();

  if (!isStripeConfigured()) {
    return { ok: false, error: 'Los pagos todavía no están configurados. Avísale al equipo de bicho.' };
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('resellers')
      .select(RESELLER_COLUMNS)
      .eq('id', actor.resellerId)
      .maybeSingle();

    if (!data) return { ok: false, error: 'No encontramos tu registro de vendedor.' };

    const customerId = await ensureStripeCustomer(admin, data as never);

    const setupIntent = await getStripe().setupIntents.create({
      customer: customerId,
      // Only cards: the required method for this integration. Leaving it
      // to automatic methods would surface OXXO/SPEI in the Element,
      // which cannot back a recurring subscription and would strand the
      // rep on a step that can never succeed.
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { reseller_id: actor.resellerId, app: 'bicho' },
    });

    if (!setupIntent.client_secret) {
      return { ok: false, error: 'Stripe no devolvió una sesión válida. Vuelve a intentar.' };
    }

    return { ok: true, clientSecret: setupIntent.client_secret };
  } catch (error) {
    const mapped = toPaymentError(error);
    console.error(describeForLog(mapped, `startCardSetup reseller=${actor.resellerId}`));
    return { ok: false, error: mapped.message };
  }
}

/**
 * Step 2 — the card is saved; make it the one we charge.
 *
 * The client hands over a SetupIntent id after the Payment Element
 * confirms. It is NOT taken at face value: the intent is re-read from
 * Stripe and its `customer` has to match this rep's own customer id.
 * Without that check, a rep could pass someone else's seti_ id and
 * attach a stranger's card to their subscription.
 *
 * Handles both jobs the screen needs — first-time activation and
 * replacing an expired card — because from here they are the same two
 * steps: set the default payment method, then make sure a healthy
 * subscription exists.
 */
export async function finishCardSetup(
  setupIntentId: string
): Promise<{ ok: true; activated: boolean } | { ok: false; error: string }> {
  const actor = await requireReseller();

  if (!isStripeConfigured()) {
    return { ok: false, error: 'Los pagos todavía no están configurados.' };
  }

  try {
    const admin = createAdminClient();
    const { data: reseller } = await admin
      .from('resellers')
      .select(RESELLER_COLUMNS)
      .eq('id', actor.resellerId)
      .maybeSingle();

    if (!reseller?.stripe_customer_id) {
      return { ok: false, error: 'No encontramos tu cliente de Stripe. Vuelve a empezar.' };
    }

    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    const intentCustomer =
      typeof setupIntent.customer === 'string' ? setupIntent.customer : setupIntent.customer?.id;

    if (intentCustomer !== reseller.stripe_customer_id) {
      // Someone passed an id that is not theirs.
      console.warn(`[payments] setup intent ownership mismatch reseller=${actor.resellerId}`);
      return { ok: false, error: 'Esa sesión de pago no es tuya.' };
    }

    if (setupIntent.status !== 'succeeded') {
      return { ok: false, error: 'La tarjeta todavía no quedó confirmada. Vuelve a intentar.' };
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

    if (!paymentMethodId) {
      return { ok: false, error: 'Stripe no devolvió la tarjeta guardada. Vuelve a intentar.' };
    }

    // The customer-level default is what a NEW subscription picks up.
    await stripe.customers.update(reseller.stripe_customer_id as string, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Rule 12: brand, last4 and expiry — the metadata a person needs to
    // recognise their own card. Nothing else is readable, because
    // nothing else is stored at Stripe in a retrievable form either.
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    await admin
      .from('reseller_payment_methods')
      .update({ is_default: false })
      .eq('reseller_id', actor.resellerId);

    await admin.from('reseller_payment_methods').upsert(
      {
        reseller_id: actor.resellerId,
        stripe_payment_method_id: paymentMethodId,
        is_default: true,
        brand: paymentMethod.card?.brand ?? null,
        last4: paymentMethod.card?.last4 ?? null,
        exp_month: paymentMethod.card?.exp_month ?? null,
        exp_year: paymentMethod.card?.exp_year ?? null,
      },
      { onConflict: 'stripe_payment_method_id' }
    );

    let activated = false;

    if (reseller.stripe_subscription_id) {
      // REPLACING a card. Point the existing subscription at the new one
      // — updating only the customer default would leave the
      // subscription charging the dead card forever, which is precisely
      // the situation the rep came here to fix.
      await stripe.subscriptions.update(reseller.stripe_subscription_id as string, {
        default_payment_method: paymentMethodId,
      });

      // If they were behind, retry the open invoice right away instead of
      // making them wait for Stripe's next scheduled retry (which can be
      // days). This is the recovery half of the dunning path.
      const openInvoices = await stripe.invoices.list({
        customer: reseller.stripe_customer_id as string,
        status: 'open',
        limit: 1,
      });
      const openInvoice = openInvoices.data[0];
      if (openInvoice?.id) {
        try {
          await stripe.invoices.pay(openInvoice.id);
        } catch (payError) {
          // The card was saved successfully; only the catch-up charge
          // failed. Saying "no pudimos guardar tu tarjeta" here would be
          // a lie and would make them enter it again for nothing.
          const mapped = toPaymentError(payError);
          console.error(describeForLog(mapped, `retry invoice reseller=${actor.resellerId}`));
          revalidatePath('/vendedor/suscripcion');
          return {
            ok: false,
            error: `Guardamos tu tarjeta, pero el cobro pendiente no pasó: ${mapped.message}`,
          };
        }
      }

      await syncResellerSubscriptionQuantity(actor.resellerId);
    } else {
      const result = await activateResellerSubscription(actor.resellerId);
      if (!result.ok) return { ok: false, error: result.error };
      activated = true;
    }

    revalidatePath('/vendedor/suscripcion');
    revalidatePath('/vendedor');
    return { ok: true, activated };
  } catch (error) {
    const mapped = toPaymentError(error);
    console.error(describeForLog(mapped, `finishCardSetup reseller=${actor.resellerId}`));
    return { ok: false, error: mapped.message };
  }
}

/**
 * Recompute the quantity on demand.
 *
 * Exists because "how many businesses am I paying for" is the number a
 * rep will question, and giving them a button that re-reads the database
 * and pushes the answer to Stripe is a better answer than asking them to
 * trust it. Same idempotent function every other call site uses.
 */
export async function resyncMySubscription(): Promise<{ ok: boolean; message: string }> {
  const actor = await requireReseller();
  const result = await syncResellerSubscriptionQuantity(actor.resellerId);

  revalidatePath('/vendedor/suscripcion');

  if (result.ok) {
    return {
      ok: true,
      message: result.changed
        ? `Listo: ahora pagas por ${result.quantity} ${result.quantity === 1 ? 'negocio activo' : 'negocios activos'}.`
        : 'Todo ya estaba al día.',
    };
  }
  return { ok: false, message: result.message };
}
