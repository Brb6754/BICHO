import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createService, toggleServiceActive, deleteService } from './actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ItemList, ItemRow, ActiveSwitch, AddBar } from '@/components/tenant-dash/ItemList';

function formatPrice(cents: number) {
  // Whole pesos when there are no centavos — "$450" reads as a price,
  // "$450.00 MXN" on every row reads as an invoice.
  const pesos = cents / 100;
  return '$' + (Number.isInteger(pesos) ? pesos.toLocaleString('es-MX') : pesos.toFixed(2));
}

// Lo que el dueño lee en su propia lista. Un «$0» pelado no dice nada:
// no distingue «es gratis» de «todavía no le pongo precio», que era justo
// la queja. Las tres frases son las tres cosas que pueden ser ciertas.
function precioEnLista(s: { price_cents: number; show_price?: boolean }) {
  if (s.show_price === false) return 'Sin precio público';
  if (s.price_cents === 0) return 'Sin costo';
  return formatPrice(s.price_cents);
}

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Sin el producto de citas, esta pantalla no aplica. Redirige en vez
  // de 404: un 404 dentro del propio panel se lee como un error del
  // sistema, no como "no contrataste esto".
  const productos = await productosDe(slug);
  if (!productos.reservas) redirect('/dashboard');

  const supabase = await createClient();

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();

  const { data: services } = await supabase
    .from('service_types')
    .select('*')
    .eq('tenant_id', tenant!.id)
    .order('created_at');

  const activeCount = services?.filter((s) => s.active).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Lo que tus clientes pueden reservar, con su duración y precio. Solo los activos aparecen en tu página."
      />

      <div className="mt-8">
        <AddBar>
          {/* Labelled fields in a grid instead of a wrapping flex row:
              the old form reflowed unpredictably and the number inputs
              had no visible unit. Units now sit in the label. */}
          <form
            action={createService.bind(null, slug)}
            className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem_auto] sm:items-end"
          >
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="svc-name" className="mb-1.5 block text-xs font-medium text-muted">
                Servicio
              </label>
              <Input id="svc-name" type="text" name="name" placeholder="Corte de cabello" required className="w-full" />
            </div>
            <div>
              <label htmlFor="svc-duration" className="mb-1.5 block text-xs font-medium text-muted">
                Duración (min)
              </label>
              <Input
                id="svc-duration"
                type="number"
                name="duration_minutes"
                min={5}
                step={5}
                defaultValue={30}
                required
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="svc-price" className="mb-1.5 block text-xs font-medium text-muted">
                Precio (MXN)
              </label>
              <Input
                id="svc-price"
                type="number"
                name="price_mxn"
                min={0}
                step="0.01"
                defaultValue={0}
                className="w-full"
              />
            </div>
            <Button type="submit" className="col-span-2 sm:col-span-1">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
            <label className="col-span-2 flex items-center gap-2 text-sm text-muted sm:col-span-4">
              <input type="checkbox" name="requires_staff" defaultChecked className="h-4 w-4 accent-primary" />
              Lo atiende una persona (desmárcalo para una pista o un espacio)
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm text-muted sm:col-span-4">
              <input type="checkbox" name="show_price" defaultChecked className="h-4 w-4 accent-primary" />
              Mostrar el precio en mi página (desmárcalo si prefieres cotizarlo aparte)
            </label>
          </form>
        </AddBar>
      </div>

      <div className="mt-8">
        {services && services.length > 0 ? (
          <>
            <p className="mb-3 px-1 text-sm text-muted">
              {activeCount} de {services.length} {services.length === 1 ? 'activo' : 'activos'}
            </p>
            <ItemList>
              {services.map((s, i) => (
                <ItemRow
                  key={s.id}
                  first={i === 0}
                  inactive={!s.active}
                  title={s.name}
                  meta={
                    <>
                      {s.duration_minutes} min
                      {!s.requires_staff && <span className="text-muted/70"> &middot; sin persona asignada</span>}
                    </>
                  }
                  trail={
                    <>
                      <span className="mr-2 font-semibold tabular-nums text-ink">{precioEnLista(s)}</span>
                      <form action={toggleServiceActive.bind(null, s.id, !s.active, slug)}>
                        <ActiveSwitch active={s.active} label={s.name} />
                      </form>
                      <ConfirmForm
                        action={deleteService.bind(null, s.id, slug)}
                        confirmTitle="Borrar servicio"
                        confirmMessage={`¿Borrar "${s.name}"? Esta acción no se puede deshacer. Si solo quieres dejar de ofrecerlo, apágalo con el interruptor.`}
                        confirmLabel="Borrar"
                        triggerVariant="ghost"
                        triggerClassName="h-8 w-8 !border-0 !p-0 !text-muted hover:!bg-error-soft hover:!text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Borrar {s.name}</span>
                      </ConfirmForm>
                    </>
                  }
                />
              ))}
            </ItemList>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">Todavía no hay servicios</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
              Agrega el primero arriba. Es lo que tus clientes van a elegir al reservar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
