import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarOff, Clock3, Plus, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  createScheduleBlock,
  createScheduleSlot,
  deleteScheduleBlock,
  deleteScheduleSlot,
} from './actions';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionForm, SubmitButton } from '@/components/tenant-dash/ui/ActionForm';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { ConfirmarConAviso, IrAlCampo } from '@/components/tenant-dash/AccionesFila';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AddBar } from '@/components/tenant-dash/ItemList';
import { BlocksSection, type ScheduleBlock } from '@/components/tenant-dash/BlocksSection';
import { dayKey } from '@/lib/dates/tenantTime';
import { WeekdayPicker } from './WeekdayPicker';

// Display order is Monday-first, but the value= sent to the DB is still
// Postgres's extract(dow) convention (0=Sunday..6=Saturday) — see
// db/003_resource_schedules.sql.
const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

type ScheduleRow = {
  id: string;
  resource_id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
};

/** "09:00:00" → "9:00". */
function hora(valor: string): string {
  const [h, m] = valor.split(':');
  return `${Number(h)}:${m}`;
}

// HORARIO — a week per resource, not a list of rows.
//
// Every resource shows all seven days in order, and an empty one says
// "Cerrado": a missing day is precisely the thing an owner needs to notice.
//
// Orden de la página (docs/UX-PANEL.md §2.2): lo que se consulta y lo que
// se hace seguido arriba; lo que se configura una vez, al final. El
// horario semanal se arma un día y casi no se toca; bloquear un rato
// ("hoy salgo a las 4") pasa cada semana. Por eso, cuando ya hay horario:
// la semana → bloquear → "agregar más horas" plegado. Sin horario todavía,
// el formulario va primero, porque sin él la página no ofrece nada.
export default async function SchedulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Sin el producto de citas, esta pantalla no aplica. Redirige en vez
  // de 404: un 404 dentro del propio panel se lee como un error del
  // sistema, no como "no contrataste esto".
  const productos = await productosDe(slug);
  // Igual que "quién atiende": sin horario no hay huecos que ofrecer,
  // ni para una cita ni para una reunión.
  if (!productos.reservas && !productos.reuniones) redirect('/dashboard');

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, timezone')
    .eq('slug', slug)
    .single();

  const [{ data: resources }, { data: schedulesRaw }, { data: blocksRaw }] = await Promise.all([
    supabase.from('resources').select('id, name, active').eq('tenant_id', tenant!.id).order('created_at'),
    supabase
      .from('resource_schedules')
      .select('id, resource_id, day_of_week, starts_at, ends_at')
      .eq('tenant_id', tenant!.id)
      .order('starts_at'),
    // Only what's still ahead: a block that already ended is history, and
    // listing it would bury the ones that still affect the agenda.
    supabase
      .from('schedule_blocks')
      .select('id, resource_id, starts_at, ends_at, reason')
      .eq('tenant_id', tenant!.id)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at'),
  ]);

  const schedules = (schedulesRaw ?? []) as ScheduleRow[];
  const blocks = (blocksRaw ?? []) as ScheduleBlock[];
  const tz = tenant?.timezone ?? null;
  const sinHorario = schedules.length === 0;

  const header = (
    <PageHeader
      title="Horario"
      description="A qué hora te pueden reservar. Tu página solo ofrece horas dentro de este horario."
      help={
        <HelpTip title="¿Cómo funciona el horario?">
          Pones a qué hora abre cada persona, por ejemplo de lunes a viernes de 9:00 a 18:00. Tu
          página solo ofrece citas en esas horas. Si un día no vas a estar (vacaciones, una tarde
          libre), no cambies el horario: usa &quot;Bloquear un rato&quot;.
        </HelpTip>
      }
      action={
        resources && resources.length > 0 && !sinHorario ? (
          <IrAlCampo campo="blk-start">
            <CalendarOff className="h-4 w-4" aria-hidden="true" />
            Bloquear un rato
          </IrAlCampo>
        ) : undefined
      }
    />
  );

  if (!resources || resources.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          icon={Users}
          title="Primero agrega quién atiende"
          description="El horario va por persona o lugar: cada quien puede tener el suyo."
          why="Sin alguien que atienda, no hay a quién ponerle horario."
          action={
            <Link
              href="/dashboard/resources"
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              Agregar quién atiende
            </Link>
          }
        />
      </div>
    );
  }

  const formulario = (
    <AddBar>
      <ActionForm action={createScheduleSlot.bind(null, slug)} success="Horario guardado">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem] sm:items-start">
            <FormField label="¿Para quién?" className="col-span-2 sm:col-span-1">
              <Select id="sch-resource" name="resource_id" required className="min-h-[2.75rem] w-full">
                {/* Primero y por defecto: en la mayoría de los negocios
                    todos abren a la misma hora, y ese caso debería costar
                    un envío, no uno por persona. */}
                {resources.length > 1 && <option value="__todos__">Todos ({resources.length})</option>}
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {resources.length > 1 ? `Solo ${r.name}` : r.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Abre a las">
              <Input type="time" name="starts_at" required defaultValue="09:00" className="min-h-[2.75rem] w-full" />
            </FormField>
            <FormField label="Cierra a las">
              <Input type="time" name="ends_at" required defaultValue="18:00" className="min-h-[2.75rem] w-full" />
            </FormField>
          </div>

          <WeekdayPicker defaultDays={[1, 2, 3, 4, 5]} />

          <p className="text-[13px] leading-relaxed text-muted">
            ¿Cierras a mediodía? Guarda dos horarios los mismos días, por ejemplo 9:00–14:00 y
            luego 16:00–20:00.
          </p>

          <SubmitButton className="min-h-[2.75rem] w-full sm:w-fit">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Guardar horario
          </SubmitButton>
        </div>
      </ActionForm>
    </AddBar>
  );

  const semana = (
    <div className="flex flex-col gap-10">
      {resources.map((r) => {
        const own = schedules.filter((s) => s.resource_id === r.id);
        const openDays = DAYS.filter((d) => own.some((s) => s.day_of_week === d.value)).length;
        return (
          <section key={r.id} aria-label={'Horario de ' + r.name}>
            <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
              <h2 className="font-semibold text-ink">
                {r.name}
                {!r.active && <span className="ml-2 text-[13px] font-normal text-muted">(oculto de tu página)</span>}
              </h2>
              <span className="text-sm tabular-nums text-muted">
                {openDays === 0 ? 'Sin horario' : `Abre ${openDays} ${openDays === 1 ? 'día' : 'días'}`}
              </span>
            </div>

            <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
              {DAYS.map((d, i) => {
                const slots = own.filter((s) => s.day_of_week === d.value);
                return (
                  <li
                    key={d.value}
                    className={
                      'flex min-h-[3.5rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-5 ' +
                      (i > 0 ? 'border-t border-border' : '')
                    }
                  >
                    <span className={'w-24 shrink-0 text-sm font-medium ' + (slots.length ? 'text-ink' : 'text-muted')}>
                      {d.label}
                    </span>
                    {slots.length === 0 ? (
                      <span className="text-sm text-muted">Cerrado</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {slots.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center rounded-full border border-border pl-3.5 text-sm tabular-nums text-ink"
                          >
                            {hora(s.starts_at)} – {hora(s.ends_at)}
                            <ConfirmarConAviso
                              action={deleteScheduleSlot.bind(null, s.id, slug)}
                              success="Horario quitado"
                              confirmTitle="¿Quitar este horario?"
                              confirmMessage={`${r.name} ya no recibe citas el ${d.label.toLowerCase()} de ${hora(s.starts_at)} a ${hora(s.ends_at)}. Las citas que ya tenías en ese horario siguen en pie.`}
                              confirmLabel="Sí, quitar"
                              dismissLabel="No, dejarlo"
                              triggerVariant="ghost"
                              triggerClassName="h-11 w-11 !border-0 !p-0 !text-muted hover:!bg-error-soft hover:!text-error"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">
                                Quitar {hora(s.starts_at)} a {hora(s.ends_at)} del {d.label.toLowerCase()}
                              </span>
                            </ConfirmarConAviso>
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );

  const bloqueos = (
    <BlocksSection
      slug={slug}
      blocks={blocks}
      resources={resources.map((r) => ({ id: r.id, name: r.name }))}
      timezone={tz}
      today={dayKey(new Date(), tz)}
      createAction={createScheduleBlock}
      deleteAction={deleteScheduleBlock}
    />
  );

  if (sinHorario) {
    return (
      <div>
        {header}
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2 px-1">
            <Clock3 className="h-5 w-5 text-ink/70" aria-hidden="true" />
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">Pon tu horario</h2>
          </div>
          <p className="mb-4 max-w-prose px-1 text-sm leading-relaxed text-muted">
            Ya viene de lunes a viernes de 9:00 a 18:00. Si así trabajas, solo toca &quot;Guardar
            horario&quot;. Si no, cambia las horas o los días.
          </p>
          {formulario}
        </div>
        <div className="mt-12">{semana}</div>
        {bloqueos}
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="mt-8">{semana}</div>
      {bloqueos}

      <details className="group mt-12">
        <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center gap-2 rounded-xl px-1 text-[17px] font-semibold tracking-tight text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
          <Plus className="h-5 w-5 transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true" />
          Agregar o cambiar horas
        </summary>
        <p className="mb-4 mt-1 max-w-prose px-1 text-sm leading-relaxed text-muted">
          Para cambiar un horario, quita el que sobra con la ✕ y guarda el nuevo aquí.
        </p>
        {formulario}
      </details>
    </div>
  );
}
