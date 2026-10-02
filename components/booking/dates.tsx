'use client';

import { useEffect } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { AvailabilityCalendar } from './AvailabilityCalendar';

// Dates come in two sizes. The strip answers "this week?" in one glance
// and one tap, which is what most people want; the full month is one tap
// further for the person booking three weeks out. Leading with a month
// grid made everyone pay the cost of the rarer case.

export type StripDay = {
  key: string; // yyyy-MM-dd in the tenant's timezone
  weekday: string; // "mié"
  dayNumber: string; // "30"
  available: boolean;
  isToday: boolean;
};

export function DateStrip({
  days,
  selectedKey,
  onSelect,
  onOpenCalendar,
}: {
  days: StripDay[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onOpenCalendar: () => void;
}) {
  return (
    <div>
      {/* Horizontal scroll with snap, and `-mx-5 px-5` so the row bleeds
          to the screen edges on a phone instead of stopping short inside
          the card's padding, which made it look clipped. */}
      <ul className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        {days.map((day) => {
          const selected = day.key === selectedKey;
          return (
            <li key={day.key} className="snap-start">
              <button
                type="button"
                onClick={() => onSelect(day.key)}
                disabled={!day.available}
                aria-pressed={selected}
                className={`flex min-h-[72px] w-[60px] flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  selected
                    ? 'border-primary bg-primary text-[rgb(var(--color-cta-fg))] ring-1 ring-primary'
                    : day.available
                      ? 'border-border bg-surface text-ink hover:border-primary/50 hover:bg-primary/5'
                      : 'cursor-not-allowed border-border bg-paper text-muted opacity-60'
                }`}
              >
                <span className="text-[11px] font-medium uppercase">{day.weekday}</span>
                <span className={`text-lg leading-none tabular-nums ${selected ? 'font-bold' : 'font-semibold'}`}>
                  {day.dayNumber}
                </span>
                {/* Availability is a dot AND the disabled treatment, so it
                    survives without colour. */}
                <span
                  aria-hidden="true"
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                    selected ? 'bg-[rgb(var(--color-cta-fg))]' : day.available ? 'bg-primary' : 'bg-transparent'
                  }`}
                />
                <span className="sr-only">
                  {day.isToday ? 'Hoy. ' : ''}
                  {day.available ? 'Con horarios' : 'Sin horarios'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onOpenCalendar}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        Ver calendario completo
      </button>
    </div>
  );
}

export function CalendarSheet({
  open,
  onClose,
  selected,
  onSelect,
  availableDateKeys,
  accentColor,
  onToday,
}: {
  open: boolean;
  onClose: () => void;
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  availableDateKeys: Set<string>;
  accentColor: string;
  onToday: () => void;
}) {
  // Escape closes, and the page behind stops scrolling while it's open —
  // a sheet you can scroll past is a sheet people think is broken.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Bottom sheet on a phone, centred dialog from sm up. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Elegir fecha"
        className="animate-fade-in relative w-full max-w-sm rounded-t-3xl border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg sm:rounded-3xl sm:pb-5"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Elige una fecha</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToday}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AvailabilityCalendar
          selected={selected}
          onSelect={(date) => {
            onSelect(date);
            onClose();
          }}
          availableDateKeys={availableDateKeys}
          accentColor={accentColor}
        />

        <p className="mt-2 text-center text-xs text-muted">
          Los días sin horarios aparecen apagados y no se pueden elegir.
        </p>
      </div>
    </div>
  );
}
