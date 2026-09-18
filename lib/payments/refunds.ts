import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, isStripeConfigured } from '@/lib/payments/stripe';
import { toPaymentError, describeForLog } from '@/lib/payments/errors';

// Refunding a rep's monthly charge.
//
// This is an internal-team action, not something a rep can do to
// themselves — the caller is expected to have gone through
// requireAdmin() first. It lives here rather than inside the Server
// Action so the guards below (already refunded, disputed, wrong owner,
// irreversible method) are one piece of code with one set of rules,
// instead of validation scattered through a UI handler.

export type RefundResult =
  | { ok: true; refundId: string; amountCentavos: number }
  | { ok: false; error: string };

// Stripe can only reverse a charge on a rail that supports reversal. A
// card can be refunded; a cash voucher (OXXO) or a bank transfer (SPEI)
// cannot be pushed back through the same channel, and calling
// refunds.create on one either fails or creates an obligation that has
// to be settled by hand outside Stripe. This integration is card-only
// (payment_method_types: ['card'] on the SetupIntent), so this guard
// should never fire — it exists because "should never" stops being true
// the day somebody adds a payment method to that array.
const REFUNDABLE_METHOD_TYPES = new Set(['card', 'link']);

export async function refundResellerCharge(input: {
  resellerId: string;
  stripeInvoiceId: string;
  /** Centavos. Omit or null for a full refund of what was actually paid. */
  amountCentavos?: number | null;
  reason?: 'duplicate' | 'requested_by_customer';
}): Promise<RefundResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: 'Stripe no está configurado en este ambiente.' };
  }

  const admin = createAdminClient();

  try {
    // Scoped by reseller_id AND invoice id together. An invoice id alone
    // would let a mistyped or guessed id refund a charge belonging to a
    // different rep.
    const { data: charge } = await admin
      .from('reseller_charges')
      .select('stripe_charge_id, stripe_payment_intent_id, amount_paid_cents, amount_refunded_cents, disputed_at, status')
      .eq('reseller_id', input.resellerId)
      .eq('stripe_invoice_id', input.stripeInvoiceId)
      .maybeSingle();

    if (!charge) return { ok: false, error: 'No encontramos ese cobro para este vendedor.' };

    if (charge.disputed_at) {
      // Refunding a charge that is already disputed can cost the money
      // twice: the dispute may still resolve against us and the refund
      // is not automatically netted off. Disputes are answered in the
      // Stripe dashboard, not here.
      return {
        ok: false,
        error: 'Este cobro está en disputa. Resuélvelo desde el panel de Stripe, no con un reembolso.',
      };
    }

    const paid = (charge.amount_paid_cents as number) ?? 0;
    const alreadyRefunded = (charge.amount_refunded_cents as number) ?? 0;

    if (paid <= 0) {
      return { ok: false, error: 'Ese cobro nunca se pagó, así que no hay nada que reembolsar.' };
    }

    const remaining = paid - alreadyRefunded;
    if (remaining <= 0) return { ok: false, error: 'Ese cobro ya está reembolsado por completo.' };

    const amount = input.amountCentavos ?? remaining;
    if (!Number.isInteger(amount) || amount <= 0 || amount > remaining) {
      return { ok: false, error: 'El monto a reembolsar no es válido.' };
    }

    const stripe = getStripe();

    const chargeId = (charge.stripe_charge_id as string | null) ?? null;
    const paymentIntentId = (charge.stripe_payment_intent_id as string | null) ?? null;
    if (!chargeId && !paymentIntentId) {
      return { ok: false, error: 'Ese cobro no tiene un cargo de Stripe asociado todavía.' };
    }

    if (chargeId) {
      const stripeCharge = await stripe.charges.retrieve(chargeId);
      const methodType = stripeCharge.payment_method_details?.type ?? 'unknown';
      if (!REFUNDABLE_METHOD_TYPES.has(methodType)) {
        return {
          ok: false,
          error: `Este cobro se hizo con ${methodType}, que no se puede reembolsar por Stripe. Devuélvelo por fuera y anótalo.`,
        };
      }
    }

    // Rule 4: a fresh cryptographic UUID, recorded before the call goes
    // out. Refunds are the operation where an accidental double-submit
    // costs real money, so the key is what makes a retry safe.
    const idempotencyKey = randomUUID();
    await admin.from('idempotency_keys').insert({
      key: idempotencyKey,
      operation: 'reseller_charge.refund',
      subject_id: input.resellerId,
      status: 'pending',
    });

    const refund = await stripe.refunds.create(
      {
        ...(chargeId ? { charge: chargeId } : { payment_intent: paymentIntentId as string }),
        amount,
        reason: input.reason ?? 'requested_by_customer',
        metadata: { reseller_id: input.resellerId, invoice: input.stripeInvoiceId },
      },
      { idempotencyKey }
    );

    await admin
      .from('idempotency_keys')
      .update({ status: 'succeeded', result_ref: refund.id })
      .eq('key', idempotencyKey);

    // Written optimistically so the panel is right immediately. The
    // charge.refunded webhook overwrites this with Stripe's own total,
    // which is what makes a partial refund followed by another one add
    // up correctly rather than doubling.
    await admin
      .from('reseller_charges')
      .update({ amount_refunded_cents: alreadyRefunded + amount })
      .eq('reseller_id', input.resellerId)
      .eq('stripe_invoice_id', input.stripeInvoiceId);

    return { ok: true, refundId: refund.id, amountCentavos: amount };
  } catch (error) {
    const mapped = toPaymentError(error);
    // Rule 6: the code, not the Stripe error object.
    console.error(describeForLog(mapped, `refund reseller=${input.resellerId}`));
    return { ok: false, error: mapped.message };
  }
}
