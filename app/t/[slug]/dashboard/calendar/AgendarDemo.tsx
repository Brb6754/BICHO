'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { toast } from '@/components/tenant-dash/ui/Toast';
import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { instantFromLocal } from '@/lib/dates/tenantTime';
import { aHora } from '@/lib/agenda/calendario';

// "Agendar cita" en la demo: el mismo recorrido que el panel real, pero la
// cita solo vive en esta página. No llama a ninguna acción del servidor.

const HORAS = Array.from({ length: 27 }, (_, i) => aHora(7 * 60 + i * 30)); // 07:00 a 20:00
const select =
  'min-h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-base text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15';

export function AgendarDemo({
  servicios,
  personas,
  timezone,
  dia,
  hora,
  quien,
  onAgendar,
  onClose,
}: {
  servicios: { id: string; name: string; duration_minutes: number }[];
  personas: { id: string; name: string }[];
  timezone: string | null;
  dia: string;
  hora: string;
  quien?: string;
  onAgendar: (cita: AgendaBooking) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? '');
  const [personaId, setPersonaId] = useState(personas.some((p) => p.id === quien) ? quien! : (personas[0]?.id ?? ''));
  const [fecha, setFecha] = useState(dia);
  const [laHora, setLaHora] = useState(HORAS.includes(hora) ? hora : '10:00');

  function agendar(e: React.FormEvent) {
    e.preventDefault();
    const servicio = servicios.find((s) => s.id === servicioId);
    const persona = personas.find((p) => p.id === personaId);
    if (!servicio || !persona) return;
    const starts = instantFromLocal(fecha, laHora, timezone);
    onAgendar({
      id: `ejemplo-${starts}-${personaId}`,
      starts_at: starts,
      ends_at: new Date(new Date(starts).getTime() + servicio.duration_minutes * 60_000).toISOString(),
      status: 'confirmed',
      resource_id: persona.id,
      service_type_id: servicio.id,
      resources: { name: persona.name },
      service_types: { name: servicio.name },
      customers: { name: nombre.trim(), phone: null },
    });
    toast('Ejemplo: cita agendada. Tócala en tu agenda para atenderla y cobrarla.');
  }

  return (
    <Modal open onClose={onClose} title="Agendar una cita" size="lg">
      <form onSubmit={agendar} className="flex flex-col gap-4">
        <p className="rounded-xl bg-primary/[0.08] px-3.5 py-3 text-[15px] leading-relaxed text-ink">
          Es un ejemplo: la cita se ve en esta agenda mientras estés aquí y no se guarda en ningún lado.
        </p>
        <FormField label="Nombre de la clienta">
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. María Fernanda"
            required
            maxLength={120}
            className="min-h-12 w-full !text-base"
          />
        </FormField>
        <FormField label="Servicio">
          <select value={servicioId} onChange={(e) => setServicioId(e.target.value)} className={select}>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.duration_minutes} min
              </option>
            ))}
          </select>
        </FormField>
        {personas.length > 1 && (
          <FormField label="Quién atiende">
            <select value={personaId} onChange={(e) => setPersonaId(e.target.value)} className={select}>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Día">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className="min-h-12 w-full !text-base" />
          </FormField>
          <FormField label="Hora">
            <select value={laHora} onChange={(e) => setLaHora(e.target.value)} className={select}>
              {HORAS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} className="min-h-12 !text-base">
            Cerrar sin agendar
          </Button>
          <Button type="submit" className="min-h-12 !text-base font-semibold">
            Agendar cita
          </Button>
        </div>
      </form>
    </Modal>
  );
}
