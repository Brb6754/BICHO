import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createResource, toggleResourceActive, deleteResource } from './actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ItemList, ItemRow, ActiveSwitch, AddBar } from '@/components/tenant-dash/ItemList';
import { ResourceServices } from './ResourceServices';

export default async function ResourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Sin el producto de citas, esta pantalla no aplica. Redirige en vez
  // de 404: un 404 dentro del propio panel se lee como un error del
  // sistema, no como "no contrataste esto".
  const productos = await productosDe(slug);
  if (!productos.reservas) redirect('/dashboard');

  const supabase = await createClient();

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();

  const { data: resources } = await supabase
    .from('resources')
    .select('id, name, active')
    .eq('tenant_id', tenant!.id)
    .order('created_at');

  const activeCount = resources?.filter((r) => r.active).length ?? 0;

  const { data: services } = await supabase
    .from('service_types')
    .select('id, name')
    .eq('tenant_id', tenant!.id)
    .eq('active', true)
    .order('name');

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
        description="Las personas, sillas, consultorios o pistas que se pueden reservar. Solo los activos aparecen en tu página."
      />

      <div className="mt-8">
        <AddBar>
          <form action={createResource.bind(null, slug)} className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="resource-name">
              Nombre
            </label>
            <Input
              id="resource-name"
              type="text"
              name="name"
              placeholder="Ej. Renata, Silla 2, Consultorio A"
              required
              className="w-full flex-1"
            />
            <Button type="submit" className="shrink-0">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </form>
        </AddBar>
      </div>

      <div className="mt-8">
        {resources && resources.length > 0 ? (
          <>
            <p className="mb-3 px-1 text-sm text-muted">
              {activeCount} de {resources.length} {resources.length === 1 ? 'activo' : 'activos'}
            </p>
            <ItemList>
              {resources.map((r, i) => (
                <ItemRow
                  key={r.id}
                  first={i === 0}
                  title={r.name}
                  meta={r.active ? 'Disponible para reservar' : 'Oculto de tu página'}
                  inactive={!r.active}
                  body={
                    links ? (
                      <ResourceServices
                        slug={slug}
                        resourceId={r.id}
                        resourceName={r.name}
                        services={services ?? []}
                        selected={serviciosDe(r.id)}
                      />
                    ) : null
                  }
                  trail={
                    <>
                      <form action={toggleResourceActive.bind(null, r.id, !r.active, slug)}>
                        <ActiveSwitch active={r.active} label={r.name} />
                      </form>
                      <ConfirmForm
                        action={deleteResource.bind(null, r.id, slug)}
                        confirmTitle="Borrar recurso"
                        confirmMessage={`¿Borrar "${r.name}"? Esta acción no se puede deshacer. Si solo quieres dejar de ofrecerlo, apágalo con el interruptor.`}
                        confirmLabel="Borrar"
                        triggerVariant="ghost"
                        triggerClassName="h-8 w-8 !border-0 !p-0 !text-muted hover:!bg-error-soft hover:!text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Borrar {r.name}</span>
                      </ConfirmForm>
                    </>
                  }
                />
              ))}
            </ItemList>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">Todavía no hay nadie que atienda</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
              Agrega a la primera persona o espacio arriba. Sin al menos uno, tu página no puede ofrecer horarios.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
