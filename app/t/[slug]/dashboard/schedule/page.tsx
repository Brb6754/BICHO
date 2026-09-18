import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  createScheduleBlock,
  createScheduleSlot,
  deleteScheduleBlock,
  deleteScheduleSlot,
} from './actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AddBar } from '@/components/tenant-dash/ItemList';
import { BlocksSection, type ScheduleBlock } from '@/components/tenant-dash/BlocksSection';

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

// HORARIO — a week per resource, not a list of rows.
//
// The old page was one card per slot, "Silla 1 — Lunes 09:00–18:00",
// sorted by day_of_week — which in Postgres starts on SUNDAY, so the week
// read backwards. Worse, a day with no hours simply didn't appear, and a
// missing day is precisely the thing an owner needs to notice ("why is
// nobody booking Thursdays?"). Now every resource shows all seven days in
// order, and an empty one says "Cerrado".
export default async function SchedulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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

  return (
    <div>
      <PageHeader
        title="Horario de atención"
        description="Cuándo puede reservarse cada persona o espacio. Tu página solo ofrece horas dentro de estos rangos."
      />

      {!resources || resources.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">Primero agrega quién atiende</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
            El horario se define por persona o espacio.{' '}
            <Link href="/dashboard/resources" className="font-medium text-ink underline underline-offset-4">
              Agregar uno
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <AddBar>
              <form
                action={createScheduleSlot.bind(null, slug)}
                className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_7rem_auto] sm:items-end"
              >
                <div>
                  <label htmlFor="sch-resource" className="mb-1.5 block text-xs font-medium text-muted">
                    Quién
                  </label>
                  <Select id="sch-resource" name="resource_id" required className="w-full">
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="sch-day" className="mb-1.5 block text-xs font-medium text-muted">
                    Día
                  </label>
                  <Select id="sch-day" name="day_of_week" required className="w-full">
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="sch-from" className="mb-1.5 block text-xs font-medium text-muted">
                    Desde
                  </label>
                  <Input id="sch-from" type="time" name="starts_at" required defaultValue="09:00" className="w-full" />
                </div>
                <div>
                  <label htmlFor="sch-to" className="mb-1.5 block text-xs font-medium text-muted">
                    Hasta
                  </label>
                  <Input id="sch-to" type="time" name="ends_at" required defaultValue="18:00" className="w-full" />
                </div>
                <Button type="submit" className="col-span-2 sm:col-span-1">
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </form>
              <p className="mt-3 text-xs text-muted">
                ¿Cierras a mediodía? Agrega dos rangos el mismo día, por ejemplo 9:00–14:00 y 16:00–20:00.
              </p>
            </AddBar>
          </div>

          <div className="mt-10 flex flex-col gap-10">
            {resources.map((r) => {
              const own = schedules.filter((s) => s.resource_id === r.id);
              const openDays = DAYS.filter((d) => own.some((s) => s.day_of_week === d.value)).length;
              return (
                <section key={r.id} aria-label={'Horario de ' + r.name}>
                  <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
                    <h2 className="font-semibold text-ink">
                      {r.name}
                      {!r.active && <span className="ml-2 text-xs font-normal text-muted">(inactivo)</span>}
                    </h2>
                    <span className="text-sm tabular-nums text-muted">
                      {openDays === 0 ? 'Sin horario' : `${openDays} ${openDays === 1 ? 'día' : 'días'} a la semana`}
                    </span>
                  </div>

                  <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
                    {DAYS.map((d, i) => {
                      const slots = own.filter((s) => s.day_of_week === d.value);
                      return (
                        <li
                          key={d.value}
                          className={
                            'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5 ' +
                            (i > 0 ? 'border-t border-border' : '')
                          }
                        >
                          <span
                            className={'w-24 shrink-0 text-sm font-medium ' + (slots.length ? 'text-ink' : 'text-muted')}
                          >
                            {d.label}
                          </span>
                          {slots.length === 0 ? (
                            <span className="text-sm text-muted">Cerrado</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {slots.map((s) => (
                                <span
                                  key={s.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-border py-1 pl-3 pr-1 text-sm tabular-nums text-ink"
                                >
                                  {s.starts_at.slice(0, 5)} – {s.ends_at.slice(0, 5)}
                                  <ConfirmForm
                                    action={deleteScheduleSlot.bind(null, s.id, slug)}
                                    confirmTitle="Quitar rango"
                                    confirmMessage={`¿Quitar ${s.starts_at.slice(0, 5)}–${s.ends_at.slice(
                                      0,
                                      5
                                    )} del ${d.label.toLowerCase()} de ${r.name}? Las citas ya agendadas no se cancelan.`}
                                    confirmLabel="Quitar"
                                    triggerVariant="ghost"
                                    triggerClassName="h-6 w-6 !border-0 !p-0 !text-muted hover:!bg-error-soft hover:!text-error"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span className="sr-only">Quitar este rango</span>
                                  </ConfirmForm>
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
        </>
      )}

      <BlocksSection
        slug={slug}
        blocks={blocks}
        resources={(resources ?? []).map((r) => ({ id: r.id, name: r.name }))}
        timezone={tenant?.timezone ?? null}
        createAction={createScheduleBlock}
        deleteAction={deleteScheduleBlock}
      />
    </div>
  );
}
