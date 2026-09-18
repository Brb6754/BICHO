'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';
import { startCardSetup, finishCardSetup } from '@/app/vendedor/(panel)/suscripcion/actions';

// Stripe Elements, embedded — the rep never leaves this panel.
//
// This component makes /vendedor/suscripcion a payment page, so the
// scripts it loads are inventoried in payment-page-scripts.json at the
// project root (PCI DSS 4.0.1 req. 6.4.3). Adding another external
// script to this screen means updating that file and re-reviewing it.
//
// Rule 12 / PCI: the card number is typed into an iframe Stripe serves
// and owns. It never enters this component's state, never reaches a
// server action, and never touches the database. That iframe is exactly
// what keeps bicho in SAQ-A scope instead of a six-figure compliance
// project, which is why the card fields are not hand-built here even
// though they would be easy to style.
//
// The publishable key is the ONLY Stripe value allowed in the browser.
// It is publishable by design: it can tokenize a card and nothing else.
// The secret key never appears in any file with 'use client' at the top.
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Module scope on purpose: loadStripe injects a <script> tag, so calling
// it per render would add one on every keystroke.
const stripePromise: Promise<Stripe | null> | null = publishableKey
  ? loadStripe(publishableKey)
  : null;

type Mode = 'activate' | 'replace';

export function CardSetupForm({
  mode,
  onDone,
  onCancel,
}: {
  mode: Mode;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await startCardSetup();
      if (cancelled) return;
      if (result.ok) setClientSecret(result.clientSecret);
      else setError(result.error);
      setStarting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stripePromise) {
    return (
      <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">
        Falta configurar <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>. Avísale al equipo de bicho.
      </p>
    );
  }

  if (starting) {
    return <p className="text-sm text-muted">Preparando el formulario seguro de Stripe…</p>;
  }

  if (error || !clientSecret) {
    return (
      <p className="rounded-2xl bg-error-soft px-4 py-3 text-sm text-error" role="alert">
        {error ?? 'No pudimos abrir el formulario de pago.'}
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        // The whole panel is in Spanish; leaving this on 'auto' would
        // show the card form in the browser's language instead.
        locale: 'es',
        appearance: { theme: 'stripe', variables: { borderRadius: '12px' } },
      }}
    >
      <ConfirmCard mode={mode} onDone={onDone} onCancel={onCancel} />
    </Elements>
  );
}

function ConfirmCard({ mode, onDone, onCancel }: { mode: Mode; onDone: () => void; onCancel?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!stripe || !elements) return;

      setSubmitting(true);
      setError(null);

      // redirect: 'if_required' keeps the common case embedded. A card
      // that demands 3-D Secure still needs somewhere to come back to,
      // which is what return_url is for — it is only ever used on that
      // branch.
      //
      // window.location.href, NOT `${origin}/vendedor/suscripcion`. The
      // rep reaches this screen at vendedores.{dominio}/suscripcion;
      // /vendedor/... is the INTERNAL target proxy.ts rewrites to, so
      // sending the bank back there would get rewritten a second time
      // (/vendedor/vendedor/suscripcion) and 404 — the exact bug class
      // already documented in CLAUDE.md for the tenant sidebar. The
      // current URL is correct on every host by construction.
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });

      if (confirmError) {
        // Stripe's client-side message is already localised by `locale`
        // and is more specific than anything that could be substituted
        // here ("tu tarjeta fue rechazada" vs "el número es incorrecto").
        setError(confirmError.message ?? 'No pudimos guardar la tarjeta.');
        setSubmitting(false);
        return;
      }

      if (!setupIntent?.id) {
        setError('No pudimos confirmar la tarjeta. Vuelve a intentar.');
        setSubmitting(false);
        return;
      }

      // The server re-reads this intent from Stripe and checks it
      // belongs to this rep before acting on it — the id below is a
      // pointer, not a claim.
      const result = await finishCardSetup(setupIntent.id);
      setSubmitting(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    },
    [stripe, elements, onDone]
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <p className="rounded-2xl bg-error-soft px-4 py-3 text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted">
        No se te cobra nada ahora. Guardamos tu tarjeta y el cargo corre solo el día de corte, por la
        cantidad de negocios activos que tengas ese día.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" isLoading={submitting} disabled={!stripe}>
          {mode === 'activate' ? 'Guardar tarjeta y activar' : 'Guardar tarjeta nueva'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
