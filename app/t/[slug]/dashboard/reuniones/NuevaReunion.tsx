'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { SlotPicker, type PickedSlot } from '@/components/tenant-dash/SlotPicker';
import { MODALIDADES, pideDireccion, type Modalidad } from '@/lib/meetings/kinds';
import { createMeeting } from './actions';

// Agendar una reunión a mano: el prospecto que llamó, o al que se le
// consiguió un hueco en persona.
//
// El hueco lo elige el MISMO `SlotPicker` que usa la agenda de citas,
// que a su vez pregunta por `get_available_slots` — la misma función
// que la página pública. Cualquier otro camino sería reintroducir el
// doble-booking por la puerta de atrás.
//
// Los errores se dicen junto al campo y no borran lo escrito.

type Tipo = { id: string; name: string; duration_minutes: number; modality: string | null };
type Errores = Partial<Record<'slot' | 'nombre' | 'tel' | 'direccion', string>>;

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
  const [errores, setErrores] = useState<Errores>({});

  const tipo = tipos.find((t) => t.id === tipoId) ?? null;
  const necesitaDireccion = pideDireccion(tipo?.modality);

  function cerrar() {
    setAbierto(false);
    setError(null);
    setErrores({});
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
    const e: Errores = {};
    if (!slot) e.slot = 'Elige un día y una hora.';
    if (!nombre.trim()) e.nombre = 'Escribe el nombre de la persona.';
    if (!tel.trim()) e.tel = 'Escribe un teléfono para avisarle.';
    // Una visita sin dirección no es una visita: no habría a dónde ir.
    if (necesitaDireccion && !direccion.trim()) e.direccion = 'Esta reunión es en su domicilio: escribe la dirección.';
    setErrores(e);
    if (Object.keys(e).length || !slot) return;

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
    toast(`Reunión con ${nombre.trim()} agendada`);
    cerrar();
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setAbierto(true)} className="min-h-11">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Agendar reunión
      </Button>

      {abierto && (
        <Modal open onClose={cerrar} title="Agendar una reunión" size="lg">
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="¿Qué tipo de reunión?"
                hint={tipo?.modality ? MODALIDADES[tipo.modality as Modalidad]?.label : undefined}
              >
                <Select
                  value={tipoId}
                  onChange={(e) => {
                    setTipoId(e.target.value);
                    setSlot(null);
                  }}
                  className="w-full"
                >
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.duration_minutes} min
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="¿Quién la atiende?">
                <Select
                  value={asesorId}
                  onChange={(e) => {
                    setAsesorId(e.target.value);
                    setSlot(null);
                  }}
                  className="w-full"
                >
                  {asesores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink">¿Cuándo?</p>
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
                onPick={(s) => {
                  setSlot(s);
                  setErrores((x) => ({ ...x, slot: undefined }));
                }}
                picked={slot}
              />
              {errores.slot && (
                <p role="alert" className="mt-1.5 text-sm text-error">
                  {errores.slot}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nombre" error={errores.nombre}>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                  maxLength={120}
                  error={Boolean(errores.nombre)}
                  className="w-full"
                />
              </FormField>
              <FormField label="Teléfono" error={errores.tel}>
                <Input
                  type="tel"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  autoComplete="tel"
                  maxLength={30}
                  placeholder="Ej. 618 123 4567"
                  error={Boolean(errores.tel)}
                  className="w-full"
                />
              </FormField>
              <FormField label="Empresa" optional>
                <Input
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  maxLength={160}
                  className="w-full"
                />
              </FormField>
              <FormField label="Correo" optional>
                <Input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="email"
                  maxLength={160}
                  className="w-full"
                />
              </FormField>
            </div>

            {necesitaDireccion && (
              <FormField label="Dirección de la visita" error={errores.direccion}>
                <Input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  maxLength={300}
                  placeholder="Calle, número, colonia y ciudad"
                  error={Boolean(errores.direccion)}
                  className="w-full"
                />
              </FormField>
            )}

            <FormField label="Notas" optional>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Qué pidió, qué hay que llevar."
                className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 sm:text-sm"
              />
            </FormField>

            {error && (
              <p role="alert" className="rounded-xl bg-error-soft px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={cerrar} className="min-h-11">
                Cerrar sin agendar
              </Button>
              <Button type="button" onClick={guardar} isLoading={guardando} className="min-h-11">
                {guardando ? 'Agendando…' : 'Agendar reunión'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
