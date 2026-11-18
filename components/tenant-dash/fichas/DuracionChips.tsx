'use client';

import { useEffect, useRef, useState } from 'react';
import { CAMPO } from './visual';

// Cuánto dura, con las duraciones de siempre a un toque y la caja de
// minutos para lo que no está (75, 105…). La caja es la que se envía
// (`duration_minutes`), las fichas solo la llenan. Es no controlada para
// que la hoja la pueda llenar desde afuera (una idea de servicio): se
// escucha su evento `input` nativo para pintar la ficha que toca.
const COMUNES = [15, 30, 45, 60, 90, 120];

function texto(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

export function DuracionChips({ defaultValue = 30 }: { defaultValue?: number }) {
  const caja = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState(defaultValue);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const leer = () => setValor(Number(el.value));
    el.addEventListener('input', leer);
    return () => el.removeEventListener('input', leer);
  }, []);

  function elegir(min: number) {
    if (!caja.current) return;
    caja.current.value = String(min);
    setValor(min);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="group" aria-label="Duraciones comunes">
        {COMUNES.map((m) => {
          const activo = valor === m;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={activo}
              onClick={() => elegir(m)}
              className={`min-h-12 rounded-2xl text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                activo ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : 'bg-ink/[0.06] text-ink hover:bg-ink/[0.1]'
              }`}
            >
              {texto(m)}
            </button>
          );
        })}
      </div>
      <label className="mt-3 flex items-center gap-3 text-[15px] text-muted">
        Otra:
        <input
          ref={caja}
          type="number"
          name="duration_minutes"
          inputMode="numeric"
          min={5}
          step={5}
          required
          defaultValue={defaultValue}
          aria-label="Minutos que dura"
          className={`${CAMPO} !w-28`}
        />
        minutos
      </label>
    </div>
  );
}
