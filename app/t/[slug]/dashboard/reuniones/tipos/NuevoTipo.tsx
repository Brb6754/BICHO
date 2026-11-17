'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { Button } from '@/components/ui/Button';
import { MODALIDADES, type Modalidad } from '@/lib/meetings/kinds';
import { createMeetingType } from '../actions';

// Crear un tipo de reunión.
//
// Tres campos y nada más: nombre, cuánto dura y cómo ocurre. No hay
// precio porque una reunión de venta no se cobra, y no hay descripción
// porque el nombre YA es la descripción — "Visita técnica a domicilio"
// no necesita un párrafo debajo.

const DURACIONES = [15, 30, 45, 60, 90, 120];

export function NuevoTipo({ slug }: { slug: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [duracion, setDuracion] = useState(30);
  const [modalidad, setModalidad] = useState<Modalidad>('video');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    setError(null);
    if (!nombre.trim()) return setError('Ponle un nombre, por ejemplo “Diagnóstico por videollamada”.');

    setGuardando(true);
    const res = await createMeetingType({
      slug,
      name: nombre,
      durationMinutes: duracion,
      modality: modalidad,
    });
    setGuardando(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast(`Listo: “${nombre.trim()}” ya se ofrece en tu página`);
    setNombre('');
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_11rem_auto] sm:items-end">
        <FormField label="Nombre" error={error ?? undefined}>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                crear();
              }
            }}
            placeholder="Diagnóstico por videollamada"
            maxLength={120}
            error={Boolean(error)}
            className="w-full"
          />
        </FormField>

        <FormField label="Cuánto dura">
          <Select value={String(duracion)} onChange={(e) => setDuracion(Number(e.target.value))} className="w-full">
            {DURACIONES.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Cómo ocurre">
          <Select value={modalidad} onChange={(e) => setModalidad(e.target.value as Modalidad)} className="w-full">
            {(Object.keys(MODALIDADES) as Modalidad[]).map((m) => (
              <option key={m} value={m}>
                {MODALIDADES[m].label}
              </option>
            ))}
          </Select>
        </FormField>

        <Button type="button" onClick={crear} isLoading={guardando} className="min-h-11">
          Agregar
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted">{MODALIDADES[modalidad].ayuda}</p>
    </div>
  );
}
