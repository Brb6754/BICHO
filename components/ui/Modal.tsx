'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Text } from './Text';

// `size` es una prop y no un className a propósito: la clase base ya
// trae un ancho, y en este proyecto un className adicional no le gana
// de forma confiable — el orden en la hoja generada por Tailwind no es
// el del string. Misma regla que `padded` en Card.
const ANCHO = { sm: 'max-w-sm', lg: 'max-w-2xl' };

export function Modal({
  open,
  onClose,
  title,
  size = 'sm',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 'lg' para formularios con varios campos; 'sm' para confirmar algo. */
  size?: keyof typeof ANCHO;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div role="dialog" aria-modal="true" className={`animate-pop-in glass-3 relative w-full ${ANCHO[size]} rounded-[28px] p-6`}>
        <div className="flex items-start justify-between gap-4">
          <Text variant="h3">{title}</Text>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full p-1 text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
