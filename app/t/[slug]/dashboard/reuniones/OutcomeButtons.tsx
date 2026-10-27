'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RESULTADOS, type Resultado } from '@/lib/meetings/kinds';
import { setMeetingOutcome } from './actions';

// En qué quedó la reunión.
//
// Cuatro botones y no un `<select>`: capturar el resultado es lo único
// que el asesor hace en esta pantalla, y un desplegable esconde las
// opciones detrás de un clic extra justo en la acción principal. Con
// cuatro valores fijos caben a la vista.
//
// El botón ya elegido vuelve a ser clickeable y LIMPIA el resultado:
// equivocarse de columna es fácil, y sin forma de deshacerlo el dato se
// queda mal para siempre.

const TONOS: Record<string, { on: string; off: string }> = {
  info: { on: 'bg-info-soft text-info ring-info/30', off: 'hover:bg-info-soft hover:text-info' },
  primary: {
    on: 'bg-primary/10 text-primary ring-primary/30',
    off: 'hover:bg-primary/10 hover:text-primary',
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
  const [error, setError] = useState<string | null>(null);

  function elegir(valor: Resultado) {
    setError(null);
    startTransition(async () => {
      const res = await setMeetingOutcome(slug, bookingId, outcome === valor ? null : valor);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="En qué quedó">
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
              title={r.ayuda}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                activo ? `ring-1 ${tono.on}` : `text-muted ${tono.off}`
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
}
