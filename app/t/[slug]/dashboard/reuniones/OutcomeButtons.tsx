'use client';

import { useTransition } from 'react';
import { Check, FileText, Sparkles, ThumbsDown, Trophy } from 'lucide-react';
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
  info: { on: 'bg-info text-white ring-info', off: 'hover:bg-info-soft' },
  primary: {
    on: 'bg-primary text-[rgb(var(--color-cta-fg))] ring-primary',
    off: 'hover:bg-primary/10',
  },
  success: {
    on: 'bg-success text-white ring-success',
    off: 'hover:bg-success-soft',
  },
  muted: { on: 'bg-ink/75 text-white ring-ink/75', off: 'hover:bg-ink/[0.06]' },
};

const ICONO = { interesado: Sparkles, cotizado: FileText, ganado: Trophy, perdido: ThumbsDown } as const;

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
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="En qué quedó">
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
            className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 text-[15px] font-semibold ring-1 transition active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
              activo ? tono.on : `bg-surface text-ink ring-border ${tono.off}`
            }`}
          >
            {activo ? (
              <Check className="animate-pop-in h-5 w-5" strokeWidth={3} aria-hidden="true" />
            ) : (
              (() => {
                const Icono = ICONO[r.value as keyof typeof ICONO] ?? Sparkles;
                return <Icono className="h-5 w-5" aria-hidden="true" />;
              })()
            )}
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
