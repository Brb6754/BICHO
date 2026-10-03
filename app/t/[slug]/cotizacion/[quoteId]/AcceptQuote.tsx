'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { acceptQuote } from './actions';

// "Acepto esta cotización".
//
// No cobra nada ni firma nada: es una señal de intención, y eso es
// exactamente lo que el vendedor necesita para dejar de perseguir. Por
// eso el texto dice "Aceptar" y no "Pagar" ni "Contratar" — prometer
// menos de lo que hace el botón es la única forma de que nadie se
// sienta engañado después.
export function AcceptQuote({
  slug,
  quoteId,
  yaAceptada,
}: {
  slug: string;
  quoteId: string;
  yaAceptada: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'listo'>(yaAceptada ? 'listo' : 'idle');
  const [error, setError] = useState<string | null>(null);

  if (estado === 'listo') {
    return (
      <p className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-success-soft px-5 text-[15px] font-medium text-success">
        <Check className="h-4 w-4" aria-hidden="true" />
        Aceptada. {yaAceptada ? 'Ya la habías aceptado.' : 'Te van a contactar.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={estado === 'enviando'}
        onClick={async () => {
          setEstado('enviando');
          setError(null);
          const res = await acceptQuote(slug, quoteId);
          if (!res.ok) {
            setError(res.error);
            setEstado('idle');
            return;
          }
          setEstado('listo');
          router.refresh();
        }}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-secondary px-6 text-[15px] font-semibold text-[rgb(var(--color-cta-fg))] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {estado === 'enviando' ? 'Un momento…' : 'Aceptar cotización'}
      </button>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
