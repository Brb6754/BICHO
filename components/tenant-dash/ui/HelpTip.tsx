import { useId } from 'react';
import { CircleHelp } from 'lucide-react';

// "¿QUÉ ES ESTO?" — la ayuda que se abre con el dedo.
//
// Un tooltip de hover no existe en un teléfono, y ahí vive la dueña. Esto
// es un botón de 44px que abre una tarjeta corta con el atributo nativo
// `popover`: el navegador ya resuelve cerrar con Esc, con un toque
// afuera, el foco y la capa de encima, sin una línea de JavaScript nuestro
// (funciona igual en server components).
//
//   <HelpTip title="¿Qué es el horario?">
//     Las horas en que cada persona puede recibir citas. Fuera de ellas tu
//     página no ofrece nada.
//   </HelpTip>
//
// `label` cambia el texto visible ("¿Qué es esto?") por otro; sin él solo
// se ve el ícono, con su nombre accesible.
export function HelpTip({
  title,
  label,
  children,
}: {
  title: string;
  label?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={label ? undefined : `Ayuda: ${title}`}
        className="inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center gap-1.5 rounded-full px-2 align-middle text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <CircleHelp className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        {label && <span className="underline decoration-dotted underline-offset-4">{label}</span>}
      </button>
      <div
        id={id}
        popover="auto"
        role="dialog"
        aria-label={title}
        // Sin posicionamiento anclado (aún no llega a todos los navegadores):
        // tarjeta abajo en el teléfono, centrada en la computadora.
        className="help-tip m-0 mt-auto w-full max-w-none rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-left text-ink shadow-2xl sm:m-auto sm:max-w-sm sm:rounded-3xl sm:pb-5"
      >
        <p className="text-[15px] font-semibold">{title}</p>
        <div className="mt-1.5 text-sm leading-relaxed text-muted">{children}</div>
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          className="mt-4 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-ink/[0.07] text-sm font-semibold text-ink transition-colors hover:bg-ink/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Entendido
        </button>
      </div>
    </>
  );
}
