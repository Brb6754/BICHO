import { Check, UserX, X } from 'lucide-react';
import { dayKey, dayLabel, formatTime, groupByDay, minutesBetween } from '@/lib/dates/tenantTime';

export type AgendaBooking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  // Optional because the Resumen lists appointments without them; the
  // Agenda selects them so it can offer "cambiar hora", which has to
  // reuse the SAME service and resource the appointment already has.
  resource_id?: string;
  service_type_id?: string;
  resources: { name: string } | null;
  service_types: { name: string } | null;
  customers: { name: string; phone?: string | null } | null;
};

// The agenda, grouped by the tenant's LOCAL day.
//
// Replaces rows that read
//   "15 sept 2026, 10:00 — Silla 1 — Corte — Juan Pérez"
// one card each. That string made the owner parse four facts out of one
// line of prose on every row, and the date repeated on every row of the
// same day. Now: the day is said once as a heading, the time sits in its
// own aligned column (the thing an owner scans for), the service is the
// primary line, and the customer is right under it.
//
// Times go through lib/dates/tenantTime, never toLocaleString(): this is a
// Server Component, and on Vercel toLocaleString() formats in UTC.
export function AgendaList({
  bookings,
  timezone,
  now,
  renderAction,
  emptyTitle,
  emptyHint,
  hideDayHeader = false,
}: {
  bookings: AgendaBooking[];
  timezone: string | null;
  now: Date;
  renderAction?: (booking: AgendaBooking) => React.ReactNode;
  emptyTitle: string;
  emptyHint: string;
  // For a list that is already under a "Hoy" heading (Resumen), where a
  // second "Hoy · 3 citas" right below it just repeats the page.
  hideDayHeader?: boolean;
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium text-ink">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">{emptyHint}</p>
      </div>
    );
  }

  const days = groupByDay(bookings, (b) => b.starts_at, timezone);
  const todayKey = dayKey(now, timezone);

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => {
        const label = dayLabel(day.key, now, timezone);
        const active = day.items.filter((b) => b.status !== 'cancelled').length;
        const isToday = day.key === todayKey;
        // Where "now" falls in today's list: before the first appointment
        // that hasn't started yet. Red, like every calendar app, because
        // that's the convention an owner already reads. Only drawn when
        // there is something on both sides of it; a line above or below
        // everything says nothing the times don't already say.
        const nowIndex = isToday ? day.items.findIndex((b) => new Date(b.starts_at) > now) : -1;
        const showNow = nowIndex > 0;

        return (
          <section key={day.key} aria-label={label}>
            {!hideDayHeader && (
              <div className="mb-2 flex items-baseline justify-between gap-4 px-4 sm:px-5">
                <h3 className={'text-sm font-semibold first-letter:uppercase ' + (isToday ? 'text-ink' : 'text-muted')}>
                  {label}
                </h3>
                <span className="text-xs tabular-nums text-muted">
                  {active} {active === 1 ? 'cita' : 'citas'}
                </span>
              </div>
            )}

            {/* One surface per DAY, not one card per booking. */}
            <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
              {day.items.map((b, i) => {
                const cancelled = b.status === 'cancelled';
                const completed = b.status === 'completed';
                // Settled: the appointment has an outcome and nothing
                // more is going to happen to it. Kept as one name
                // because three places below ask the same question.
                const noShow = b.status === 'no_show';
                const past = isToday && new Date(b.ends_at) <= now;
                const dim = (cancelled || past || completed) && !noShow;
                return (
                  <li key={b.id} className={i > 0 && !(showNow && i === nowIndex) ? 'border-t border-border' : ''}>
                    {showNow && i === nowIndex && (
                      <div className="flex items-center gap-3 px-4 sm:px-5" aria-label={'Ahora, ' + formatTime(now.toISOString(), timezone)}>
                        <span className="w-[4rem] text-xs font-semibold text-error dark:text-[#F87171] sm:w-[4.5rem]">
                          Ahora
                        </span>
                        <span className="relative h-px flex-1 bg-error/70 dark:bg-[#F87171]/70" aria-hidden="true">
                          <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-error dark:bg-[#F87171]" />
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:px-5">
                      <div className={dim ? 'opacity-50' : ''}>
                        <p className="font-semibold tabular-nums text-ink">{formatTime(b.starts_at, timezone)}</p>
                        <p className="text-xs tabular-nums text-muted">{minutesBetween(b.starts_at, b.ends_at)} min</p>
                      </div>

                      <div className={'min-w-0 ' + (dim ? 'opacity-50' : '')}>
                        <p className={'truncate font-medium text-ink ' + (cancelled ? 'line-through decoration-ink/40' : '')}>
                          {b.service_types?.name ?? 'Servicio'}
                        </p>
                        <p className="truncate text-sm text-muted">
                          {b.customers?.name ?? 'Cliente'}
                          {b.resources?.name && <span className="text-muted/70"> &middot; {b.resources.name}</span>}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        {/* On a phone the word pills squeezed the service
                            name into "Corte y pein…". There, the state is
                            an icon (with its name for screen readers);
                            from sm up there's room for the word. */}
                        {cancelled && (
                          <span className="flex items-center gap-1.5 rounded-full bg-error-soft p-1 text-xs font-medium text-error sm:px-2.5 sm:py-0.5">
                            <X className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">Cancelada</span>
                          </span>
                        )}
                        {completed && (
                          <span className="flex items-center gap-1.5 rounded-full bg-ink/[0.06] p-1 text-xs font-medium text-muted sm:px-2.5 sm:py-0.5">
                            <Check className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">Completada</span>
                          </span>
                        )}
                        {/* A no-show is the one outcome that is NOT
                            dimmed into the background: an owner looking
                            back over the week is looking for exactly
                            these, so the row keeps its colour and the
                            label is the only one that isn't grey. */}
                        {noShow && (
                          <span className="flex items-center gap-1.5 rounded-full bg-warning-soft p-1 text-xs font-medium text-warning sm:px-2.5 sm:py-0.5">
                            <UserX className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">No vino</span>
                          </span>
                        )}
                        {!cancelled && !completed && !noShow && renderAction?.(b)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
