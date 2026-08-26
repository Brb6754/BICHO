'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import { tenantCtaStyle } from '@/lib/branding/colors';
import { reschedulePublicBooking } from './actions';

type Slot = { slot_start: string; slot_end: string };

export function RescheduleForm({
  bookingId,
  slug,
  resourceId,
  serviceTypeId,
  primaryColor,
  accentColor,
  onDone,
  onCancel,
}: {
  bookingId: string;
  slug: string;
  resourceId: string;
  serviceTypeId: string;
  primaryColor: string;
  accentColor: string;
  onDone: (newStartsAt: string) => void;
  onCancel: () => void;
}) {
  const ctaStyle = tenantCtaStyle(primaryColor, accentColor);
  const [allSlots, setAllSlots] = useState<Slot[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useMemo(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const from = format(new Date(), 'yyyy-MM-dd');
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 60);
      const to = format(toDate, 'yyyy-MM-dd');
      const { data, error: rpcError } = await supabase.rpc('get_available_slots', {
        p_resource_id: resourceId,
        p_service_type_id: serviceTypeId,
        p_from: from,
        p_to: to,
      });
      if (cancelled) return;
      setLoading(false);
      if (rpcError) {
        setError('No se pudo cargar la disponibilidad.');
        return;
      }
      setAllSlots((data as Slot[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on mount — resourceId/serviceTypeId never change for a
    // given booking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableDateKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSlots ?? []) set.add(format(new Date(s.slot_start), 'yyyy-MM-dd'));
    return set;
  }, [allSlots]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return (allSlots ?? []).filter((s) => format(new Date(s.slot_start), 'yyyy-MM-dd') === key);
  }, [allSlots, selectedDate]);

  async function confirmReschedule() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    const result = await reschedulePublicBooking(bookingId, slug, selectedSlot.slot_start, selectedSlot.slot_end);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone(selectedSlot.slot_start);
  }

  if (loading) {
    return <p className="text-sm text-muted">Cargando horarios disponibles...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-2xl bg-error-soft p-3 text-sm text-error">{error}</p>}
      {!selectedDate ? (
        <>
          <p className="text-sm font-medium text-muted">Elegí una nueva fecha</p>
          <Card className="flex justify-center">
            <AvailabilityCalendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              availableDateKeys={availableDateKeys}
              accentColor={accentColor}
            />
          </Card>
          {availableDateKeys.size === 0 && (
            <p className="text-center text-sm text-muted">No hay horarios disponibles en los próximos 60 días.</p>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setSelectedDate(undefined)}
            className="self-start text-xs text-muted hover:text-ink hover:underline"
          >
            ← Cambiar fecha
          </button>
          <p className="text-sm font-medium text-muted">
            Horarios para el {format(selectedDate, 'd MMMM', { locale: es })}
          </p>
          <div className="flex flex-wrap gap-2">
            {slotsForSelectedDate.map((slot) => {
              const isSelected = selectedSlot?.slot_start === slot.slot_start;
              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.97] ${
                    isSelected ? '' : 'border-border bg-surface text-ink'
                  }`}
                  style={isSelected ? { ...ctaStyle, borderColor: 'transparent' } : undefined}
                >
                  {format(new Date(slot.slot_start), 'h:mm a', { locale: es })}
                </button>
              );
            })}
            {slotsForSelectedDate.length === 0 && <p className="text-sm text-muted">Sin horarios ese día.</p>}
          </div>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmReschedule} disabled={!selectedSlot || submitting} style={ctaStyle}>
              {submitting ? 'Guardando...' : 'Confirmar nuevo horario'}
            </Button>
          </div>
        </>
      )}
      {!selectedDate && (
        <Button type="button" variant="ghost" onClick={onCancel} className="self-start">
          Cancelar
        </Button>
      )}
    </div>
  );
}
