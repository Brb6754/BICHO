'use client';

import { ArrowLeft, Check, Pencil } from 'lucide-react';
import type { StepDef, StepId } from './types';

// The flow's furniture: the header that never moves, the progress it
// reports, the summary of what's already decided, and the action bar
// pinned to the bottom of a phone.
//
// These exist because the old flow was a long page: you scrolled, and
// nothing told you where you were, how much was left, or what you had
// already chosen. Those three answers are now always on screen.

export function ProgressIndicator({
  steps,
  currentIndex,
}: {
  steps: StepDef[];
  currentIndex: number;
}) {
  return (
    <>
      {/* Phone: segments, not labels. Five words of step names eat the
          whole width and get truncated into nonsense. */}
      <ol className="flex gap-1.5 sm:hidden" aria-hidden="true">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < currentIndex ? 'bg-primary' : i === currentIndex ? 'bg-primary' : 'bg-ink/10'
            } ${i === currentIndex ? '' : i < currentIndex ? 'opacity-60' : ''}`}
          />
        ))}
      </ol>

      {/* Desktop has room for the names, so it uses them: a labelled
          step is a map, an unlabelled bar is only a percentage. */}
      <ol className="hidden items-center gap-2 sm:flex">
        {steps.map((s, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  current
                    ? 'bg-primary text-[rgb(var(--color-cta-fg))]'
                    : done
                      ? 'bg-primary/10 text-ink'
                      : 'text-muted'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                {done && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                {s.label}
              </span>
              {i < steps.length - 1 && <span className="h-px w-4 bg-border" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </>
  );
}

export function StepHeader({
  businessName,
  steps,
  currentIndex,
  onBack,
  canGoBack,
}: {
  businessName: string;
  steps: StepDef[];
  currentIndex: number;
  onBack: () => void;
  canGoBack: boolean;
}) {
  const step = steps[currentIndex];
  return (
    <header className="sticky top-0 z-20 -mx-5 border-b border-border bg-surface/95 px-5 py-3 backdrop-blur sm:mx-0 sm:rounded-t-[inherit] sm:px-6">
      <div className="flex items-center gap-3">
        {/* The back control keeps its space even when disabled, so the
            title doesn't shift sideways between steps. */}
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Volver al paso anterior"
          className="-ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted">{businessName}</p>
          <p className="truncate text-sm font-semibold text-ink">{step.label}</p>
        </div>

        <p className="shrink-0 text-xs font-medium tabular-nums text-muted" aria-live="polite">
          Paso {currentIndex + 1} de {steps.length}
        </p>
      </div>

      <div className="mt-3">
        <ProgressIndicator steps={steps} currentIndex={currentIndex} />
      </div>
    </header>
  );
}

export type SummaryItem = {
  id: StepId;
  label: string;
  value: string;
};

// Everything decided so far, always visible, each part editable in place.
// Editing one decision keeps the ones after it that still make sense —
// the flow doesn't restart because you changed your mind about the time.
export function SelectionSummary({
  items,
  onEdit,
}: {
  items: SummaryItem[];
  onEdit: (step: StepId) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3 sm:px-6">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onEdit(item.id)}
          className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span className="sr-only">Cambiar {item.label}: </span>
          <span className="truncate">{item.value}</span>
          <Pencil className="h-3 w-3 shrink-0 text-muted group-hover:text-primary" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

// Pinned to the bottom on a phone, so the way forward is never something
// you have to scroll to find. `pb-[env(safe-area-inset-bottom)]` keeps it
// clear of the home indicator.
export function StickyActionBar({
  hint,
  helper,
  actionLabel,
  onAction,
  disabled,
  loading,
}: {
  hint?: string;
  // What's missing, shown next to the button rather than leaving a dead
  // disabled control with no explanation.
  helper?: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-5 mt-6 border-t border-border bg-surface/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:mx-0 sm:rounded-b-[inherit] sm:px-6">
      {helper && (
        <p className="mb-2 text-xs font-medium text-error" role="status">
          {helper}
        </p>
      )}
      <div className="flex items-center gap-4">
        {hint && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{hint}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onAction}
          disabled={disabled || loading}
          className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-muted ${hint ? '' : 'flex-1'}`}
        >
          {loading && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          )}
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

// Desktop turns the bottom bar into a column that stays beside the step.
// The same information, but it never covers content and never needs to be
// scrolled to — which is the actual complaint about a sticky bar on a
// wide screen: it steals the bottom of a viewport that has room to spare.
export function SidePanel({
  rows,
  total,
  helper,
  actionLabel,
  onAction,
  disabled,
  loading,
  footnote,
}: {
  rows: { label: string; value: string }[];
  total?: string;
  helper?: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  loading?: boolean;
  footnote?: string;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-28 rounded-2xl border border-border bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink">Tu reserva</h2>

        {rows.length === 0 ? (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Aquí se va armando tu cita conforme eliges.
          </p>
        ) : (
          <dl className="mt-3">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-b-0"
              >
                <dt className="shrink-0 text-xs text-muted">{row.label}</dt>
                <dd className="text-right text-[13px] font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {total && (
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-xs text-muted">Total</span>
            <span className="text-lg font-bold tabular-nums text-ink">{total}</span>
          </div>
        )}

        {helper && (
          <p className="mt-3 text-xs font-medium text-error" role="status">
            {helper}
          </p>
        )}

        <button
          type="button"
          onClick={onAction}
          disabled={disabled || loading}
          className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-muted"
        >
          {loading && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          )}
          {actionLabel}
        </button>

        {footnote && <p className="mt-3 text-xs leading-relaxed text-muted">{footnote}</p>}
      </div>
    </aside>
  );
}
