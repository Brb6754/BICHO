'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { correrConAviso } from '@/components/tenant-dash/ui/ActionForm';
import { toast } from '@/components/tenant-dash/ui/Toast';

// HOJAS INFERIORES — agregar y editar sin salir de la lista.
//
// `Modal` ya es una hoja que sube desde abajo en el teléfono y un diálogo
// en escritorio; esto le pone encima lo que las pantallas de la agenda
// repiten: abrirla desde cualquier botón (el del encabezado, el del estado
// vacío, una idea de servicio), llegar con campos ya llenos, y cerrarse
// sola cuando se guardó, con su toast.
//
// Se abre por un evento con id en vez de pasar estado entre componentes:
// los botones viven en server components dispersos por la página. Y con
// `#id` en la URL llega abierta (el atajo "Bloquear un rato" del inicio).
//
// Sin `action` es la demo: el formulario se llena igual, pero al enviarlo
// solo confirma "Ejemplo: …" y no guarda nada (la demo es de solo lectura).

const EVENTO = 'abrir-hoja';
type Detalle = { id: string; valores?: Record<string, string> };

export function abrirHoja(id: string, valores?: Record<string, string>) {
  window.dispatchEvent(new CustomEvent<Detalle>(EVENTO, { detail: { id, valores } }));
}

function useHoja(id: string) {
  const [abierta, setAbierta] = useState(false);
  const [valores, setValores] = useState<Record<string, string> | undefined>();
  useEffect(() => {
    const alAbrir = (e: Event) => {
      const d = (e as CustomEvent<Detalle>).detail;
      if (d.id !== id) return;
      setValores(d.valores);
      setAbierta(true);
    };
    window.addEventListener(EVENTO, alAbrir);
    // Un cuadro después: en navegación del lado del cliente el #id llega justo después de montar.
    const raf = requestAnimationFrame(() => {
      if (window.location.hash === '#' + id) setAbierta(true);
    });
    return () => {
      window.removeEventListener(EVENTO, alAbrir);
      cancelAnimationFrame(raf);
    };
  }, [id]);
  return { abierta, valores, cerrar: () => setAbierta(false) };
}

/** El botón que abre una hoja (puede llegar con campos ya llenos). */
export function AbrirHoja({
  id,
  valores,
  variant = 'primary',
  className = '',
  children,
}: {
  id: string;
  valores?: Record<string, string>;
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button type="button" variant={variant} className={`min-h-12 !text-[15px] ${className}`} onClick={() => abrirHoja(id, valores)}>
      {children}
    </Button>
  );
}

/** Una hoja con un formulario que llama a una server action y se cierra al guardar. */
export function HojaFormulario({
  id,
  titulo,
  action,
  success,
  enviar,
  enviando = 'Guardando…',
  children,
}: {
  id: string;
  titulo: string;
  /** Sin action: demo, simula y confirma "Ejemplo: …". */
  action?: (formData: FormData) => unknown | Promise<unknown>;
  /** En pasado: "Servicio agregado". */
  success: string;
  /** Texto del botón: el resultado, no "Enviar". */
  enviar: string;
  enviando?: string;
  children: React.ReactNode;
}) {
  const { abierta, valores, cerrar } = useHoja(id);
  return (
    <Modal open={abierta} onClose={cerrar} title={titulo} size="lg">
      <FormularioHoja action={action} success={success} enviar={enviar} enviando={enviando} valores={valores} alGuardar={cerrar}>
        {children}
      </FormularioHoja>
    </Modal>
  );
}

/** El formulario de una hoja. Suelto para las hojas que se abren desde su propia tarjeta. */
export function FormularioHoja({
  action,
  success,
  enviar,
  enviando = 'Guardando…',
  valores,
  alGuardar,
  variant,
  children,
}: {
  action?: (formData: FormData) => unknown | Promise<unknown>;
  success: string;
  enviar: string;
  enviando?: string;
  valores?: Record<string, string>;
  alGuardar: () => void;
  variant?: React.ComponentProps<typeof Button>['variant'];
  children: React.ReactNode;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [pendiente, start] = useTransition();

  // Campos que llegan llenos ("Manicure en gel, 60 min") y el cursor en el
  // primero vacío, para que solo escriba lo que falta (casi siempre, el precio).
  useEffect(() => {
    const f = form.current;
    if (!f) return;
    for (const [k, v] of Object.entries(valores ?? {})) {
      const el = f.elements.namedItem(k);
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        el.checked = v === 'on';
      } else if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    const vacio = [...f.querySelectorAll<HTMLInputElement>('input[required]:is([type="text"], [type="number"], [type="tel"])')].find(
      (i) => !i.value
    );
    vacio?.focus({ preventScroll: true });
  }, [valores]);

  return (
    <form
      ref={form}
      className="flex flex-col gap-5 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!action) {
          toast(`Ejemplo: ${success}. En la demo no se guarda nada.`);
          alGuardar();
          return;
        }
        const fd = new FormData(e.currentTarget);
        start(async () => {
          if (await correrConAviso(action, fd, success)) alGuardar();
        });
      }}
    >
      {children}
      <Button type="submit" variant={variant} isLoading={pendiente} className="mt-1 min-h-12 w-full !text-[17px] font-semibold">
        {pendiente ? enviando : enviar}
      </Button>
    </form>
  );
}

/**
 * Una tarjeta (o lo que sea) que al tocarla abre su hoja. `boton` es el
 * contenido del área tocable; `children` lo que va en la hoja y recibe
 * `cerrar` para las acciones que terminan ahí.
 */
export function ConHoja({
  titulo,
  boton,
  etiqueta,
  className = '',
  children,
}: {
  titulo: string;
  boton: React.ReactNode;
  /** Nombre accesible del área tocable: "Ver la ficha de Lupita". */
  etiqueta: string;
  className?: string;
  children: (cerrar: () => void) => React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  const cerrar = () => setAbierta(false);
  return (
    <>
      <button
        type="button"
        aria-label={etiqueta}
        onClick={() => setAbierta(true)}
        className={`text-left transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
      >
        {boton}
      </button>
      <Modal open={abierta} onClose={cerrar} title={titulo} size="lg">
        {children(cerrar)}
      </Modal>
    </>
  );
}
