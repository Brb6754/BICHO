'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardSetupForm } from '@/components/reseller/CardSetupForm';
import { resyncMySubscription } from '@/app/vendedor/(panel)/suscripcion/actions';

// The interactive half of /vendedor/suscripcion. Everything it shows was
// computed on the server; this only owns which form is open.
//
// Rule 12: the only card data that reaches this file is brand/last4 —
// enough for the rep to recognise their own card and nothing more.
export type SavedCard = {
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
};

export function SubscriptionPanel({
  hasSubscription,
  card,
  needsNewCard,
}: {
  hasSubscription: boolean;
  card: SavedCard | null;
  // past_due, unpaid, or an expired card: the rep has to act, and the
  // replace form opens on its own rather than hiding behind a link.
  needsNewCard: boolean;
}) {
  const router = useRouter();
  const [openForm, setOpenForm] = useState<null | 'activate' | 'replace'>(
    needsNewCard ? 'replace' : null
  );
  const [resyncing, startResync] = useTransition();
  const [resyncMessage, setResyncMessage] = useState<string | null>(null);

  function done() {
    setOpenForm(null);
    router.refresh();
  }

  // No card at all yet: activation is the only thing this screen is for.
  if (!card && !hasSubscription) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        {openForm === 'activate' ? (
          <CardSetupForm mode="activate" onDone={done} onCancel={() => setOpenForm(null)} />
        ) : (
          <>
            <p className="text-sm font-medium text-ink">Todavía no has registrado una tarjeta</p>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">
              Guarda una tarjeta y cada mes, el día de tu corte, te cobramos automáticamente por los
              negocios que tengas activos. No se te cobra nada en este momento.
            </p>
            <Button type="button" className="mt-4" onClick={() => setOpenForm('activate')}>
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Registrar mi tarjeta
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Tarjeta guardada</p>
            <p className="mt-0.5 text-sm text-muted">
              {card
                ? `${card.brand ? capitalise(card.brand) : 'Tarjeta'} •••• ${card.last4 ?? '????'}` +
                  (card.expMonth && card.expYear
                    ? ` · vence ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`
                    : '')
                : 'No encontramos los datos de tu tarjeta.'}
            </p>
          </div>
          {openForm !== 'replace' && (
            <Button type="button" variant="outline" onClick={() => setOpenForm('replace')}>
              Cambiar tarjeta
            </Button>
          )}
        </div>

        {openForm === 'replace' && (
          <div className="mt-5 border-t border-border pt-5">
            {/* The point of this being self-service: a card expires every
                few years and nobody should have to write to support to
                swap it. Saving a new one also retries whatever charge is
                pending, so the rep is caught up in one step. */}
            <p className="mb-4 text-sm leading-relaxed text-muted">
              Captura la tarjeta nueva. Reemplaza a la anterior y, si tienes un cobro pendiente, lo
              reintentamos de inmediato.
            </p>
            <CardSetupForm mode="replace" onDone={done} onCancel={() => setOpenForm(null)} />
          </div>
        )}
      </div>

      {hasSubscription && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-medium text-ink">¿El número de negocios no cuadra?</p>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">
            Volvemos a contar tus negocios activos y se lo mandamos a Stripe. Cualquier ajuste se aplica
            en tu siguiente corte, nunca como un cargo inmediato.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            isLoading={resyncing}
            onClick={() =>
              startResync(async () => {
                const result = await resyncMySubscription();
                setResyncMessage(result.message);
                router.refresh();
              })
            }
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Volver a contar
          </Button>
          {resyncMessage && (
            <p className="mt-3 text-sm text-muted" role="status">
              {resyncMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
