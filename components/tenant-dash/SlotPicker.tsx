'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addDaysKey, dayKey, formatTime, longDate } from '@/lib/dates/tenantTime';

// Picking a free slot, for the two staff actions that need one: booking
// someone in by hand, and moving an appointment.
//
// It asks the SAME function the public page asks (get_available_slots),
// so the owner can never book a time the system wouldn't offer a customer
// — including time they blocked off. Doing it any other way would be how
// double bookings get back in through the back door.

export type PickedSlot = { slot_start: string; slot_end: string };

type Option = { id: string; name: string };

export function SlotPicker({
  services,
  resources,
  timezone,
  serviceId,
  resourceId,
  onServiceChange,
  onResourceChange,
  onPick,
  picked,
}: {
  services: (Option & { duration_minutes: number })[];
  resources: Option[];
  timezone: string | null;
  serviceId: string;
  resourceId: string;
  // Absent when the caller fixes the service/resource (rescheduling keeps
  // both: it's the same appointment, only the time moves).
  onServiceChange?: (id: string) => void;
  onResourceChange?: (id: string) => void;
  onPick: (slot: PickedSlot | null) => void;
  picked: PickedSlot | null;
}) {
  const [slots, setSlots] = useState<PickedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<string>(() => dayKey(new Date(), timezone));

  const load = useCallback(async () => {
    if (!serviceId || !resourceId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const from = dayKey(new Date(), timezone);
    const { data, error: rpcError } = await supabase.rpc('get_available_slots', {
      p_resource_id: resourceId,
      p_service_type_id: serviceId,
      p_from: from,
      p_to: addDaysKey(from, 60),
    });
    setLoading(false);
    if (rpcError) {
      setError('No se pudieron cargar los horarios libres.');
      return;
    }
    const loaded = (data as PickedSlot[]) ?? [];
    setSlots(loaded);

    // Land on a day that actually has something free. The state started
    // on "today", but a <select> whose value matches no option displays
    // its FIRST one — so it read "23 de septiembre" while the component
    // still thought the day was today, and showed zero times with no
    // explanation for why.
    const days = [...new Set(loaded.map((s) => dayKey(s.slot_start, timezone)))].sort();
    setDay((current) => (days.includes(current) ? current : (days[0] ?? current)));
  }, [serviceId, resourceId, timezone]);

  useEffect(() => {
    load();
    onPick(null);
    // onPick is a fresh closure on every render of the parent; depending
    // on it here would re-run this on every keystroke in the form above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const daysWithSlots = [...new Set(slots.map((s) => dayKey(s.slot_start, timezone)))].sort();
  const slotsForDay = slots.filter((s) => dayKey(s.slot_start, timezone) === day);

  return (
    <div className="flex flex-col gap-4">
      {onServiceChange && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Servicio</span>
          <select
            value={serviceId}
            onChange={(e) => onServiceChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 sm:text-sm"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.duration_minutes} min
              </option>
            ))}
          </select>
        </label>
      )}

      {onResourceChange && resources.length > 1 && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Quién atiende</span>
          <select
            value={resourceId}
            onChange={(e) => onResourceChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 sm:text-sm"
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Día</span>
        {loading ? (
          <p className="py-2 text-sm text-muted">Buscando horarios libres…</p>
        ) : error ? (
          <p className="py-2 text-sm text-error">{error}</p>
        ) : daysWithSlots.length === 0 ? (
          <p className="rounded-xl bg-elevated px-3 py-2.5 text-sm text-muted">
            No hay horarios libres en los próximos 60 días. Revisa el horario semanal o los
            bloqueos de abajo.
          </p>
        ) : (
          <select
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              onPick(null);
            }}
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 sm:text-sm"
          >
            {daysWithSlots.map((d) => (
              <option key={d} value={d}>
                {longDate(`${d}T12:00:00Z`, timezone)}
              </option>
            ))}
          </select>
        )}
      </div>

      {slotsForDay.length > 0 && (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">Hora</span>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slotsForDay.map((s) => {
              const selected = picked?.slot_start === s.slot_start;
              return (
                <button
                  key={s.slot_start}
                  type="button"
                  onClick={() => onPick(s)}
                  aria-pressed={selected}
                  className={`min-h-[44px] rounded-xl border px-1 text-sm tabular-nums transition-colors ${
                    selected
                      ? 'border-primary bg-primary font-semibold text-[rgb(var(--color-cta-fg))]'
                      : 'border-border bg-surface text-ink hover:border-primary/50'
                  }`}
                >
                  {formatTime(s.slot_start, timezone)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
