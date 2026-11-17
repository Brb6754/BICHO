import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createService, toggleServiceActive, deleteService } from './actions';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionForm, SubmitButton } from '@/components/tenant-dash/ui/ActionForm';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { ConfirmarConAviso, IrAlCampo, BOTON_ICONO } from '@/components/tenant-dash/AccionesFila';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ItemList, ItemRow, ActiveSwitch, AddBar } from '@/components/tenant-dash/ItemList';
import { esServicio } from '@/lib/meetings/kinds';

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

  const { data: services_raw } = await supabase
    .from('service_types')
    .select('*')
    .eq('tenant_id', tenant!.id)
    .order('created_at');

  // Los tipos de reunión comparten tabla (db/039) pero se administran
  // en su propia pantalla: aquí serían filas con precio $0 que nadie
  // puede explicar.
  const services = (services_raw ?? []).filter(esServicio);

  const activeCount = services.filter((s) => s.active).length;

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Lo que tus clientas pueden reservar en tu página, con cuánto dura y cuánto cuesta."
        help={
          <HelpTip title="¿Qué es un servicio?">
            Cada cosa que se puede reservar: &quot;Corte de dama, 45 min, $250&quot;. La duración
            decide cuánto tiempo se aparta en la agenda. Solo los que tengan el interruptor
            prendido aparecen en tu página.
          </HelpTip>
        }
      />

      <div className="mt-8">
        <AddBar>
          {/* Lo indispensable a la vista: nombre, duración y precio. Las
              dos casillas que casi nadie cambia van plegadas, con su
              valor por defecto ya puesto. */}
          <ActionForm action={createService.bind(null, slug)} success="Servicio agregado">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-end">
              <FormField label="Nombre del servicio" className="col-span-2 sm:col-span-1">
                <Input
                  id="svc-name"
                  type="text"
                  name="name"
                  placeholder="Ej. Corte de dama"
                  required
                  maxLength={120}
                  className="min-h-[2.75rem] w-full"
                />
              </FormField>
              <FormField label="Dura (minutos)">
                <Input
                  type="number"
                  name="duration_minutes"
                  inputMode="numeric"
                  min={5}
                  step={5}
                  defaultValue={30}
                  required
                  className="min-h-[2.75rem] w-full"
                />
              </FormField>
              <FormField label="Precio ($)">
                <Input
                  type="number"
                  name="price_mxn"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="Ej. 250"
                  required
                  className="min-h-[2.75rem] w-full"
                />
              </FormField>
              <SubmitButton className="col-span-2 min-h-[2.75rem] sm:col-span-1">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Agregar servicio
              </SubmitButton>
            </div>

            <details className="group mt-3">
              <summary className="inline-flex min-h-[2.75rem] cursor-pointer list-none items-center gap-1.5 rounded-full px-1 text-sm font-medium text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
                <Plus className="h-4 w-4 transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true" />
                Más opciones
              </summary>
              <div className="mt-1 flex flex-col">
                <label className="flex min-h-[2.75rem] items-center gap-3 text-sm text-ink">
                  <input type="checkbox" name="show_price" defaultChecked className="h-5 w-5 shrink-0 accent-primary" />
                  Mostrar el precio en mi página
                  <span className="text-muted">(quítalo si lo cotizas aparte)</span>
                </label>
                <label className="flex min-h-[2.75rem] items-center gap-3 text-sm text-ink">
                  <input type="checkbox" name="requires_staff" defaultChecked className="h-5 w-5 shrink-0 accent-primary" />
                  Lo da una persona
                  <span className="text-muted">(quítalo si es una cabina o un espacio)</span>
                </label>
              </div>
            </details>
          </ActionForm>
        </AddBar>
      </div>

      <div className="mt-8">
        {services.length > 0 ? (
          <>
            <p className="mb-3 px-1 text-sm text-muted">
              {activeCount} de {services.length} se ofrecen en tu página
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
                      {s.duration_minutes} min · {precioEnLista(s)}
                      {!s.active && <span> · oculto de tu página</span>}
                    </>
                  }
                  trail={
                    <>
                      <ActionForm
                        action={toggleServiceActive.bind(null, s.id, !s.active, slug)}
                        success={s.active ? `${s.name}: oculto de tu página` : `${s.name}: ya se ofrece en tu página`}
                      >
                        <ActiveSwitch active={s.active} label={s.name} />
                      </ActionForm>
                      <ConfirmarConAviso
                        action={deleteService.bind(null, s.id, slug)}
                        success="Servicio borrado"
                        confirmTitle={`¿Borrar "${s.name}"?`}
                        confirmMessage="Se quita de tu lista para siempre. Si solo quieres dejar de ofrecerlo un tiempo, mejor apaga el interruptor: se oculta de tu página y lo prendes cuando quieras."
                        confirmLabel="Sí, borrar"
                        dismissLabel="No, conservarlo"
                        triggerVariant="ghost"
                        triggerClassName={BOTON_ICONO}
                      >
                        <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
                        <span className="sr-only">Borrar {s.name}</span>
                      </ConfirmarConAviso>
                    </>
                  }
                />
              ))}
            </ItemList>
          </>
        ) : (
          <EmptyState
            icon={Tag}
            title="Todavía no tienes servicios"
            description="Un servicio es lo que tus clientas eligen al reservar, por ejemplo “Corte de dama, 45 min, $250”."
            why="Sin al menos uno, tu página no puede ofrecer citas."
            action={<IrAlCampo campo="svc-name">Agregar mi primer servicio</IrAlCampo>}
          />
        )}
      </div>
    </div>
  );
}
