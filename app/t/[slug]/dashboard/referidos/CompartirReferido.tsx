'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { Burbuja, FondoChat } from '@/components/tenant-dash/crecer/ui';

// La tarjeta del link de invitación: el link a la vista, dos botones
// grandes (Copiar y WhatsApp) y debajo cómo le llega el mensaje al otro
// negocio, como burbuja de WhatsApp, para que sepa qué va a mandar.
export function CompartirReferido({ mensaje, url }: { mensaje: string; url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      toast('Link copiado. Pégalo en un chat o en un grupo.');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast('No se pudo copiar. Mantén el dedo sobre el link para copiarlo.', 'error');
    }
  }

  const grande =
    'ui-btn inline-flex min-h-[3.25rem] flex-1 basis-40 items-center justify-center gap-2 rounded-2xl px-5 text-[16px] font-semibold transition active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2';

  return (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p className="text-[15px] font-medium text-muted">Tu link para invitar</p>
      <p className="mt-2 select-all break-all rounded-2xl bg-ink/[0.04] px-4 py-3 text-[16px] font-medium text-ink">{url}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={copiar} className={`${grande} border border-border bg-surface text-ink hover:bg-ink/[0.04]`}>
          {copiado ? (
            <Check className="animate-pop-in h-5 w-5 text-success" strokeWidth={3} aria-hidden="true" />
          ) : (
            <Copy className="h-5 w-5" aria-hidden="true" />
          )}
          {copiado ? '¡Copiado!' : 'Copiar link'}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noreferrer"
          className={`${grande} bg-primary text-[rgb(var(--color-cta-fg))] shadow-sm hover:brightness-110`}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Mandar por WhatsApp
        </a>
      </div>
      <p className="mb-2 mt-6 text-[15px] font-medium text-muted">Así le llega tu mensaje</p>
      <FondoChat>
        <Burbuja mia>{mensaje}</Burbuja>
      </FondoChat>
    </div>
  );
}
