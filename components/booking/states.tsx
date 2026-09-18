'use client';

import { AlertCircle, CalendarX2, Loader2, RefreshCw, WifiOff } from 'lucide-react';

// Every one of these replaced a blank area. A flow that shows nothing
// while it thinks, or nothing when a day is full, reads as broken — and
// the visitor's only move is to leave.

export function LoadingSlots({ label = 'Buscando horarios disponibles' }: { label?: string }) {
  return (
    <div className="py-10 text-center" role="status" aria-live="polite">
      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <p className="mt-3 text-sm text-muted">{label}</p>
      {/* Skeleton rows so the space keeps its shape and the layout doesn't
          jump when the real times land. */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-ink/[0.06]" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Reintentar',
  offline = false,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  offline?: boolean;
}) {
  const Icon = offline ? WifiOff : AlertCircle;
  return (
    <div className="rounded-2xl border border-error/30 bg-error/[0.06] p-5 text-center" role="alert">
      <Icon className="mx-auto h-5 w-5 text-error" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

// A day with nothing free is not an error and shouldn't look like one —
// it's a fork with real exits. Never a dead end: the next open day, the
// dates again, and dropping the resource preference are all one tap.
export function NoSlotsState({
  nextDayLabel,
  onNextDay,
  onBackToDates,
  onAnyResource,
}: {
  nextDayLabel?: string | null;
  onNextDay?: () => void;
  onBackToDates: () => void;
  onAnyResource?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-paper p-6 text-center">
      <CalendarX2 className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-ink">Ese día ya se llenó</p>
      <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted">
        No quedan horarios libres. Estas son tus opciones:
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
        {nextDayLabel && onNextDay && (
          <button
            type="button"
            onClick={onNextDay}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.99]"
          >
            Ver el {nextDayLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onBackToDates}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-primary/40"
        >
          Elegir otra fecha
        </button>
        {onAnyResource && (
          <button
            type="button"
            onClick={onAnyResource}
            className="min-h-[44px] text-sm font-medium text-primary hover:underline"
          >
            Ver horarios con cualquiera disponible
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyCatalog({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border border-border bg-paper p-6 text-center">
      <p className="text-sm font-semibold text-ink">Todavía no hay {what}</p>
      <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted">
        Este negocio aún está terminando de configurar su agenda. Vuelve a intentarlo más tarde.
      </p>
    </div>
  );
}
