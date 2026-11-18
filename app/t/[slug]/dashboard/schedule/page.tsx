import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Clock3, Plus, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  createScheduleBlock,
  createScheduleSlot,
  deleteScheduleBlock,
  deleteScheduleSlot,
} from './actions';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { BlocksSection, type ScheduleBlock } from '@/components/tenant-dash/BlocksSection';
import { AbrirHoja, HojaFormulario } from '@/components/tenant-dash/fichas/Hoja';
import { SemanaVisual } from '@/components/tenant-dash/fichas/SemanaVisual';
import { CAMPO, Campo } from '@/components/tenant-dash/fichas/visual';
import { dayKey } from '@/lib/dates/tenantTime';
import { WeekdayPicker } from './WeekdayPicker';

type ScheduleRow = {
  id: string;
  resource_id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
};

// HORARIO — la semana de cada persona como barras que se tocan.
//
// Arriba se elige a quién ver; su semana son siete barras sobre una regla
// de horas, y tocar una barra la cambia, la copia a otros días o la quita
// (fichas/SemanaVisual). Debajo, bloquear un rato con botones para lo de
// siempre (salir temprano, un día libre, vacaciones). Agregar horas a
// varios días o a todos a la vez es la hoja del botón de arriba.
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
  const hoy = dayKey(new Date(), tz);
  const hayGente = !!resources && resources.length > 0;
  const sinHorario = schedules.length === 0;

  const agregar = (
    <AbrirHoja id="agregar-horas">
      <Plus className="h-5 w-5" aria-hidden="true" />
      {sinHorario ? 'Poner mi horario' : 'Agregar horas'}
    </AbrirHoja>
  );

  const header = (
    <PageHeader
      title="Horario"
      description="A qué hora te pueden reservar."
      help={
        <HelpTip title="¿Cómo funciona el horario?">
          Pones a qué hora abre cada persona, por ejemplo de lunes a viernes de 9:00 a 18:00. Tu
          página solo ofrece citas en esas horas. Toca una barra para cambiarla o copiarla a otros
          días. Si un día no vas a estar, no cambies el horario: usa &quot;Bloquear un rato&quot;.
        </HelpTip>
      }
      action={hayGente ? agregar : undefined}
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
          action={
            <Link
              href="/dashboard/resources"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-[15px] font-semibold text-[rgb(var(--color-cta-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              Agregar quién atiende
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {header}

      {sinHorario && (
        <section className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl border border-dashed border-border-strong bg-surface p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-[rgb(var(--color-cta-fg))]" aria-hidden="true">
            <Clock3 className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1 basis-56">
            <h2 className="text-[17px] font-semibold text-ink">Pon tu horario</h2>
            <p className="text-[15px] text-muted">Ya viene de lunes a viernes de 9:00 a 18:00. Si así trabajas, solo guarda.</p>
          </div>
          {agregar}
        </section>
      )}

      <div className="mt-6">
        <SemanaVisual
          personas={resources}
          franjas={schedules}
          bloqueos={blocks}
          timezone={tz}
          hoyKey={hoy}
          acciones={{ slug, crear: createScheduleSlot, quitar: deleteScheduleSlot, quitarBloqueo: deleteScheduleBlock }}
        />
      </div>

      <BlocksSection
        slug={slug}
        blocks={blocks}
        resources={resources.map((r) => ({ id: r.id, name: r.name }))}
        timezone={tz}
        today={hoy}
        createAction={createScheduleBlock}
        deleteAction={deleteScheduleBlock}
      />

      <HojaFormulario
        id="agregar-horas"
        titulo={sinHorario ? 'Pon tu horario' : 'Agregar horas'}
        action={createScheduleSlot.bind(null, slug)}
        success="Horario guardado"
        enviar="Guardar horario"
      >
        <Campo label="¿Para quién?">
          <select name="resource_id" required className={CAMPO}>
            {/* Primero y por defecto: en la mayoría de los negocios todos abren a la misma hora. */}
            {resources.length > 1 && <option value="__todos__">Todos ({resources.length})</option>}
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {resources.length > 1 ? `Solo ${r.name}` : r.name}
              </option>
            ))}
          </select>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Abre a las">
            <input type="time" name="starts_at" required defaultValue="09:00" className={CAMPO} />
          </Campo>
          <Campo label="Cierra a las">
            <input type="time" name="ends_at" required defaultValue="18:00" className={CAMPO} />
          </Campo>
        </div>
        <WeekdayPicker defaultDays={[1, 2, 3, 4, 5]} />
        <p className="text-[14px] leading-relaxed text-muted">
          ¿Cierras a mediodía? Guarda dos horarios los mismos días: 9:00–14:00 y luego 16:00–20:00.
        </p>
      </HojaFormulario>
    </div>
  );
}
