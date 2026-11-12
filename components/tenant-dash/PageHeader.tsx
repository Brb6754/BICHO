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
  // `eyebrow` (a date, a count) renders UNDER the title as its meta
  // line, not above it as a kicker: the title is what the eye should
  // land on first. The prop keeps its name so no page had to change.
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-2">
      <div className="min-w-0">
        <h1 className="text-[1.9rem] font-semibold leading-[1.08] tracking-[-0.025em] text-ink [text-wrap:balance] sm:text-[2.35rem]">
          {title}
        </h1>
        {eyebrow && <p className="mt-2 text-[15px] font-medium text-muted first-letter:uppercase">{eyebrow}</p>}
        {description && (
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted [text-wrap:pretty]">{description}</p>
        )}
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
