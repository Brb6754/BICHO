'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/tenant-dash/fichas/visual';
import { setResourceServices } from './actions';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { mensajeDeError } from '@/components/tenant-dash/ui/ActionForm';

// Qué servicios da cada quien: fichas a la vista ("Da todos los servicios",
// o "Corte" "Color raíz") y el checklist en una hoja al tocar "Cambiar".
// La mayoría de los negocios no restringe nada, así que la lista de
// casillas no vive abierta bajo cada persona.
//
// Guarda al cerrar y no en cada clic. Marcar tres servicios serían tres
// escrituras y tres revalidaciones de la página pública, y entre la
// primera y la última el negocio queda con una restricción que nadie
// pidió —solo el primer servicio marcado— publicada en su página.
export function ResourceServices({
  slug,
  resourceId,
  resourceName,
  services,
  selected,
}: {
  slug: string;
  resourceId: string;
  resourceName: string;
  services: { id: string; name: string }[];
  selected: string[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [marcados, setMarcados] = useState<string[]>(
    // Sin filas guardadas, el recurso hace de todo — así que las casillas
    // arrancan todas puestas, que es lo que de verdad está pasando.
    selected.length === 0 ? services.map((s) => s.id) : selected
  );
  const [guardando, setGuardando] = useState(false);

  const todos = marcados.length === services.length;
  const elegidos = services.filter((s) => marcados.includes(s.id)).map((s) => s.name);

  function alternar(id: string) {
    setMarcados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function cerrarYGuardar() {
    setAbierto(false);
    const original = selected.length === 0 ? services.map((s) => s.id) : selected;
    const igual =
      original.length === marcados.length && original.every((id) => marcados.includes(id));
    if (igual) return;

    setGuardando(true);
    try {
      await setResourceServices(slug, resourceId, marcados);
      toast(`Servicios de ${resourceName} guardados`);
      router.refresh();
    } catch (e) {
      // Vuelve a abrir con lo que marcó: no se pierde la selección.
      setAbierto(true);
      toast(mensajeDeError(e), 'error');
    } finally {
      setGuardando(false);
    }
  }

  if (services.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {guardando ? (
        <Chip>Guardando…</Chip>
      ) : todos ? (
        <Chip>Da todos los servicios</Chip>
      ) : marcados.length === 0 ? (
        <span className="text-[15px] font-medium text-warning">No da ningún servicio</span>
      ) : (
        elegidos.map((n) => <Chip key={n}>{n}</Chip>)
      )}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-ink underline underline-offset-4 hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Cambiar servicios
      </button>

      <Modal open={abierto} onClose={cerrarYGuardar} title={`¿Qué servicios da ${resourceName}?`} size="lg">
        <p className="text-[15px] text-muted">Lo que quites ya no se ofrece con {resourceName} en tu página.</p>
        <div className="mt-3 flex flex-col">
          {services.map((s) => (
            <label key={s.id} className="flex min-h-12 items-center gap-3 border-b border-border text-[16px] text-ink last:border-0">
              <input type="checkbox" checked={marcados.includes(s.id)} onChange={() => alternar(s.id)} className="h-6 w-6 shrink-0 accent-primary" />
              {s.name}
            </label>
          ))}
        </div>
        {marcados.length === 0 && (
          <p className="mt-2 text-[14px] text-warning">Sin ningún servicio marcado, {resourceName} no va a aparecer en tu página.</p>
        )}
        <Button type="button" onClick={cerrarYGuardar} className="mt-5 min-h-12 w-full !text-[17px] font-semibold">
          Guardar
        </Button>
      </Modal>
    </div>
  );
}
