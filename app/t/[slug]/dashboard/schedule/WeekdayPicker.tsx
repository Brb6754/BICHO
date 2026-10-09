'use client';

import { useState } from 'react';

// Los días como fichas que se marcan, no como un desplegable de uno.
//
// El desplegable obligaba a un envío por día: un salón de martes a
// sábado eran cinco capturas idénticas salvo por una palabra. Aquí se
// marcan los que apliquen y se manda una vez.
//
// Las casillas son `<input type="checkbox">` de verdad, escondidas bajo
// la ficha: el formulario sigue siendo un form normal con su Server
// Action, el teclado y los lectores de pantalla funcionan solos, y los
// atajos no son más que marcar varias a la vez.

// El value es la convención de Postgres (0=domingo…6=sábado, ver
// db/003_resource_schedules.sql); el orden visual arranca en lunes.
const DIAS = [
  { value: 1, corto: 'L', largo: 'lunes' },
  { value: 2, corto: 'M', largo: 'martes' },
  { value: 3, corto: 'M', largo: 'miércoles' },
  { value: 4, corto: 'J', largo: 'jueves' },
  { value: 5, corto: 'V', largo: 'viernes' },
  { value: 6, corto: 'S', largo: 'sábado' },
  { value: 0, corto: 'D', largo: 'domingo' },
];

const ATAJOS: { label: string; dias: number[] }[] = [
  { label: 'Entre semana', dias: [1, 2, 3, 4, 5] },
  { label: 'Toda la semana', dias: [1, 2, 3, 4, 5, 6, 0] },
  { label: 'Fin de semana', dias: [6, 0] },
];

export function WeekdayPicker({ defaultDays = [] }: { defaultDays?: number[] }) {
  const [marcados, setMarcados] = useState<number[]>(defaultDays);

  function alternar(v: number) {
    setMarcados((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted">Días</span>

      <div className="flex flex-wrap items-center gap-1.5">
        {DIAS.map((d, i) => {
          const activo = marcados.includes(d.value);
          return (
            <label
              key={d.value}
              className={
                'relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-sm font-semibold transition-colors ' +
                (activo
                  ? 'bg-primary text-[rgb(var(--color-cta-fg))]'
                  : 'bg-ink/[0.05] text-muted hover:bg-ink/[0.09]')
              }
            >
              <input
                type="checkbox"
                name="day_of_week"
                value={d.value}
                checked={activo}
                onChange={() => alternar(d.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <span aria-hidden="true">{d.corto}</span>
              {/* Dos miércoles y dos martes comparten la M: el nombre
                  completo es lo único que distingue uno de otro para
                  quien no ve la posición. */}
              <span className="sr-only">{d.largo}</span>
              {/* Separador visual entre viernes y sábado, para que el
                  fin de semana se lea aparte sin añadir una etiqueta. */}
              {i === 4 && <span className="absolute -right-1 h-5 w-px bg-border" aria-hidden="true" />}
            </label>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {ATAJOS.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => setMarcados(a.dias)}
            className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-[13px] text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            {a.label}
          </button>
        ))}
        {marcados.length > 0 && (
          <button
            type="button"
            onClick={() => setMarcados([])}
            className="inline-flex min-h-9 items-center rounded-full px-3 text-[13px] text-muted transition-colors hover:text-ink"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
