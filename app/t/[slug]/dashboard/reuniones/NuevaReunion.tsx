'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SlotPicker, type PickedSlot } from '@/components/tenant-dash/SlotPicker';
import { MODALIDADES, pideDireccion, type Modalidad } from '@/lib/meetings/kinds';
import { createMeeting } from './actions';

// Agendar una reunión a mano: el prospecto que llamó, o al que el
// asesor le consiguió un hueco en persona.
//
// El hueco lo elige el MISMO `SlotPicker` que usa la agenda de citas,
// que a su vez pregunta por `get_available_slots` — la misma función
// que la página pública. Cualquier otro camino sería reintroducir el
// doble-booking por la puerta de atrás.

type Tipo = { id: string; name: string; duration_minutes: number; modality: string | null };

export function NuevaReunion({
  slug,
  timezone,
  tipos,
  asesores,
}: {
  slug: string;
  timezone: string | null;
  tipos: Tipo[];
  asesores: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const [tipoId, setTipoId] = useState(tipos[0]?.id ?? '');
  const [asesorId, setAsesorId] = useState(asesores[0]?.id ?? '');
  const [slot, setSlot] = useState<PickedSlot | null>(null);

  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [tel, setTel] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipo = tipos.find((t) => t.id === tipoId) ?? null;
  const necesitaDireccion = pideDireccion(tipo?.modality);

  function cerrar() {
    setAbierto(false);
    setError(null);
    setSlot(null);
    setNombre('');
    setEmpresa('');
    setTel('');
    setCorreo('');
    setDireccion('');
    setNotas('');
  }

  async function guardar() {
    setError(null);
    if (!slot) return setError('Elige un horario.');
    if (!nombre.trim()) return setError('Escribe el nombre del prospecto.');
    if (!tel.trim()) return setError('Escribe un teléfono de contacto.');
    // Una visita sin dirección no es una visita: el asesor no tendría a
    // dónde ir, y el dato se perdería justo cuando hace falta.
    if (necesitaDireccion && !direccion.trim()) {
      return setError('Esta reunión es en el domicilio del prospecto. Escribe la dirección.');
    }

    setGuardando(true);
    const res = await createMeeting({
      slug,
      resourceId: asesorId,
      meetingTypeId: tipoId,
      startsAt: slot.slot_start,
      endsAt: slot.slot_end,
      name: nombre,
      phone: tel,
      email: correo,
      company: empresa,
      address: direccion,
      notes: notas,
    });
    setGuardando(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    cerrar();
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Agendar reunión
      </Button>

      {abierto && (
        <Modal open onClose={cerrar} title="Agendar una reunión" size="lg">
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rn-tipo">Tipo de reunión</Label>
                <Select
                  id="rn-tipo"
                  value={tipoId}
                  onChange={(e) => {
                    setTipoId(e.target.value);
                    setSlot(null);
                  }}
                  className="mt-1.5 w-full"
                >
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.duration_minutes} min
                    </option>
                  ))}
                </Select>
                {tipo?.modality && (
                  <p className="mt-1 text-xs text-muted">
                    {MODALIDADES[tipo.modality as Modalidad]?.label}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="rn-asesor">Asesor</Label>
                <Select
                  id="rn-asesor"
                  value={asesorId}
                  onChange={(e) => {
                    setAsesorId(e.target.value);
                    setSlot(null);
                  }}
                  className="mt-1.5 w-full"
                >
                  {asesores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <SlotPicker
              services={tipos.map((t) => ({
                id: t.id,
                name: t.name,
                duration_minutes: t.duration_minutes,
              }))}
              resources={asesores}
              timezone={timezone}
              serviceId={tipoId}
              resourceId={asesorId}
              onPick={setSlot}
              picked={slot}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rn-nombre">Nombre</Label>
                <Input
                  id="rn-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                  maxLength={120}
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <Label htmlFor="rn-empresa">Empresa (opcional)</Label>
                <Input
                  id="rn-empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  maxLength={160}
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <Label htmlFor="rn-tel">Teléfono</Label>
                <Input
                  id="rn-tel"
                  type="tel"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  autoComplete="tel"
                  maxLength={30}
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <Label htmlFor="rn-correo">Correo (opcional)</Label>
                <Input
                  id="rn-correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="email"
                  maxLength={160}
                  className="mt-1.5 w-full"
                />
              </div>
            </div>

            {necesitaDireccion && (
              <div>
                <Label htmlFor="rn-dir">Dirección de la visita</Label>
                <Input
                  id="rn-dir"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  maxLength={300}
                  placeholder="Calle, número, colonia y ciudad"
                  className="mt-1.5 w-full"
                />
              </div>
            )}

            <div>
              <Label htmlFor="rn-notas">Notas (opcional)</Label>
              <textarea
                id="rn-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Qué pidió, qué consumo tiene, qué hay que llevar."
                className="mt-1.5 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 sm:text-sm"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={cerrar}>
                Cancelar
              </Button>
              <Button type="button" onClick={guardar} isLoading={guardando} disabled={!slot}>
                Agendar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
