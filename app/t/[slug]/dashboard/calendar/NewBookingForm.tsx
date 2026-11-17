'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { SlotPicker, type PickedSlot } from '@/components/tenant-dash/SlotPicker';
import { appointmentWhen } from '@/lib/dates/tenantTime';
import { createStaffBooking } from './actions';

// Booking someone in from behind the counter. The one thing the dashboard
// couldn't do, and the reason an owner would keep a paper notebook beside
// it — which is how the system ends up with half the day and books a
// walk-in's slot out from under them.
//
// Se abre con ?nueva=1 en la URL: así el botón del encabezado de la
// agenda, el del inicio y el del teléfono llegan todos al mismo
// formulario ya abierto, en un solo toque. Cerrar o terminar quita el
// parámetro.
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
  const pathname = usePathname();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? '');
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cerrar() {
    // La ruta tal como la ve el navegador (con o sin /t/{slug}), sin el ?nueva=1.
    router.replace(pathname, { scroll: false });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) {
      setError('Elige una hora libre de la lista.');
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
    toast(`Cita agendada: ${appointmentWhen(slot.slot_start, timezone)}`);
    cerrar();
    router.refresh();
  }

  return (
    <form id="agendar" onSubmit={save} className="scroll-mt-24 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">Agendar una cita</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            Para quien te llamó o llegó al local. Aparta la hora igual que si hubiera reservado en
            tu página.
          </p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar sin agendar"
          className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <X className="h-5 w-5" aria-hidden="true" />
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
          onPick={(s) => {
            setSlot(s);
            if (s) setError(null);
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre de la clienta">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. María Fernanda"
              autoComplete="off"
              required
              maxLength={120}
              className="min-h-[2.75rem] w-full"
            />
          </FormField>
          <FormField label="Teléfono" hint="Para llamarle o escribirle si algo cambia.">
            <Input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 618 123 4567"
              autoComplete="off"
              required
              maxLength={30}
              className="min-h-[2.75rem] w-full"
            />
          </FormField>
        </div>

        <FormField label="Nota" optional>
          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Paga en efectivo"
            maxLength={500}
            className="min-h-[2.75rem] w-full"
          />
        </FormField>

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

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <Button type="button" variant="outline" onClick={cerrar} className="min-h-[2.75rem]">
            Cerrar sin agendar
          </Button>
          <Button type="submit" isLoading={saving} className="min-h-[2.75rem]">
            {saving ? 'Agendando…' : 'Agendar cita'}
          </Button>
        </div>

        <p className="text-[13px] leading-relaxed text-muted">
          A la clienta no le llega correo, porque aquí no pedimos el suyo. Si quieres que reciba la
          confirmación, mándale tu link para que reserve ella.
        </p>
      </div>
    </form>
  );
}
