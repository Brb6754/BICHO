'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
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
    if (!nombre.trim()) return setError('Ponle un nombre.');

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
    setNombre('');
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_11rem_auto] sm:items-end">
        <div>
          <Label htmlFor="nt-nombre">Nombre</Label>
          <Input
            id="nt-nombre"
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
            className="mt-1.5 w-full"
          />
        </div>

        <div>
          <Label htmlFor="nt-dur">Duración</Label>
          <Select
            id="nt-dur"
            value={String(duracion)}
            onChange={(e) => setDuracion(Number(e.target.value))}
            className="mt-1.5 w-full"
          >
            {DURACIONES.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="nt-mod">Cómo ocurre</Label>
          <Select
            id="nt-mod"
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value as Modalidad)}
            className="mt-1.5 w-full"
          >
            {(Object.keys(MODALIDADES) as Modalidad[]).map((m) => (
              <option key={m} value={m}>
                {MODALIDADES[m].label}
              </option>
            ))}
          </Select>
        </div>

        <Button type="button" onClick={crear} isLoading={guardando}>
          Agregar
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted">{MODALIDADES[modalidad].ayuda}</p>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
