import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { configDesdeFila, montoAnticipo } from '@/lib/anticipos/config';
import { Plus, Sparkles, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createService, updateService, toggleServiceActive, deleteService } from './actions';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { esServicio } from '@/lib/meetings/kinds';
import { AbrirHoja, HojaFormulario } from '@/components/tenant-dash/fichas/Hoja';
import { CamposServicio, ServicioCard } from '@/components/tenant-dash/fichas/ServicioCard';
import { IdeasServicios } from '@/components/tenant-dash/fichas/IdeasServicios';

const HOJA = 'nuevo-servicio';

// SERVICIOS — tarjetas, no renglones de un documento.
//
// Cada servicio es una tarjeta con su color, el precio grande y la
// duración en una ficha. Agregar y editar pasan en una hoja que sube desde
// abajo, sin perder la lista de vista. Las ideas por giro llenan la hoja
// con nombre y duración y dejan el precio vacío: el precio lo pone ella.
export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Sin el producto de citas, esta pantalla no aplica. Redirige en vez
  // de 404: un 404 dentro del propio panel se lee como un error del
  // sistema, no como "no contrataste esto".
  const productos = await productosDe(slug);
  if (!productos.reservas) redirect('/dashboard');

  const supabase = await createClient();
  // `*`: sin db/061 no vienen las columnas de anticipo y todo cae en "sin anticipo".
  const { data: tenant } = await supabase.from('tenants').select('*').eq('slug', slug).single();
  const anticipo = configDesdeFila(tenant);
  const { data: services_raw } = await supabase
    .from('service_types')
    .select('*')
    .eq('tenant_id', tenant!.id)
    .order('created_at');

  // Los tipos de reunión comparten tabla (db/039) pero se administran
  // en su propia pantalla: aquí serían tarjetas de $0 que nadie explica.
  const services = (services_raw ?? []).filter(esServicio);
  const activeCount = services.filter((s) => s.active).length;

  const agregar = (
    <AbrirHoja id={HOJA}>
      <Plus className="h-5 w-5" aria-hidden="true" />
      Agregar servicio
    </AbrirHoja>
  );

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Lo que tus clientas pueden reservar."
        help={
          <HelpTip title="¿Qué es un servicio?">
            Cada cosa que se puede reservar: &quot;Corte de dama, 45 min, $250&quot;. La duración
            decide cuánto tiempo se aparta en la agenda. Solo los que tienen el interruptor prendido
            aparecen en tu página. Toca una tarjeta para cambiarle el nombre, el precio o la duración.
          </HelpTip>
        }
        action={services.length > 0 ? agregar : undefined}
      />

      {services.length > 0 ? (
        <>
          <p className="mt-6 px-1 text-[15px] text-muted">
            <span className="font-semibold text-ink">{activeCount}</span> de {services.length} se ofrecen en tu página
            {anticipo.activado && (
              <>
                {' · '}
                <Link
                  href="/dashboard/anticipos"
                  className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Cambiar anticipos
                </Link>
              </>
            )}
          </p>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {services.map((s) => (
              <ServicioCard
                key={s.id}
                s={s}
                anticipoMxn={montoAnticipo(anticipo, s)}
                acciones={{
                  editar: updateService.bind(null, s.id, slug),
                  alternar: toggleServiceActive.bind(null, s.id, !s.active, slug),
                  borrar: deleteService.bind(null, s.id, slug),
                }}
              />
            ))}
          </ul>
          <details className="group mt-10 rounded-3xl bg-ink/[0.03] p-4 sm:p-5">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl text-[17px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
              <Sparkles className="h-5 w-5 text-ink/70" aria-hidden="true" />
              Ideas de servicios típicos
              <Plus className="ml-auto h-5 w-5 text-muted transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <div className="mt-3">
              <IdeasServicios hojaId={HOJA} existentes={services.map((s) => s.name)} />
            </div>
          </details>
        </>
      ) : (
        <section className="mt-8 rounded-3xl border border-dashed border-border-strong bg-surface p-5 sm:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-[rgb(var(--color-cta-fg))]" aria-hidden="true">
            <Tag className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-[1.375rem] font-semibold tracking-tight text-ink">Agrega tu primer servicio</h2>
          <p className="mt-1 max-w-md text-[16px] leading-relaxed text-muted">
            Sin al menos uno, tu página no puede ofrecer citas. Empieza con una idea o escribe el tuyo.
          </p>
          <div className="mt-6">
            <IdeasServicios hojaId={HOJA} existentes={[]} />
          </div>
          <div className="mt-6">{agregar}</div>
        </section>
      )}

      <HojaFormulario
        id={HOJA}
        titulo="Agregar servicio"
        action={createService.bind(null, slug)}
        success="Servicio agregado"
        enviar="Agregar servicio"
      >
        <CamposServicio />
      </HojaFormulario>
    </div>
  );
}
