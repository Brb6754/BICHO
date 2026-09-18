'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import { tenantCtaStyle } from '@/lib/branding/colors';
import { addDaysKey, dayKey, formatTime } from '@/lib/dates/tenantTime';
import { reschedulePublicBooking } from './actions';

type Slot = { slot_start: string; slot_end: string };

// Same vocabulary as the booking flow (components/booking/BookingFlow.tsx)
// on purpose: a customer changing their appointment should recognise the
// calendar and the grid of times they booked with, not meet a second,
// older-looking picker. Every day and time is the BUSINESS's local time.
export function RescheduleForm({
  bookingId,
  slug,
  resourceId,
  serviceTypeId,
  primaryColor,
  accentColor,
  timezone,
  onDone,
  onCancel,
}: {
  bookingId: string;
  slug: string;
  resourceId: string;
  serviceTypeId: string;
  primaryColor: string;
  accentColor: string;
  timezone: string | null;
  onDone: (newStartsAt: string) => void;
  onCancel: () => void;
}) {
  const ctaStyle = tenantCtaStyle(primaryColor, accentColor);
  const [allSlots, setAllSlots] = useState<Slot[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Was a useMemo doing a fetch, which React may run twice or skip. A
  // side effect belongs in an effect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const from = dayKey(new Date(), timezone);
      const { data, error: rpcError } = await supabase.rpc('get_available_slots', {
        p_resource_id: resourceId,
        p_service_type_id: serviceTypeId,
        p_from: from,
        p_to: addDaysKey(from, 60),
      });
      if (cancelled) return;
      if (rpcError) {
        setError('No se pudo cargar la disponibilidad. Recarga la página para intentar de nuevo.');
        setAllSlots([]);
        return;
      }
      setAllSlots((data as Slot[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [resourceId, serviceTypeId, timezone]);

  const availableDateKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSlots ?? []) set.add(dayKey(s.slot_start, timezone));
    return set;
  }, [allSlots, timezone]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return (allSlots ?? []).filter((s) => dayKey(s.slot_start, timezone) === key);
  }, [allSlots, selectedDate, timezone]);

  async function confirmReschedule() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    const result = await reschedulePublicBooking(bookingId, slug, selectedSlot.slot_start, selectedSlot.slot_end);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      setSelectedSlot(null);
      return;
    }
    onDone(selectedSlot.slot_start);
  }

  const promptStyle: React.CSSProperties = {
    fontFamily: 'var(--tpl-heading-font, var(--font-heading))',
    letterSpacing: 'var(--tpl-heading-tracking)',
  };

  if (allSlots === null) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Buscando horarios disponibles
      </p>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold text-ink" style={promptStyle}>
          {selectedDate ? '¿A qué hora?' : '¿Qué día te viene mejor?'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          No cambiar
        </button>
      </div>

      {error && (
        <p className="rounded-2xl bg-error-soft px-4 py-3 text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {!selectedDate ? (
        <>
          <div className="flex justify-center rounded-2xl border border-ink/[0.08] py-2">
            <AvailabilityCalendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              availableDateKeys={availableDateKeys}
              accentColor={accentColor}
            />
          </div>
          {availableDateKeys.size === 0 && !error && (
            <p className="text-center text-sm text-muted">
              No hay horarios libres en los próximos 60 días. Contacta al negocio para moverla.
            </p>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(undefined);
              setSelectedSlot(null);
            }}
            className="self-start rounded-full text-sm font-medium text-ink first-letter:uppercase underline decoration-2 underline-offset-4 hover:opacity-60"
            style={{ textDecorationColor: accentColor }}
          >
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </button>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slotsForSelectedDate.map((slot) => {
              const isSelected = selectedSlot?.slot_start === slot.slot_start;
              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  aria-pressed={isSelected}
                  className={`rounded-xl border py-2.5 text-center text-sm font-medium tabular-nums transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isSelected ? '' : 'border-ink/[0.09] bg-surface text-ink hover:border-ink/25'
                  }`}
                  style={isSelected ? { ...ctaStyle, borderColor: 'transparent' } : undefined}
                >
                  {formatTime(slot.slot_start, timezone)}
                </button>
              );
            })}
            {slotsForSelectedDate.length === 0 && (
              <p className="col-span-full text-sm text-muted">Ya no quedan horarios ese día.</p>
            )}
          </div>

          <button
            type="button"
            onClick={confirmReschedule}
            disabled={!selectedSlot || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent px-5 py-3 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 sm:self-start"
            style={{ ...ctaStyle, ['--tw-ring-color' as string]: accentColor }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {selectedSlot
              ? `Mover mi cita a las ${formatTime(selectedSlot.slot_start, timezone)}`
              : 'Elige una hora'}
          </button>
        </>
      )}
    </div>
  );
}
