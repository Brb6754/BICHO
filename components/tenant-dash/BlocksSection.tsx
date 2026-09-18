import { CalendarOff, X } from 'lucide-react';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { Button } from '@/components/ui/Button';
import { formatTime, longDate } from '@/lib/dates/tenantTime';

export type ScheduleBlock = {
  id: string;
  resource_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

// Exceptions to the weekly schedule, under the weekly schedule — because
// an owner thinking "¿cuándo atiendo?" is thinking about both at once.
//
// Everything renders through tenantTime: a block typed as "25 dic, todo
// el día" has to read back as that same day, not as the UTC range it is
// stored in.
export function BlocksSection({
  slug,
  blocks,
  resources,
  timezone,
  createAction,
  deleteAction,
}: {
  slug: string;
  blocks: ScheduleBlock[];
  resources: { id: string; name: string }[];
  timezone: string | null;
  createAction: (slug: string, formData: FormData) => Promise<void>;
  deleteAction: (blockId: string, slug: string) => Promise<void>;
}) {
  const field =
    'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 sm:text-sm';

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

  return (
    <section className="mt-12">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-ink">Días y horas que no atiendes</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">
          Vacaciones, un día festivo, una tarde que sales antes. Mientras esté bloqueado, nadie
          puede reservar esas horas desde tu página. Las citas que ya tenías agendadas no se
          cancelan solas: revísalas en la agenda.
        </p>
      </div>

      <form
        action={createAction.bind(null, slug)}
        className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Desde el día</span>
            <input type="date" name="start_date" required className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Hasta el día <span className="font-normal text-muted">(opcional)</span>
            </span>
            <input type="date" name="end_date" className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">De</span>
            <input type="time" name="start_time" defaultValue="09:00" className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">A</span>
            <input type="time" name="end_time" defaultValue="18:00" className={field} />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              name="all_day"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            />
            Todo el día (ignora las horas de arriba)
          </label>

          {resources.length > 1 && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">¿A quién aplica?</span>
              <select name="resource_id" className={field} defaultValue="">
                <option value="">A todo el negocio</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    Solo {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[14rem] flex-1">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Motivo <span className="font-normal text-muted">(opcional, solo lo ves tú)</span>
            </span>
            <input type="text" name="reason" placeholder="Vacaciones, festivo, cita médica…" className={field} />
          </label>
          <Button type="submit">Bloquear</Button>
        </div>
      </form>

      {blocks.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <CalendarOff className="mx-auto h-5 w-5 text-muted" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-ink">No tienes nada bloqueado</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
            Tu horario semanal aplica todos los días. Bloquea aquí las excepciones.
          </p>
        </div>
      ) : (
        <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          {blocks.map((block, i) => (
            <li
              key={block.id}
              className={
                'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5 ' +
                (i > 0 ? 'border-t border-border' : '')
              }
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink first-letter:uppercase">{describe(block)}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {block.resource_id
                    ? (resources.find((r) => r.id === block.resource_id)?.name ?? 'Un recurso')
                    : 'Todo el negocio'}
                  {block.reason ? ` · ${block.reason}` : ''}
                </p>
              </div>
              <ConfirmForm
                action={deleteAction.bind(null, block.id, slug)}
                confirmTitle="Quitar el bloqueo"
                confirmMessage="Esas horas vuelven a quedar disponibles para reservar desde tu página."
                confirmLabel="Quitar"
                dismissLabel="Dejarlo"
                triggerVariant="ghost"
                triggerClassName="h-8 w-8 !border-0 !p-0 !text-muted hover:!bg-error-soft hover:!text-error"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Quitar este bloqueo</span>
              </ConfirmForm>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
