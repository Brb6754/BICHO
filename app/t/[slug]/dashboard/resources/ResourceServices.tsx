'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { setResourceServices } from './actions';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { mensajeDeError } from '@/components/tenant-dash/ui/ActionForm';

// El checklist de "qué hace" cada recurso.
//
// Va plegado por defecto y con el resumen en el encabezado ("Hace todo",
// "Corte y peinado · Color raíz"): la mayoría de los negocios no restringe
// nada, y una lista de ocho casillas abierta bajo cada persona convierte
// una pantalla de cuatro renglones en un muro.
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
  const resumen = todos
    ? 'Da todos los servicios'
    : marcados.length === 0
      ? 'No da ningún servicio'
      : services
          .filter((s) => marcados.includes(s.id))
          .map((s) => s.name)
          .join(' · ');

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
    <div className="mt-2">
      <button
        type="button"
        onClick={() => (abierto ? cerrarYGuardar() : setAbierto(true))}
        aria-expanded={abierto}
        className="-ml-2 inline-flex min-h-[2.75rem] max-w-full items-center gap-1.5 rounded-full px-2 text-[13px] text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <ChevronDown
          className={'h-3.5 w-3.5 transition-transform ' + (abierto ? 'rotate-180' : '')}
          aria-hidden="true"
        />
        <span className="truncate">{guardando ? 'Guardando…' : resumen}</span>
        {!abierto && !guardando && <span className="shrink-0 font-medium text-ink underline underline-offset-4">Cambiar</span>}
      </button>

      {abierto && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-xl bg-paper p-3 ring-1 ring-border">
          <p className="mb-1 text-[13px] text-muted">
            Marca lo que da {resourceName}. Lo que quites ya no se ofrece con {resourceName} en tu
            página.
          </p>
          {services.map((s) => (
            <label key={s.id} className="flex min-h-[2.75rem] items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={marcados.includes(s.id)}
                onChange={() => alternar(s.id)}
                className="h-5 w-5 shrink-0 accent-primary"
              />
              {s.name}
            </label>
          ))}
          {marcados.length === 0 && (
            <p className="mt-1 text-[13px] text-warning">
              Sin ningún servicio marcado, {resourceName} no va a aparecer en tu página.
            </p>
          )}
          <button
            type="button"
            onClick={cerrarYGuardar}
            className="mt-2 inline-flex min-h-[2.75rem] w-fit items-center rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            Guardar
          </button>
        </div>
      )}

    </div>
  );
}
