'use client';

import { useRef, useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

// Wraps a server-action <form> so the destructive action requires a
// confirm click before it fires. The <form action={...}> stays exactly
// what a page already passes in — this only gates the submit behind a
// modal via formRef.requestSubmit(), it never changes what gets sent.
export function ConfirmForm({
  action,
  confirmTitle,
  confirmMessage,
  confirmLabel = 'Confirmar',
  dismissLabel = 'Cancelar',
  triggerVariant = 'danger',
  triggerClassName = '',
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel?: string;
  // The label of the button that closes the modal without acting. Pass
  // something explicit when the action itself is a cancellation: a
  // "Cancelar" button next to "Cancelar cita" makes the safe choice and
  // the destructive one read the same.
  dismissLabel?: string;
  triggerVariant?: 'primary' | 'secondary' | 'ghost' | 'ghost-inverse' | 'outline' | 'danger' | 'success';
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <form ref={formRef} action={action}>
        <Button type="button" variant={triggerVariant} className={triggerClassName} onClick={() => setOpen(true)}>
          {children}
        </Button>
      </form>
      <Modal open={open} onClose={() => setOpen(false)} title={confirmTitle}>
        <p className="text-sm text-muted">{confirmMessage}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {dismissLabel}
          </Button>
          <Button
            type="button"
            variant={triggerVariant}
            onClick={() => {
              setOpen(false);
              formRef.current?.requestSubmit();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
