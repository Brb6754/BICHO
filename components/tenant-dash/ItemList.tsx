// Shared list primitives for the dashboard's management pages (services,
// resources, schedule).
//
// Every one of those pages was "one Card per row" with a text button
// reading "Desactivar" / "Activar" and a "inactivo" badge. Three problems:
// a stack of separate boxes for what is one list; the current state was
// expressed twice (badge + the opposite verb on the button); and you had
// to read a word to learn whether something was on. A single surface
// with hairline rows and a real switch fixes all three.

export function ItemList({ children }: { children: React.ReactNode }) {
  return <ul className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</ul>;
}

export function ItemRow({
  title,
  meta,
  inactive = false,
  lead,
  trail,
  first = false,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  inactive?: boolean;
  // Optional aligned column before the title (e.g. a weekday).
  lead?: React.ReactNode;
  // Switch + menu, right-aligned.
  trail?: React.ReactNode;
  first?: boolean;
}) {
  return (
    <li
      className={
        'flex items-center gap-4 px-4 py-3.5 sm:px-5 ' + (first ? '' : 'border-t border-border')
      }
    >
      {lead && <div className="w-24 shrink-0 text-sm font-medium text-muted">{lead}</div>}
      <div className={'min-w-0 flex-1 transition-opacity ' + (inactive ? 'opacity-50' : '')}>
        <p className="truncate font-medium text-ink">{title}</p>
        {meta && <p className="mt-0.5 truncate text-sm tabular-nums text-muted">{meta}</p>}
      </div>
      {trail && <div className="flex shrink-0 items-center gap-1.5">{trail}</div>}
    </li>
  );
}

// A submit button that LOOKS like a switch. It has to stay a submit
// button inside the existing <form action={serverAction}>, because the
// toggle actions are server actions bound with .bind() — this changes
// only how the control reads, not what it sends.
export function ActiveSwitch({ active, label }: { active: boolean; label: string }) {
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={active}
      aria-label={(active ? 'Desactivar ' : 'Activar ') + label}
      title={active ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar'}
      className={
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ' +
        (active ? 'bg-primary' : 'bg-ink/15')
      }
    >
      <span
        aria-hidden="true"
        className={
          'inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ' +
          (active ? 'translate-x-5' : 'translate-x-1')
        }
        style={{ width: 18, height: 18 }}
      />
    </button>
  );
}

// A quiet surface for "add a new one", so the form reads as a tool
// sitting above the list rather than as a second, competing card.
export function AddBar({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-ink/[0.03] p-4 sm:p-5">{children}</div>;
}
