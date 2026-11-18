import { CalendarOff, Coffee, Moon, Palmtree, Sun, Trash2 } from 'lucide-react';
import { HelpTip } from './ui/HelpTip';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { addDaysKey, formatTime, longDate } from '@/lib/dates/tenantTime';
import { AbrirHoja, HojaFormulario } from './fichas/Hoja';
import { BOTON_BORRAR, CAMPO, Campo } from './fichas/visual';

export type ScheduleBlock = {
  id: string;
  resource_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

// "BLOQUEAR UN RATO" — las excepciones al horario de siempre.
//
// Lo frecuente es "hoy salgo a las 4", "mañana no vengo", "me voy de
// vacaciones" o "una hora para comer". Cada uno es un botón que abre la
// hoja ya llena (día, horas, motivo); ella solo revisa y toca Bloquear.
// La hoja es la misma para todo, con cada campo a la vista.
//
// Todo pasa por tenantTime: "25 dic, todo el día" se lee de vuelta como
// ese día, no como el rango UTC en que se guarda.
//
// Sin createAction/deleteAction es la demo: la hoja confirma "Ejemplo: …".
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
  /** YYYY-MM-DD de hoy en la zona del negocio. */
  today: string;
  createAction?: (slug: string, formData: FormData) => Promise<void>;
  deleteAction?: (blockId: string, slug: string) => Promise<void>;
}) {
  function describe(block: ScheduleBlock) {
    const startDay = longDate(block.starts_at, timezone);
    const endDay = longDate(block.ends_at, timezone);
    const startTime = formatTime(block.starts_at, timezone);
    const endTime = formatTime(block.ends_at, timezone);
    // Todo el día se guarda de medianoche a medianoche: sin esto se leería "del 25 al 26, 00:00–00:00".
    const isAllDay = startTime === '00:00' && endTime === '00:00';
    if (isAllDay) {
      const lastDay = longDate(new Date(new Date(block.ends_at).getTime() - 1).toISOString(), timezone);
      return startDay === lastDay ? `${startDay}, todo el día` : `Del ${startDay} al ${lastDay}`;
    }
    if (startDay === endDay) return `${startDay}, de ${startTime} a ${endTime}`;
    return `Del ${startDay} ${startTime} al ${endDay} ${endTime}`;
  }

  const manana = addDaysKey(today, 1);
  const rapidos: { icon: typeof Sun; label: string; valores: Record<string, string> }[] = [
    { icon: Sun, label: 'Hoy salgo temprano', valores: { start_date: today, start_time: '16:00', end_time: '20:00', all_day: '', end_date: '', reason: '' } },
    { icon: Moon, label: 'Mañana no vengo', valores: { start_date: manana, all_day: 'on', end_date: '', reason: 'Día libre' } },
    { icon: Coffee, label: 'Un descanso', valores: { start_date: today, start_time: '14:00', end_time: '15:00', all_day: '', end_date: '', reason: 'Comida' } },
    { icon: Palmtree, label: 'Vacaciones', valores: { start_date: manana, end_date: addDaysKey(today, 7), all_day: 'on', reason: 'Vacaciones' } },
  ];

  return (
    <section id="bloqueos" aria-labelledby="bloquear-titulo" className="mt-10 scroll-mt-24">
      <div className="flex items-center gap-1 px-1">
        <CalendarOff className="mr-1 h-5 w-5 text-ink/70" aria-hidden="true" />
        <h2 id="bloquear-titulo" className="text-[19px] font-semibold tracking-tight text-ink">
          Bloquear un rato
        </h2>
        <HelpTip title="¿Qué es bloquear un rato?">
          Es para cuando no vas a estar, sin cambiar tu horario de siempre: una tarde libre, un
          festivo, tus vacaciones. Mientras esté bloqueado, nadie puede reservar esas horas desde
          tu página. Las citas que ya tenías no se cancelan solas: revísalas en la agenda. Si
          comes a la misma hora todos los días, mejor parte tu horario en dos (9:00–14:00 y
          15:00–19:00).
        </HelpTip>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rapidos.map((r) => (
          <AbrirHoja key={r.label} id="bloquear" valores={r.valores} variant="outline" className="!h-auto min-h-[4.5rem] flex-col !gap-1.5 !rounded-2xl bg-surface !py-3">
            <r.icon className="h-5 w-5 text-warning" aria-hidden="true" />
            {r.label}
          </AbrirHoja>
        ))}
      </div>

      {blocks.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border px-5 py-4 text-[15px] leading-relaxed text-muted">
          Nada bloqueado: tu horario de siempre aplica todos los días.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {blocks.map((block) => (
            <li key={block.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-ink first-letter:uppercase">{describe(block)}</p>
                <p className="mt-0.5 text-[15px] text-ink/75">
                  {block.resource_id ? `Solo ${resources.find((r) => r.id === block.resource_id)?.name ?? 'una persona'}` : 'Todo el negocio'}
                  {block.reason ? ` · ${block.reason}` : ''}
                </p>
              </div>
              {deleteAction && (
                <ConfirmForm
                  action={deleteAction.bind(null, block.id, slug)}
                  success="Bloqueo quitado"
                  confirmTitle="¿Quitar el bloqueo?"
                  confirmMessage="Esas horas vuelven a ofrecerse en tu página y tus clientas las pueden reservar."
                  confirmLabel="Sí, quitarlo"
                  dismissLabel="No, dejarlo"
                  triggerVariant="danger"
                  triggerClassName={BOTON_BORRAR}
                >
                  <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
                  Quitar
                </ConfirmForm>
              )}
            </li>
          ))}
        </ul>
      )}

      <HojaFormulario
        id="bloquear"
        titulo="Bloquear un rato"
        action={createAction?.bind(null, slug)}
        success="Listo: esas horas quedaron bloqueadas"
        enviar="Bloquear"
        enviando="Bloqueando…"
      >
        <Campo label="¿Qué día?">
          <input id="blk-start" type="date" name="start_date" required defaultValue={today} min={today} className={CAMPO} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Desde las">
            <input type="time" name="start_time" defaultValue="14:00" className={CAMPO} />
          </Campo>
          <Campo label="Hasta las">
            <input type="time" name="end_time" defaultValue="18:00" className={CAMPO} />
          </Campo>
        </div>
        <label className="flex min-h-12 items-center gap-3 text-[16px] text-ink">
          <input type="checkbox" name="all_day" className="h-6 w-6 shrink-0 accent-primary" />
          Todo el día <span className="text-muted">(no importan las horas)</span>
        </label>
        <Campo label="¿Hasta qué día?" ayuda="Para vacaciones. Déjalo vacío si es un solo día.">
          <input type="date" name="end_date" min={today} className={CAMPO} />
        </Campo>
        {resources.length > 1 && (
          <Campo label="¿A quién aplica?">
            <select name="resource_id" defaultValue="" className={CAMPO}>
              <option value="">A todo el negocio</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  Solo {r.name}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo label="Motivo (solo lo ves tú)">
          <input type="text" name="reason" maxLength={200} placeholder="Ej. Vacaciones, festivo, cita médica" className={CAMPO} />
        </Campo>
      </HojaFormulario>
    </section>
  );
}
