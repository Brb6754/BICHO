import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import { Plus, Trash2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createResource, toggleResourceActive, deleteResource } from './actions';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionForm, SubmitButton } from '@/components/tenant-dash/ui/ActionForm';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { ConfirmarConAviso, IrAlCampo, BOTON_ICONO } from '@/components/tenant-dash/AccionesFila';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ItemList, ItemRow, ActiveSwitch, AddBar } from '@/components/tenant-dash/ItemList';
import { ResourceServices } from './ResourceServices';
import { esServicio } from '@/lib/meetings/kinds';

export default async function ResourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Sin el producto de citas, esta pantalla no aplica. Redirige en vez
  // de 404: un 404 dentro del propio panel se lee como un error del
  // sistema, no como "no contrataste esto".
  const productos = await productosDe(slug);
  // También la necesita el módulo de reuniones: los asesores que
  // atienden a un prospecto son los mismos "recursos" de la agenda, y
  // sin esta pantalla un negocio que solo contrató reuniones no
  // tendría dónde darlos de alta.
  if (!productos.reservas && !productos.reuniones) redirect('/dashboard');

  const supabase = await createClient();

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();

  const { data: resources } = await supabase
    .from('resources')
    .select('id, name, active')
    .eq('tenant_id', tenant!.id)
    .order('created_at');

  const activeCount = resources?.filter((r) => r.active).length ?? 0;

  const { data: services_raw } = await supabase
    .from('service_types')
    .select('*')
    .eq('tenant_id', tenant!.id)
    .eq('active', true)
    .order('name');

  const services = (services_raw ?? []).filter(esServicio);

  // db/032, en su propia consulta: si la tabla todavía no existe, el
  // costo es el checklist — no la pantalla de recursos entera.
  const { data: links } = await supabase
    .from('resource_services')
    .select('resource_id, service_type_id')
    .eq('tenant_id', tenant!.id);

  const serviciosDe = (resourceId: string) =>
    (links ?? []).filter((l) => l.resource_id === resourceId).map((l) => l.service_type_id);

  return (
    <div>
      <PageHeader
        title="Quién atiende"
        description="Las personas o lugares con los que tus clientas pueden reservar. Cada uno lleva su agenda."
        help={
          <HelpTip title="¿Qué va en “Quién atiende”?">
            Una persona (Renata, Paola) o un lugar (Silla 2, Cabina 1, Consultorio A). Si tú sola
            atiendes, agrégate a ti. Cada uno tiene su propio horario, y dos clientas no pueden
            reservar con el mismo a la misma hora.
          </HelpTip>
        }
      />

      <div className="mt-8">
        <AddBar>
          <ActionForm action={createResource.bind(null, slug)} success="Agregado a quién atiende">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <FormField label="Nombre" hint="Una persona o un lugar: Renata, Silla 2, Cabina 1." className="flex-1">
                <Input
                  id="resource-name"
                  type="text"
                  name="name"
                  placeholder="Ej. Renata"
                  required
                  maxLength={80}
                  className="min-h-[2.75rem] w-full"
                />
              </FormField>
              <SubmitButton className="min-h-[2.75rem] shrink-0 sm:mt-[1.4rem]">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Agregar
              </SubmitButton>
            </div>
          </ActionForm>
        </AddBar>
      </div>

      <div className="mt-8">
        {resources && resources.length > 0 ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 px-1">
              <p className="text-sm text-muted">
                {activeCount} de {resources.length} se ofrecen en tu página
              </p>
              {links && services.length > 0 && (
                <HelpTip title="¿Qué servicios da cada quien?" label="¿Qué servicios da cada quien?">
                  Debajo de cada nombre dice qué servicios da. Si no cambias nada, da todos. Tócalo
                  para quitar los que no hace: por ejemplo, si Paola no hace uñas, tu página ya no
                  ofrece uñas con Paola.
                </HelpTip>
              )}
            </div>
            <ItemList>
              {resources.map((r, i) => (
                <ItemRow
                  key={r.id}
                  first={i === 0}
                  title={r.name}
                  meta={r.active ? 'Se ofrece en tu página' : 'Oculto de tu página'}
                  inactive={!r.active}
                  body={
                    links ? (
                      <ResourceServices
                        slug={slug}
                        resourceId={r.id}
                        resourceName={r.name}
                        services={services}
                        selected={serviciosDe(r.id)}
                      />
                    ) : null
                  }
                  trail={
                    <>
                      <ActionForm
                        action={toggleResourceActive.bind(null, r.id, !r.active, slug)}
                        success={r.active ? `${r.name}: oculto de tu página` : `${r.name}: ya se ofrece en tu página`}
                      >
                        <ActiveSwitch active={r.active} label={r.name} />
                      </ActionForm>
                      <ConfirmarConAviso
                        action={deleteResource.bind(null, r.id, slug)}
                        success={`${r.name} se borró`}
                        confirmTitle={`¿Borrar a ${r.name}?`}
                        // bookings.resource_id es ON DELETE CASCADE (db/001): borrar
                        // aquí se lleva sus citas. Se dice antes, no después.
                        confirmMessage={`Se borran también su horario y todas sus citas, las pasadas y las que vienen. No se puede deshacer. Si ${r.name} solo deja de atender un tiempo, mejor apaga el interruptor: se oculta de tu página y no pierdes nada.`}
                        confirmLabel="Sí, borrar todo"
                        dismissLabel="No, conservarlo"
                        triggerVariant="ghost"
                        triggerClassName={BOTON_ICONO}
                      >
                        <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
                        <span className="sr-only">Borrar a {r.name}</span>
                      </ConfirmarConAviso>
                    </>
                  }
                />
              ))}
            </ItemList>
          </>
        ) : (
          <EmptyState
            icon={Users}
            title="Todavía no hay nadie que atienda"
            description="Agrega a cada persona que da servicios, o el lugar que se reserva (una silla, una cabina). Si atiendes tú sola, agrégate a ti."
            why="Sin al menos uno, tu página no puede ofrecer horarios."
            action={<IrAlCampo campo="resource-name">Agregar a quien atiende</IrAlCampo>}
          />
        )}
      </div>
    </div>
  );
}
