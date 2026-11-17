'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RESULTADOS, type Resultado } from '@/lib/meetings/kinds';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { setMeetingOutcome } from './actions';

// En qué quedó la reunión.
//
// Cuatro botones y no un `<select>`: anotar el resultado es lo único que
// se hace en esta pantalla, y un desplegable esconde las opciones detrás
// de un toque extra justo en la acción principal. Con cuatro valores
// fijos caben a la vista. Qué significa cada uno lo explica el HelpTip
// del encabezado (un `title` de hover no existe en el teléfono).
//
// El botón ya elegido vuelve a ser tocable y LIMPIA el resultado:
// equivocarse de opción es fácil, y sin forma de deshacerlo el dato se
// queda mal para siempre.

const TONOS: Record<string, { on: string; off: string }> = {
  info: { on: 'bg-info-soft text-info ring-info/30', off: 'hover:bg-info-soft hover:text-info' },
  primary: {
    on: 'bg-primary/10 text-ink ring-primary/30',
    off: 'hover:bg-primary/10 hover:text-ink',
  },
  success: {
    on: 'bg-success-soft text-success ring-success/30',
    off: 'hover:bg-success-soft hover:text-success',
  },
  muted: { on: 'bg-ink/[0.08] text-ink ring-ink/20', off: 'hover:bg-ink/[0.06] hover:text-ink' },
};

export function OutcomeButtons({
  slug,
  bookingId,
  outcome,
}: {
  slug: string;
  bookingId: string;
  outcome: Resultado | null;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  function elegir(valor: Resultado) {
    const nuevo = outcome === valor ? null : valor;
    startTransition(async () => {
      const res = await setMeetingOutcome(slug, bookingId, nuevo);
      if (!res.ok) return toast(res.error, 'error');
      toast(nuevo ? `Anotado: ${RESULTADOS.find((r) => r.value === nuevo)?.label}` : 'Resultado quitado');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="En qué quedó">
      {RESULTADOS.map((r) => {
        const activo = outcome === r.value;
        const tono = TONOS[r.tono];
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => elegir(r.value)}
            disabled={pendiente}
            aria-pressed={activo}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium ring-1 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              activo ? tono.on : `text-ink ring-border ${tono.off}`
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
