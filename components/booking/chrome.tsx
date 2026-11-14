'use client';

import { ArrowLeft, Check, Pencil } from 'lucide-react';
import type { StepDef, StepId } from './types';
import motion from './motion.module.css';

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
      {/* Phone: one track that fills, not labels. Five words of step
          names eat the whole width and get truncated into nonsense. The
          fill glides, so moving forward feels like progress. */}
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10 sm:hidden" aria-hidden="true">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

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
  logoUrl,
  steps,
  currentIndex,
  onBack,
  canGoBack,
}: {
  businessName: string;
  // Solo cuando la página tiene portada: al plegarse, el logo y el nombre
  // se quedan aquí, en la barra, para que nunca se pierda de quién es.
  logoUrl?: string | null;
  steps: StepDef[];
  currentIndex: number;
  onBack: () => void;
  canGoBack: boolean;
}) {
  const step = steps[currentIndex];
  return (
    <header className="sticky top-0 z-20 rounded-t-[inherit] border-b border-border bg-surface/90 px-5 py-3 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        {/* The back control keeps its space even when disabled, so the
            title doesn't shift sideways between steps. */}
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Volver al paso anterior"
          className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            className={`${motion.barIn} h-9 w-9 shrink-0 rounded-[11px] bg-white object-contain p-1 ring-1 ring-border`}
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[15px] font-semibold leading-tight text-ink"
            style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))', letterSpacing: 'var(--tpl-heading-tracking)' }}
          >
            {businessName}
          </p>
          <p className="truncate text-xs text-muted" aria-live="polite">
            Paso {currentIndex + 1} de {steps.length} · {step.label}
          </p>
        </div>
      </div>

      <div className="mt-2.5">
        <ProgressIndicator steps={steps} currentIndex={currentIndex} />
      </div>
    </header>
  );
}

// Each step opens with its question set large, in the template's own
// heading face. The question IS the page at that moment; at 16px
// semibold it read like a form label and every template looked the same.
export function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h2
        className="text-balance text-[1.65rem] font-semibold leading-[1.1] text-ink sm:text-[2rem]"
        style={{
          fontFamily: 'var(--tpl-heading-font, var(--font-heading))',
          letterSpacing: 'var(--tpl-heading-tracking)',
        }}
      >
        {title}
      </h2>
      {hint && <p className="mt-2 text-sm leading-relaxed text-muted">{hint}</p>}
    </div>
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
      <Check className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2.5} aria-hidden="true" />
      {items.map((item) => (
        <button
          key={item.id + item.value}
          type="button"
          onClick={() => onEdit(item.id)}
          className={`${motion.chipIn} group inline-flex min-h-[32px] max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
        >
          <span className="sr-only">Cambiar {item.label}: </span>
          <span className="truncate">{item.value}</span>
          <Pencil className="h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" aria-hidden="true" />
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
  hintSub,
  helper,
  actionLabel,
  onAction,
  disabled,
  loading,
}: {
  hint?: string;
  hintSub?: string;
  // What's missing, shown next to the button rather than leaving a dead
  // disabled control with no explanation.
  helper?: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-20 mt-6 border-t border-border bg-surface/90 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:rounded-b-[inherit] sm:px-6">
      {helper && (
        <p className="mb-2 text-xs font-medium text-error" role="status">
          {helper}
        </p>
      )}
      <div className="flex items-center gap-4">
        {hint && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{hint}</p>
            {hintSub && <p className="truncate text-xs tabular-nums text-muted">{hintSub}</p>}
          </div>
        )}
        <button
          key={disabled ? 'off' : 'on'}
          type="button"
          onClick={onAction}
          disabled={disabled || loading}
          className={`${disabled ? '' : motion.wake} inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.6)] disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-muted disabled:shadow-none ${hint ? 'shrink-0' : 'flex-1'}`}
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
      <div className="sticky top-28 rounded-2xl bg-paper p-5 ring-1 ring-border">
        <h2
          className="text-lg font-semibold text-ink"
          style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))', letterSpacing: 'var(--tpl-heading-tracking)' }}
        >
          Tu reserva
        </h2>

        {rows.length === 0 ? (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Aquí se va armando tu cita conforme eliges.
          </p>
        ) : (
          <dl className="mt-3">
            {rows.map((row) => (
              <div
                key={row.label + row.value}
                className={`${motion.chipIn} flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-b-0`}
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
            <span
              className="text-2xl font-semibold tabular-nums text-ink"
              style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))' }}
            >
              {total}
            </span>
          </div>
        )}

        {helper && (
          <p className="mt-3 text-xs font-medium text-error" role="status">
            {helper}
          </p>
        )}

        <button
          key={disabled ? 'off' : 'on'}
          type="button"
          onClick={onAction}
          disabled={disabled || loading}
          className={`${disabled ? '' : motion.wake} mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-[rgb(var(--color-cta-fg))] shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.6)] transition hover:-translate-y-px active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-muted disabled:shadow-none motion-reduce:transform-none`}
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
