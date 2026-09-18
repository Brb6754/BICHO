// The one header every dashboard page shares. Before this, each page
// hand-assembled <Text h1> + <Text body> with slightly different spacing,
// so moving between sections felt like moving between different apps.
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border pb-6">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-medium text-muted first-letter:uppercase">{eyebrow}</p>}
        <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2rem]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="flex items-baseline gap-2.5 text-base font-semibold text-ink">
        {title}
        {meta !== undefined && <span className="text-sm font-normal tabular-nums text-muted">{meta}</span>}
      </h2>
      {action}
    </div>
  );
}
