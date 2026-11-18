'use client';

import { useState } from 'react';
import { Clock3, Plus } from 'lucide-react';
import { GIROS } from '@/lib/onboarding/presets';
import { abrirHoja } from './Hoja';

// "Servicios típicos de uñas, de barbería…": las plantillas del registro
// (lib/onboarding/presets.ts), pero SIN su precio. El precio de una
// plantilla es el de otro negocio; aquí cada idea abre la hoja de agregar
// con nombre y duración puestos y el precio vacío, para que ella ponga el
// suyo. Lo que ya tiene (mismo nombre) no se vuelve a sugerir.
export function IdeasServicios({ hojaId, existentes }: { hojaId: string; existentes: string[] }) {
  const [giro, setGiro] = useState<string | null>(null);
  const ya = new Set(existentes.map((n) => n.trim().toLowerCase()));
  const elegido = GIROS.find((g) => g.id === giro);
  const ideas = elegido?.services.filter((s) => !ya.has(s.name.toLowerCase())) ?? [];

  return (
    <div>
      <p className="text-[15px] font-medium text-ink">¿Qué tipo de negocio tienes?</p>
      <div className="-mx-1 mt-3 flex flex-wrap gap-2 px-1">
        {GIROS.map((g) => {
          const activo = g.id === giro;
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={activo}
              onClick={() => setGiro(activo ? null : g.id)}
              className={`min-h-12 rounded-full px-5 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                activo ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : 'border border-border bg-surface text-ink hover:bg-ink/[0.04]'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {elegido && (
        <div className="animate-fade-in mt-4 motion-reduce:animate-none">
          {ideas.length === 0 ? (
            <p className="text-[15px] text-muted">Ya tienes todos los típicos de {elegido.label.toLowerCase()}.</p>
          ) : (
            <>
              <p className="mb-2 text-[14px] text-muted">Toca uno y solo ponle tu precio.</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {ideas.map((s) => (
                  <li key={s.name}>
                    <button
                      type="button"
                      onClick={() => abrirHoja(hojaId, { name: s.name, duration_minutes: String(s.minutes) })}
                      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface px-4 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[rgb(var(--color-cta-fg))]" aria-hidden="true">
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-ink">{s.name}</span>
                        <span className="flex items-center gap-1 text-[14px] text-muted">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {s.minutes} min
                        </span>
                      </span>
                      <span className="shrink-0 text-[14px] font-medium text-ink underline underline-offset-4">Agregar</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
