'use client';

import { useEffect, useState } from 'react';
import { Check, CircleAlert } from 'lucide-react';

// EL "GUARDADO ✓" DE TODO EL PANEL.
//
// Sin dependencia nueva: un emisor de módulo y un <Toaster/> que se monta
// una vez en el layout del panel (y en el de la demo). Cualquier cliente
// llama toast('Servicio agregado') y el aviso sale justo debajo de la
// barra de color en el teléfono (abajo-centro en la computadora).
//
// Por qué arriba en el teléfono: abajo ya viven la barra de pestañas, las
// barras de acción fijas de algunas pantallas;
// un aviso ahí queda tapado.

export type Tono = 'ok' | 'error';
type Aviso = { id: number; texto: string; tono: Tono };

const oyentes = new Set<(a: Aviso) => void>();
let siguiente = 1;

/** Muestra un aviso breve. `tono: 'error'` se queda más tiempo y se anuncia como alerta. */
export function toast(texto: string, tono: Tono = 'ok') {
  const aviso = { id: siguiente++, texto, tono };
  oyentes.forEach((o) => o(aviso));
}

export function Toaster() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    const oyente = (a: Aviso) => {
      // Uno a la vez: dos avisos encimados en un teléfono no se leen.
      setAvisos([a]);
      setTimeout(() => setAvisos((xs) => xs.filter((x) => x.id !== a.id)), a.tono === 'error' ? 6000 : 2600);
    };
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(4.25rem+env(safe-area-inset-top))] z-[60] flex justify-center px-4 lg:bottom-8 lg:top-auto"
      // Región viva siempre presente: los lectores de pantalla solo
      // anuncian cambios dentro de una región que ya existía.
      aria-live="polite"
      role="status"
    >
      {avisos.map((a) => (
        <p
          key={a.id}
          role={a.tono === 'error' ? 'alert' : undefined}
          className={`animate-fade-in pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full px-4 py-3 text-sm font-medium shadow-lg ${
            a.tono === 'error' ? 'bg-error text-white' : 'bg-ink text-paper'
          }`}
        >
          {a.tono === 'error' ? (
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          )}
          {a.texto}
        </p>
      ))}
    </div>
  );
}
