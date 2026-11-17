// The one header every dashboard page shares. Before this, each page
// hand-assembled <Text h1> + <Text body> with slightly different spacing,
// so moving between sections felt like moving between different apps.
//
// Anatomía (docs/UX-PANEL.md → "Anatomía de una página"):
//   title        nombre humano de la sección, el mismo que en el menú.
//   description  UNA frase: para qué le sirve esto a la dueña.
//   help         opcional, un <HelpTip> junto al título para "¿qué es esto?".
//   action       LA acción principal (una sola). En el teléfono baja y
//                ocupa todo el ancho, donde el pulgar la encuentra.
//   actions      secundarias (ver ejemplo, filtros); más discretas.
export function PageHeader({
  eyebrow,
  title,
  description,
  help,
  action,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  help?: React.ReactNode;
  action?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  // `eyebrow` (a date, a count) renders UNDER the title as its meta
  // line, not above it as a kicker: the title is what the eye should
  // land on first. The prop keeps its name so no page had to change.
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-2">
      <div className="min-w-0 flex-1 basis-72">
        <div className="flex items-center gap-1">
          <h1 className="text-[1.9rem] font-semibold leading-[1.08] tracking-[-0.025em] text-ink [text-wrap:balance] sm:text-[2.35rem]">
            {title}
          </h1>
          {help}
        </div>
        {eyebrow && <p className="mt-2 text-[15px] font-medium text-muted first-letter:uppercase">{eyebrow}</p>}
        {description && (
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted [text-wrap:pretty]">{description}</p>
        )}
      </div>
      {(action || actions) && (
        // En el teléfono: fila completa, la principal primero y estirada.
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {action && <div className="max-sm:flex-1 max-sm:[&>*]:w-full">{action}</div>}
          {actions}
        </div>
      )}
    </header>
  );
}

// A section heading inside a page, with an optional count or link on
// the right. Deliberately not a card: sections are separated by space
// and a label, not by boxing everything.
export function SectionHeading({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex min-h-[2.75rem] items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink">
        {title}
        {meta !== undefined && (
          <span className="rounded-full bg-ink/[0.07] px-2 py-0.5 text-xs font-semibold tabular-nums text-ink">{meta}</span>
        )}
      </h2>
      {action}
    </div>
  );
}
