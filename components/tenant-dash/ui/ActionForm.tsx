'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { toast } from './Toast';

// UN FORMULARIO DEL PANEL QUE AVISA.
//
// Las server actions del panel avientan un Error cuando algo falla, y
// sin esto el error subía hasta error.tsx: la pantalla entera cambiaba
// por "Algo salió mal" y la dueña perdía lo que había escrito. Y cuando
// salía bien no pasaba nada visible: la lista crecía, pero nadie decía
// "listo". Este envoltorio no cambia la action (se pasa igual que a un
// <form action>), solo la llama desde el cliente para poder decir
// "Guardado ✓" o "No se pudo guardar" sin salir de la página.
//
// React 19 limpia el formulario después de un envío exitoso y lo deja
// como estaba si falla: lo que escribió no se pierde.

export function ActionForm({
  action,
  success = 'Guardado',
  className,
  children,
}: {
  action: (formData: FormData) => unknown | Promise<unknown>;
  /** Qué se confirma al terminar, en pasado: "Servicio agregado". */
  success?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      className={className}
      action={async (fd) => {
        try {
          await action(fd);
          toast(success);
        } catch (e) {
          // redirect() y notFound() viajan como errores con digest: son
          // navegación, no fallas, y Next los tiene que seguir recibiendo.
          if (esNavegacion(e)) throw e;
          toast(mensajeDeError(e), 'error');
        }
      }}
    >
      {children}
    </form>
  );
}

/** Botón de envío que se apaga y dice qué está haciendo mientras la action corre. */
export function SubmitButton({
  children,
  pending = 'Guardando…',
  variant,
  className,
}: {
  children: React.ReactNode;
  pending?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
}) {
  const { pending: enviando } = useFormStatus();
  return (
    <Button type="submit" variant={variant} isLoading={enviando} className={className}>
      {enviando ? pending : children}
    </Button>
  );
}

function esNavegacion(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === 'string' && /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test(digest);
}

/**
 * En producción Next cambia el mensaje de cualquier error de servidor por
 * uno genérico en inglés. Ese no se le enseña a nadie; los nuestros (en
 * español, escritos para la dueña) sí.
 */
export function mensajeDeError(e: unknown): string {
  const m = e instanceof Error ? e.message : '';
  if (!m || /Server Components render|omitted in production|digest/i.test(m)) {
    return 'No se pudo guardar. Revisa tu internet e inténtalo otra vez.';
  }
  return m;
}
