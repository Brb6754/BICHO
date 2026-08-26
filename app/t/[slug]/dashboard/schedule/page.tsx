import { Clock3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createScheduleSlot, deleteScheduleSlot } from './actions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';

// Display order is Monday-first for UX, but the value= sent to the DB is
// still Postgres's extract(dow) convention (0=Sunday..6=Saturday) — see
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

export default async function SchedulePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', params.slug).single();

  const { data: resources } = await supabase
    .from('resources')
    .select('id, name')
    .eq('tenant_id', tenant!.id)
    .order('created_at');

  type ScheduleRow = {
    id: string;
    day_of_week: number;
    starts_at: string;
    ends_at: string;
    resources: { name: string } | null;
  };

  const { data: schedulesRaw } = await supabase
    .from('resource_schedules')
    .select('id, day_of_week, starts_at, ends_at, resources(name)')
    .eq('tenant_id', tenant!.id)
    .order('day_of_week');

  // Supabase infers the resources(name) embed as an array without
  // generated Database types, but a many-to-one FK actually returns a
  // single object at runtime — cast to what it really is.
  const schedules = schedulesRaw as unknown as ScheduleRow[] | null;

  return (
    <div>
      <Text variant="h1">Horarios</Text>
      <Text variant="body" className="mt-1 text-muted">
        Cuándo está disponible cada recurso, día por día.
      </Text>

      {!resources || resources.length === 0 ? (
        <Card className="mt-6">
          <p className="text-muted">
            Primero crea un recurso en la sección &quot;Recursos&quot;.
          </p>
        </Card>
      ) : (
        <Card className="mt-6">
          <form
            action={createScheduleSlot.bind(null, params.slug)}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[160px]">
              <Label>Recurso</Label>
              <Select name="resource_id" required className="w-full">
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Label>Día</Label>
              <Select name="day_of_week" required className="w-full">
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Abre</Label>
              <Input type="time" name="starts_at" required defaultValue="09:00" className="w-32" />
            </div>
            <div>
              <Label>Cierra</Label>
              <Input type="time" name="ends_at" required defaultValue="18:00" className="w-32" />
            </div>
            <Button type="submit">Agregar</Button>
          </form>
        </Card>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {schedules?.map((s) => (
          <li key={s.id}>
            <Card padded={false} className="flex items-center justify-between px-6 py-4">
              <span className="text-ink">
                <span className="font-medium">{s.resources?.name}</span>{' '}
                <span className="text-muted">
                  — {DAYS.find((d) => d.value === s.day_of_week)?.label}{' '}
                  {s.starts_at.slice(0, 5)}–{s.ends_at.slice(0, 5)}
                </span>
              </span>
              <ConfirmForm
                action={deleteScheduleSlot.bind(null, s.id, params.slug)}
                confirmTitle="Borrar horario"
                confirmMessage="¿Seguro que quieres borrar este horario? Esta acción no se puede deshacer."
                confirmLabel="Borrar"
                triggerClassName="px-4 py-1.5 text-xs"
              >
                Borrar
              </ConfirmForm>
            </Card>
          </li>
        ))}
      </ul>
      {resources && resources.length > 0 && schedules?.length === 0 && (
        <Card className="mt-6">
          <EmptyState
            icon={Clock3}
            title="Todavía no hay horarios"
            description="Agrega el primero desde el formulario de arriba para que tus recursos tengan disponibilidad real."
          />
        </Card>
      )}
    </div>
  );
}
