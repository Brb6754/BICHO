'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  // Fuera del contenido con un portal: el contenido del panel vive en `.dash-main`
  // (relative z-10), y sin portal el z-50 de aquí quedaba atrapado debajo
  // de la barra de abajo del teléfono (z-30), que tapaba los botones.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !montado) return null;

  // En el teléfono es una hoja que sube desde abajo (el pulgar llega);
  // desde sm, un diálogo centrado. En los dos, si el contenido es más alto
  // que la pantalla (ej. "Mover la cita" con la lista de horas), el cuerpo
  // hace scroll y el título con su "cerrar" se quedan a la vista.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-pop-in glass-3 relative flex max-h-[90dvh] w-full ${ANCHO[size]} flex-col rounded-t-[28px] pb-[env(safe-area-inset-bottom)] sm:rounded-[28px] sm:pb-0`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-4 sm:pt-5">
          <div className="pt-2.5">
            <Text variant="h3">{title}</Text>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-6 pt-2">{children}</div>
      </div>
    </div>,
    // Dentro del panel, a su raíz (.tenant-shell): ahí viven los colores
    // del negocio (variables CSS) y queda por encima de la barra de abajo.
    document.querySelector('.tenant-shell') ?? document.body
  );
}
