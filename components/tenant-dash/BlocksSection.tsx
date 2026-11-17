import { CalendarOff, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ActionForm, SubmitButton } from './ui/ActionForm';
import { FormField } from './ui/FormField';
import { HelpTip } from './ui/HelpTip';
import { ConfirmarConAviso } from './AccionesFila';
import { formatTime, longDate } from '@/lib/dates/tenantTime';

export type ScheduleBlock = {
  id: string;
  resource_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

// "BLOQUEAR UN RATO" — exceptions to the weekly schedule.
//
// La tarea frecuente es "hoy salgo a las 4" o "el viernes no vengo", así
// que el formulario arranca en HOY y pide solo el día y las horas. Lo de
// vacaciones (varios días), a quién aplica y el motivo va plegado en
// "Más opciones": son útiles, pero no hacen falta para el caso de todos
// los días.
//
// Everything renders through tenantTime: a block typed as "25 dic, todo
// el día" has to read back as that same day, not as the UTC range it is
// stored in.
export function BlocksSection({
  slug,
  blocks,
  resources,
  timezone,
  today,
  createAction,
  deleteAction,
}: {
  slug: string;
  blocks: ScheduleBlock[];
  resources: { id: string; name: string }[];
  timezone: string | null;
  /** YYYY-MM-DD de hoy en la zona del negocio: el día que viene puesto. */
  today?: string;
  createAction: (slug: string, formData: FormData) => Promise<void>;
  deleteAction: (blockId: string, slug: string) => Promise<void>;
}) {
  function describe(block: ScheduleBlock) {
    const startDay = longDate(block.starts_at, timezone);
    const endDay = longDate(block.ends_at, timezone);
    const startTime = formatTime(block.starts_at, timezone);
    const endTime = formatTime(block.ends_at, timezone);
    // An all-day block is stored as midnight-to-midnight, which would
    // otherwise read as "del 25 al 26, 00:00–00:00".
    const isAllDay = startTime === '00:00' && endTime === '00:00';
    if (isAllDay) {
      const lastDay = longDate(new Date(new Date(block.ends_at).getTime() - 1).toISOString(), timezone);
      return startDay === lastDay ? `${startDay}, todo el día` : `Del ${startDay} al ${lastDay}`;
    }
    if (startDay === endDay) return `${startDay}, de ${startTime} a ${endTime}`;
    return `Del ${startDay} ${startTime} al ${endDay} ${endTime}`;
  }

  const campo = 'min-h-[2.75rem] w-full';

  return (
    <section id="bloquear" aria-labelledby="bloquear-titulo" className="mt-12 scroll-mt-24">
      <div className="mb-3 px-1">
        <div className="flex items-center gap-1">
          <CalendarOff className="mr-1 h-5 w-5 text-ink/70" aria-hidden="true" />
          <h2 id="bloquear-titulo" className="text-[17px] font-semibold tracking-tight text-ink">
            Bloquear un rato
          </h2>
          <HelpTip title="¿Qué es bloquear un rato?">
            Es para cuando no vas a estar, sin cambiar tu horario de siempre: una tarde libre, un
            festivo, tus vacaciones. Mientras esté bloqueado, nadie puede reservar esas horas desde
            tu página. Las citas que ya tenías no se cancelan solas: revísalas en la agenda.
          </HelpTip>
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          ¿Sales temprano o no vienes un día? Bloquéalo aquí y tu página deja de ofrecer esas horas.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <ActionForm action={createAction.bind(null, slug)} success="Listo: esas horas quedaron bloqueadas">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
            <FormField label="Día" className="col-span-2 sm:col-span-1">
              <Input id="blk-start" type="date" name="start_date" required defaultValue={today} min={today} className={campo} />
            </FormField>
            <FormField label="Desde las">
              <Input type="time" name="start_time" defaultValue="14:00" className={campo} />
            </FormField>
            <FormField label="Hasta las">
              <Input type="time" name="end_time" defaultValue="18:00" className={campo} />
            </FormField>
          </div>

          <label className="mt-2 flex min-h-[2.75rem] items-center gap-3 text-sm text-ink">
            <input type="checkbox" name="all_day" className="h-5 w-5 shrink-0 accent-primary" />
            Todo el día <span className="text-muted">(no importan las horas)</span>
          </label>

          <details className="group mt-1">
            <summary className="inline-flex min-h-[2.75rem] cursor-pointer list-none items-center gap-1.5 rounded-full px-1 text-sm font-medium text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
              <span className="transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true">
                ›
              </span>
              Más opciones: varios días, solo una persona, motivo
            </summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <FormField label="Hasta el día" hint="Para vacaciones. Déjalo vacío si es un solo día." optional>
                <Input type="date" name="end_date" min={today} className={campo} />
              </FormField>
              {resources.length > 1 && (
                <FormField label="¿A quién aplica?">
                  <Select name="resource_id" defaultValue="" className={campo}>
                    <option value="">A todo el negocio</option>
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        Solo {r.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
              <FormField label="Motivo" hint="Solo lo ves tú." optional className="sm:col-span-2">
                <Input type="text" name="reason" maxLength={200} placeholder="Ej. Vacaciones, festivo, cita médica" className={campo} />
              </FormField>
            </div>
          </details>

          <SubmitButton className="mt-4 min-h-[2.75rem] w-full sm:w-fit" pending="Bloqueando…">
            Bloquear
          </SubmitButton>
        </ActionForm>
      </div>

      {blocks.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border px-5 py-5 text-sm leading-relaxed text-muted">
          No tienes nada bloqueado: tu horario de siempre aplica todos los días. Lo que bloquees
          aparece aquí, y lo puedes quitar cuando quieras.
        </p>
      ) : (
        <>
          <h3 className="mb-2 mt-6 px-1 text-sm font-semibold text-ink">Lo que tienes bloqueado</h3>
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {blocks.map((block, i) => (
              <li
                key={block.id}
                className={
                  'flex items-center gap-x-4 px-4 py-2.5 sm:px-5 ' + (i > 0 ? 'border-t border-border' : '')
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink first-letter:uppercase">{describe(block)}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {block.resource_id
                      ? `Solo ${resources.find((r) => r.id === block.resource_id)?.name ?? 'una persona'}`
                      : 'Todo el negocio'}
                    {block.reason ? ` · ${block.reason}` : ''}
                  </p>
                </div>
                <ConfirmarConAviso
                  action={deleteAction.bind(null, block.id, slug)}
                  success="Bloqueo quitado"
                  confirmTitle="¿Quitar el bloqueo?"
                  confirmMessage="Esas horas vuelven a ofrecerse en tu página y tus clientas las pueden reservar."
                  confirmLabel="Sí, quitarlo"
                  dismissLabel="No, dejarlo"
                  triggerVariant="ghost"
                  triggerClassName="h-11 w-11 shrink-0 !border-0 !p-0 !text-muted hover:!bg-error-soft hover:!text-error"
                >
                  <X className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span className="sr-only">Quitar este bloqueo</span>
                </ConfirmarConAviso>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
