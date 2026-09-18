import type { Metadata } from 'next';
import { requireReseller } from '@/lib/auth/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { centavosToPesos } from '@/lib/payments/stripe';
import { billingDayLabel, formatMxn, type Reseller } from '@/lib/resellers';
import { SubscriptionPanel, type SavedCard } from '@/components/reseller/SubscriptionPanel';

export const metadata: Metadata = { title: 'Mi suscripción', robots: { index: false, follow: false } };
// Billing state changes from outside this render (a webhook, an admin
// suspending a business), so a cached page would show a rep a bill that
// is no longer true.
export const dynamic = 'force-dynamic';

type SubscriptionRow = {
  status: string;
  quantity: number;
  unit_amount_cents: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  past_due_since: string | null;
};

// Stripe's statuses, in the rep's language. `past_due` and `unpaid` are
// deliberately not softened: they mean money is owed and the panel has
// to say so plainly or nobody acts on it.
const STATUS_COPY: Record<string, { label: string; tone: 'ok' | 'warn' | 'bad' }> = {
  active: { label: 'Al corriente', tone: 'ok' },
  trialing: { label: 'En periodo de prueba', tone: 'ok' },
  past_due: { label: 'Pago rechazado', tone: 'bad' },
  unpaid: { label: 'Sin pagar', tone: 'bad' },
  incomplete: { label: 'Falta confirmar el pago', tone: 'warn' },
  incomplete_expired: { label: 'La confirmación venció', tone: 'bad' },
  paused: { label: 'En pausa (sin negocios activos)', tone: 'warn' },
  canceled: { label: 'Cancelada', tone: 'bad' },
};

const TONE_CLASS = {
  ok: 'bg-success-soft text-success',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-error-soft text-error',
} as const;

export default async function ResellerSubscriptionPage() {
  const actor = await requireReseller();
  const admin = createAdminClient();

  // Every query is filtered by this rep's own id. `resellers` and the
  // billing tables have zero RLS policies by design (db/016, db/018), so
  // the filter here IS the isolation — there is no second net.
  const [{ data: resellerRow }, { data: subscriptionRow }, { data: cardRow }, { data: chargeRows }, activeCount] =
    await Promise.all([
      admin.from('resellers').select('*').eq('id', actor.resellerId).maybeSingle(),
      admin
        .from('reseller_subscriptions')
        .select('status, quantity, unit_amount_cents, current_period_end, cancel_at_period_end, past_due_since')
        .eq('reseller_id', actor.resellerId)
        .maybeSingle(),
      admin
        .from('reseller_payment_methods')
        .select('brand, last4, exp_month, exp_year')
        .eq('reseller_id', actor.resellerId)
        .eq('is_default', true)
        .maybeSingle(),
      admin
        .from('reseller_charges')
        .select('stripe_invoice_id, status, amount_due_cents, amount_paid_cents, amount_refunded_cents, period_start, hosted_invoice_url, created_at')
        .eq('reseller_id', actor.resellerId)
        .order('created_at', { ascending: false })
        .limit(12),
      admin
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .eq('reseller_id', actor.resellerId)
        .eq('status', 'active'),
    ]);

  const reseller = resellerRow as Reseller | null;
  const subscription = (subscriptionRow ?? null) as SubscriptionRow | null;
  const charges = chargeRows ?? [];

  // The live count from the database, not the number Stripe last heard.
  // Showing both is the point: if they disagree, the rep can see it and
  // press "Volver a contar" instead of wondering.
  const liveActiveCount = activeCount.count ?? 0;

  const wholesale = reseller?.wholesale_price_mxn ?? 0;
  const nextChargeMxn = liveActiveCount * wholesale;

  const card: SavedCard | null = cardRow
    ? {
        brand: (cardRow.brand as string | null) ?? null,
        last4: (cardRow.last4 as string | null) ?? null,
        expMonth: (cardRow.exp_month as number | null) ?? null,
        expYear: (cardRow.exp_year as number | null) ?? null,
      }
    : null;

  const status = subscription?.status ?? null;
  const statusCopy = status ? (STATUS_COPY[status] ?? { label: status, tone: 'warn' as const }) : null;
  const behind = status === 'past_due' || status === 'unpaid';

  // An expired card is the other reason to push the replace form open on
  // arrival: the next charge WILL fail and there is nothing else the rep
  // could usefully do on this screen.
  const cardExpired = Boolean(
    card?.expYear &&
      card.expMonth &&
      new Date(card.expYear, card.expMonth, 0) < new Date()
  );

  const quantityDrift = Boolean(subscription && subscription.quantity !== liveActiveCount);

  return (
    <div>
      <header className="border-b border-border pb-6">
        <p className="text-sm font-medium text-muted">Lo que le pagas a bicho</p>
        <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2rem]">
          Mi suscripción
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          bicho te cobra por cada negocio que tengas <strong>activo</strong>, una vez al mes. Lo que tú
          le cobras a cada negocio es aparte y no pasa por aquí.
        </p>
      </header>

      {behind && (
        <p className="mt-6 rounded-2xl bg-error-soft px-5 py-4 text-sm leading-relaxed text-error" role="alert">
          No pudimos cobrar tu última mensualidad. Cambia tu tarjeta aquí abajo y lo reintentamos al
          instante. Tus negocios siguen funcionando normal mientras tanto.
        </p>
      )}

      {!behind && cardExpired && (
        <p className="mt-6 rounded-2xl bg-warning-soft px-5 py-4 text-sm leading-relaxed text-warning" role="alert">
          Tu tarjeta ya venció. Registra una nueva antes de tu siguiente corte para que el cobro no falle.
        </p>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Tu próximo cargo</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{formatMxn(nextChargeMxn)}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {liveActiveCount} {liveActiveCount === 1 ? 'negocio activo' : 'negocios activos'} ×{' '}
            {formatMxn(wholesale)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Día de corte</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">
            {reseller?.billing_day ?? '—'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Te cobramos {billingDayLabel(reseller?.billing_day ?? 1)}.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Estado</p>
          {statusCopy ? (
            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${TONE_CLASS[statusCopy.tone]}`}
            >
              {statusCopy.label}
            </span>
          ) : (
            <p className="mt-1.5 text-lg font-medium text-ink">Sin activar</p>
          )}
          {subscription?.cancel_at_period_end && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Tu suscripción termina al final de este periodo.
            </p>
          )}
        </div>
      </section>

      {quantityDrift && subscription && (
        <p className="mt-4 rounded-2xl bg-warning-soft px-5 py-4 text-sm leading-relaxed text-warning">
          Stripe tiene registrados {subscription.quantity}{' '}
          {subscription.quantity === 1 ? 'negocio' : 'negocios'} y hoy tienes {liveActiveCount} activos. Usa
          &quot;Volver a contar&quot; abajo para emparejarlo — el ajuste entra en tu siguiente corte.
        </p>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-ink">Tu tarjeta</h2>
        <SubscriptionPanel
          hasSubscription={Boolean(subscription && subscription.status !== 'canceled')}
          card={card}
          needsNewCard={behind || cardExpired}
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold text-ink">Tus cobros</h2>
        {charges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm text-muted">
              Todavía no hay cobros. El primero aparece después de tu primer día de corte.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {charges.map((charge, i) => {
              const refunded = (charge.amount_refunded_cents as number) > 0;
              return (
                <li
                  key={charge.stripe_invoice_id as string}
                  className={
                    'flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 sm:px-5 ' +
                    (i > 0 ? 'border-t border-border' : '')
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {formatMxn(centavosToPesos(charge.amount_due_cents as number))} MXN
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(charge.created_at as string).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'America/Mexico_City',
                      })}
                    </p>
                  </div>

                  <span className="text-sm text-muted">
                    {refunded
                      ? `Reembolsado ${formatMxn(centavosToPesos(charge.amount_refunded_cents as number))}`
                      : charge.status === 'paid'
                        ? 'Pagado'
                        : charge.status === 'open'
                          ? 'Pendiente'
                          : charge.status === 'void'
                            ? 'Anulado'
                            : (charge.status as string)}
                  </span>

                  {charge.hosted_invoice_url && (
                    <a
                      href={charge.hosted_invoice_url as string}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Ver recibo
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-10 rounded-2xl border border-border bg-surface px-5 py-4 text-xs leading-relaxed text-muted">
        Tu tarjeta la guarda Stripe, no bicho: aquí solo vemos la marca y los últimos 4 dígitos. Si algo
        no cuadra con un cobro, escríbele al equipo de bicho antes de cancelar nada.
      </p>
    </div>
  );
}
