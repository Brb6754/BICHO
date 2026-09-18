'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SlotPicker, type PickedSlot } from '@/components/tenant-dash/SlotPicker';
import { appointmentWhen } from '@/lib/dates/tenantTime';
import { rescheduleBookingFromDashboard } from './actions';

// "¿Me lo pasas a las 5?" — said on the phone, every day, in every one of
// these businesses. The customer could already move their own appointment
// from the link in their email; the person running the shop could only
// cancel it and start over. This closes that.
export function RescheduleButton({
  bookingId,
  slug,
  serviceId,
  serviceName,
  resourceId,
  currentStart,
  timezone,
}: {
  bookingId: string;
  slug: string;
  serviceId: string;
  serviceName: string;
  resourceId: string;
  currentStart: string;
  timezone: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!slot) return;
    setSaving(true);
    setError(null);
    const result = await rescheduleBookingFromDashboard(
      bookingId,
      slug,
      slot.slot_start,
      slot.slot_end
    );
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setSlot(null);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs"
      >
        Cambiar hora
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Cambiar la hora de la cita">
        <p className="mb-4 text-sm text-muted">
          {serviceName} · ahora está el{' '}
          <strong className="text-ink">{appointmentWhen(currentStart, timezone)}</strong>.
        </p>

        {/* Service and resource stay fixed: this is the same appointment
            moving, not a new one. Only free slots for that same pair are
            offered, so a move can't land on top of another booking. */}
        <SlotPicker
          services={[]}
          resources={[]}
          timezone={timezone}
          serviceId={serviceId}
          resourceId={resourceId}
          picked={slot}
          onPick={setSlot}
        />

        {error && (
          <p className="mt-4 rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={save} isLoading={saving} disabled={!slot}>
            {saving ? 'Cambiando' : 'Mover la cita'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Si el cliente dejó su correo, le llega un aviso con la hora nueva.
        </p>
      </Modal>
    </>
  );
}
