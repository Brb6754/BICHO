import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import { Plus, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createResource, toggleResourceActive, deleteResource } from './actions';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ResourceServices } from './ResourceServices';
import { esServicio } from '@/lib/meetings/kinds';
import { AbrirHoja, HojaFormulario } from '@/components/tenant-dash/fichas/Hoja';
import { PersonaCard, FichasServicios, type CitaPersona } from '@/components/tenant-dash/fichas/PersonaCard';
import { CAMPO, Campo } from '@/components/tenant-dash/fichas/visual';

const HOJA = 'nueva-persona';

// QUIÉN ATIENDE — tarjetas de persona: iniciales a color, sus servicios
// como fichas y su horario en una línea. Tocar a alguien abre su agenda y
// su disponibilidad de la semana. Agregar es una hoja con un solo campo.
export default async function ResourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Sin el producto de citas (o de reuniones, que usa a las mismas
  // personas), esta pantalla no aplica. Redirige en vez de 404: un 404
  // dentro del propio panel se lee como un error del sistema.
  const productos = await productosDe(slug);
  if (!productos.reservas && !productos.reuniones) redirect('/dashboard');

  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id, timezone').eq('slug', slug).single();
  const now = new Date();
  const enUnaSemana = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: resources }, { data: services_raw }, { data: schedules }, { data: proximas }] = await Promise.all([
    supabase.from('resources').select('id, name, active').eq('tenant_id', tenant!.id).order('created_at'),
    supabase.from('service_types').select('*').eq('tenant_id', tenant!.id).eq('active', true).order('name'),
    supabase.from('resource_schedules').select('resource_id, day_of_week, starts_at, ends_at').eq('tenant_id', tenant!.id),
    // Sus citas de la semana, para la agenda que se abre al tocarla.
    supabase
      .from('bookings')
      .select('id, starts_at, status, resource_id, service_types(name), customers(name)')
      .eq('tenant_id', tenant!.id)
      .neq('status', 'cancelled')
      .gte('starts_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .lte('starts_at', enUnaSemana)
      .order('starts_at'),
  ]);

  const services = (services_raw ?? []).filter(esServicio);

  // db/032, en su propia consulta: si la tabla todavía no existe, se
  // pierden las fichas de servicios, no la pantalla entera.
  const { data: links } = await supabase.from('resource_services').select('resource_id, service_type_id').eq('tenant_id', tenant!.id);
  const serviciosDe = (resourceId: string) => (links ?? []).filter((l) => l.resource_id === resourceId).map((l) => l.service_type_id);

  const citas = ((proximas ?? []) as unknown as {
    id: string;
    starts_at: string;
    status: string;
    resource_id: string;
    service_types: { name: string } | null;
    customers: { name: string } | null;
  }[]).map((c) => ({ ...c, servicio: c.service_types?.name ?? null, cliente: c.customers?.name ?? null }));
  const citasDe = (id: string): CitaPersona[] => citas.filter((c) => c.resource_id === id);

  const activeCount = resources?.filter((r) => r.active).length ?? 0;
  const agregar = (
    <AbrirHoja id={HOJA}>
      <Plus className="h-5 w-5" aria-hidden="true" />
      Agregar persona o lugar
    </AbrirHoja>
  );

  return (
    <div>
      <PageHeader
        title="Quién atiende"
        description="Las personas o lugares con los que te reservan. Toca a alguien para ver su agenda."
        help={
          <HelpTip title="¿Qué va en “Quién atiende”?">
            Una persona (Renata, Paola) o un lugar (Silla 2, Cabina 1). Si atiendes tú sola, agrégate
            a ti. Cada uno tiene su propio horario y dos clientas no pueden reservar con el mismo a la
            misma hora. Si alguien no hace algún servicio, toca &quot;Cambiar servicios&quot; y
            quítaselo.
          </HelpTip>
        }
        action={resources && resources.length > 0 ? agregar : undefined}
      />

      {resources && resources.length > 0 ? (
        <>
          <p className="mt-6 px-1 text-[15px] text-muted">
            <span className="font-semibold text-ink">{activeCount}</span> de {resources.length} se ofrecen en tu página
          </p>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {resources.map((r) => (
              <PersonaCard
                key={r.id}
                persona={r}
                franjas={(schedules ?? []).filter((s) => s.resource_id === r.id)}
                citas={citasDe(r.id)}
                timezone={tenant?.timezone ?? null}
                now={now}
                base="/dashboard"
                servicios={
                  links && services.length > 0 ? (
                    <ResourceServices slug={slug} resourceId={r.id} resourceName={r.name} services={services} selected={serviciosDe(r.id)} />
                  ) : (
                    <FichasServicios nombres={null} />
                  )
                }
                acciones={{
                  alternar: toggleResourceActive.bind(null, r.id, !r.active, slug),
                  borrar: deleteResource.bind(null, r.id, slug),
                }}
              />
            ))}
          </ul>
        </>
      ) : (
        <section className="mt-8 rounded-3xl border border-dashed border-border-strong bg-surface p-5 sm:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-[rgb(var(--color-cta-fg))]" aria-hidden="true">
            <UserPlus className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-[1.375rem] font-semibold tracking-tight text-ink">¿Quién da los servicios?</h2>
          <p className="mt-1 max-w-md text-[16px] leading-relaxed text-muted">
            Agrega a cada persona, o el lugar que se reserva. Si atiendes tú sola, agrégate a ti.
          </p>
          <div className="mt-6">{agregar}</div>
        </section>
      )}

      <HojaFormulario id={HOJA} titulo="Agregar a quien atiende" action={createResource.bind(null, slug)} success="Agregado a quién atiende" enviar="Agregar">
        <Campo label="¿Cómo se llama?" ayuda="Una persona o un lugar: Renata, Silla 2, Cabina 1.">
          <input id="resource-name" type="text" name="name" required maxLength={80} placeholder="Ej. Renata" className={CAMPO} />
        </Campo>
      </HojaFormulario>
    </div>
  );
}
