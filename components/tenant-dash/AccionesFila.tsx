'use client';

import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { Button } from '@/components/ui/Button';
import { toast } from './ui/Toast';
import { mensajeDeError } from './ui/ActionForm';

// Dos piezas chicas que usan las pantallas de la agenda (grupo A).
//
// ConfirmarConAviso: ConfirmForm tal cual, más el aviso. ConfirmForm
// manda la server action directo, así que un error tiraba la página a
// error.tsx y un acierto no decía nada. Aquí la action se envuelve del
// lado del cliente: "Servicio borrado" o el error en español, sin salir.
// (Pedido a cimientos: que ConfirmForm acepte `success` y esto se borra.)
export function ConfirmarConAviso({
  action,
  success,
  ...props
}: Omit<React.ComponentProps<typeof ConfirmForm>, 'action'> & {
  action: (formData: FormData) => unknown | Promise<unknown>;
  /** En pasado y con el objeto: "Cita cancelada". */
  success: string;
}) {
  return (
    <ConfirmForm
      {...props}
      action={async (fd) => {
        try {
          await action(fd);
          toast(success);
        } catch (e) {
          toast(mensajeDeError(e), 'error');
        }
      }}
    />
  );
}

// IrAlCampo: el botón de un estado vacío o de un encabezado cuando el
// formulario está en la misma página. Lo lleva hasta el campo y le pone
// el cursor, para que empiece a escribir sin buscarlo.
export function IrAlCampo({
  campo,
  children,
  variant = 'primary',
}: {
  /** id del input que recibe el foco. */
  campo: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
}) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => {
        const el = document.getElementById(campo);
        if (!el) return;
        // Un <details> plegado escondería el campo: se abre antes.
        const plegado = el.closest('details');
        if (plegado) plegado.open = true;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
      }}
    >
      {children}
    </Button>
  );
}

/** Clases del botón de basura de una fila: 44×44 en el teléfono, sin borde. */
export const BOTON_ICONO =
  'h-11 w-11 !border-0 !p-0 !text-muted hover:!bg-error-soft hover:!text-error';
