'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SlotPicker, type PickedSlot } from '@/components/tenant-dash/SlotPicker';
import { appointmentWhen } from '@/lib/dates/tenantTime';
import { createStaffBooking } from './actions';

// Booking someone in from behind the counter. The one thing the dashboard
// couldn't do, and the reason an owner would keep a paper notebook beside
// it — which is how the system ends up with half the day and books a
// walk-in's slot out from under them.
export function NewBookingForm({
  slug,
  services,
  resources,
  timezone,
}: {
  slug: string;
  services: { id: string; name: string; duration_minutes: number }[];
  resources: { id: string; name: string }[];
  timezone: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? '');
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (services.length === 0 || resources.length === 0) return null;

  async function save() {
    if (!slot) {
      setError('Elige un horario.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createStaffBooking({
      slug,
      resourceId,
      serviceTypeId: serviceId,
      startsAt: slot.slot_start,
      endsAt: slot.slot_end,
      customerName: name,
      customerPhone: phone,
      notes,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setName('');
    setPhone('');
    setNotes('');
    setSlot(null);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Agendar una cita
      </Button>
    );
  }

  const field =
    'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 sm:text-sm';

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Agendar una cita</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Para quien llamó o llegó al local. Ocupa el horario igual que una reserva en línea.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <SlotPicker
          services={services}
          resources={resources}
          timezone={timezone}
          serviceId={serviceId}
          resourceId={resourceId}
          onServiceChange={setServiceId}
          onResourceChange={setResourceId}
          picked={slot}
          onPick={setSlot}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Nombre del cliente</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="María Fernanda"
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Teléfono</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="618 123 4567"
              className={field}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Nota <span className="font-normal text-muted">(opcional)</span>
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Llega 10 min antes, paga en efectivo…"
            className={field}
          />
        </label>

        {slot && (
          <p className="rounded-xl bg-elevated px-3 py-2.5 text-[13px] text-ink">
            Vas a agendar el <strong>{appointmentWhen(slot.slot_start, timezone)}</strong>.
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={save} isLoading={saving}>
            {saving ? 'Agendando' : 'Agendar cita'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-muted">
          No le llega correo al cliente: aquí no pedimos su correo. Si quieres que reciba la
          confirmación y el enlace para cambiarla, pásale tu página de reservas.
        </p>
      </div>
    </div>
  );
}
