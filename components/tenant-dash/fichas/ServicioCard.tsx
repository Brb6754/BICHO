'use client';

import { Banknote, Clock3, Pencil, Tag, Trash2, User } from 'lucide-react';
import { ActionForm } from '@/components/tenant-dash/ui/ActionForm';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { ConHoja, FormularioHoja } from './Hoja';
import { DuracionChips } from './DuracionChips';
import { BOTON_BORRAR, CAMPO, Campo, Chip, IconoColor, InterruptorPagina, TARJETA } from './visual';

export type ServicioVista = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  show_price?: boolean | null;
  requires_staff?: boolean | null;
  active?: boolean;
};

type Accion = (formData: FormData) => unknown | Promise<unknown>;

export function duracion(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function pesos(cents: number) {
  const p = cents / 100;
  return '$' + (Number.isInteger(p) ? p.toLocaleString('es-MX') : p.toFixed(2));
}

/**
 * Los campos de la hoja de agregar y de editar. Precio vacío por defecto
 * (nunca 0: un 0 olvidado publicaba el servicio como gratis).
 */
export function CamposServicio({ s }: { s?: ServicioVista }) {
  const precio = s ? String(s.price_cents / 100) : '';
  return (
    <>
      <Campo label="¿Cómo se llama?">
        <input
          id={s ? `svc-${s.id}` : 'svc-name'}
          type="text"
          name="name"
          required
          maxLength={120}
          defaultValue={s?.name}
          placeholder="Ej. Corte de dama"
          className={CAMPO}
        />
      </Campo>
      <div>
        <p className="mb-1.5 text-[15px] font-semibold text-ink">¿Cuánto dura?</p>
        <DuracionChips defaultValue={s?.duration_minutes ?? 30} />
      </div>
      <Campo label="¿Cuánto cuesta?" ayuda="Si es gratis, pon 0.">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] font-semibold text-muted" aria-hidden="true">
            $
          </span>
          <input
            id={s ? `precio-${s.id}` : 'svc-precio'}
            type="number"
            name="price_mxn"
            inputMode="decimal"
            min={0}
            step="0.01"
            required
            defaultValue={precio}
            placeholder="250"
            className={`${CAMPO} !pl-8 !text-[1.25rem] font-semibold tabular-nums`}
          />
        </div>
      </Campo>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-[15px] font-semibold text-ink">Opciones</legend>
        <label className="flex min-h-12 items-center gap-3 text-[15px] text-ink">
          <input type="checkbox" name="show_price" defaultChecked={s?.show_price !== false} className="h-6 w-6 shrink-0 accent-primary" />
          Mostrar el precio en mi página
        </label>
        <label className="flex min-h-12 items-center gap-3 text-[15px] text-ink">
          <input type="checkbox" name="requires_staff" defaultChecked={s?.requires_staff !== false} className="h-6 w-6 shrink-0 accent-primary" />
          Lo da una persona <span className="text-muted">(no una cabina o espacio)</span>
        </label>
      </fieldset>
    </>
  );
}

/**
 * Un servicio como tarjeta: color, precio grande, duración en ficha.
 * Tocarla abre la hoja para editarlo. Sin `acciones` es la demo: la hoja
 * se llena igual y al guardar solo confirma "Ejemplo: …".
 */
export function ServicioCard({
  s,
  acciones,
  anticipoMxn = 0,
}: {
  s: ServicioVista;
  acciones?: { editar: Accion; alternar: Accion; borrar: Accion };
  /** Solo lectura: lo que pide de anticipo (se cambia en /dashboard/anticipos). */
  anticipoMxn?: number;
}) {
  const activo = s.active !== false;
  const precio =
    s.show_price === false ? 'Sin precio público' : s.price_cents === 0 ? 'Gratis' : pesos(s.price_cents);
  const numerico = s.show_price !== false && s.price_cents > 0;

  return (
    <li className={`${TARJETA} flex flex-col`}>
      <ConHoja
        titulo={`Editar ${s.name}`}
        etiqueta={`Editar ${s.name}: ${duracion(s.duration_minutes)}, ${precio}`}
        className="-m-2 rounded-2xl p-2"
        boton={
          <span className={`flex items-start gap-3.5 transition-opacity ${activo ? '' : 'opacity-55'}`}>
            <IconoColor texto={s.name} icon={Tag} />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{s.name}</span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                <Chip icon={Clock3}>{duracion(s.duration_minutes)}</Chip>
                {s.requires_staff === false && <Chip icon={User}>Sin persona</Chip>}
                {anticipoMxn > 0 && <Chip icon={Banknote}>Anticipo {pesos(anticipoMxn * 100)}</Chip>}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-2">
              <span className={numerico ? 'text-[1.75rem] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink' : 'pt-1 text-[15px] font-semibold text-muted'}>
                {precio}
              </span>
              <span className="inline-flex items-center gap-1 text-[14px] font-medium text-muted">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Editar
              </span>
            </span>
          </span>
        }
      >
        {(cerrar) => (
          <FormularioHoja action={acciones?.editar} success={`${s.name} guardado`} enviar="Guardar cambios" alGuardar={cerrar}>
            <CamposServicio s={s} />
          </FormularioHoja>
        )}
      </ConHoja>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        {acciones ? (
          <>
            <ActionForm
              action={acciones.alternar}
              success={activo ? `${s.name}: oculto de tu página` : `${s.name}: ya se ofrece en tu página`}
            >
              <InterruptorPagina active={activo} label={s.name} />
            </ActionForm>
            <ConfirmForm
              action={acciones.borrar}
              success="Servicio borrado"
              confirmTitle={`¿Borrar "${s.name}"?`}
              confirmMessage="Se quita para siempre. Si solo quieres dejar de ofrecerlo un tiempo, mejor apaga el interruptor."
              confirmLabel="Sí, borrar"
              dismissLabel="No, conservarlo"
              triggerVariant="danger"
              triggerClassName={BOTON_BORRAR}
            >
              <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
              Borrar
            </ConfirmForm>
          </>
        ) : (
          <span className="inline-flex min-h-12 items-center gap-3 text-[15px] font-medium text-ink">
            <span aria-hidden="true" className="relative inline-flex h-8 w-[3.25rem] items-center rounded-full bg-primary">
              <span className="inline-block h-6 w-6 translate-x-[1.5rem] rounded-full bg-white shadow-sm" />
            </span>
            Se ofrece en tu página
          </span>
        )}
      </div>
    </li>
  );
}
