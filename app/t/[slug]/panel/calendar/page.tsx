import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AgendaCalendario } from '@/app/t/[slug]/dashboard/calendar/AgendaCalendario';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { tenantBookingPageUrl } from '@/lib/urls';
import { dayKey } from '@/lib/dates/tenantTime';
import { fechaDeParam, rangoDeCarga } from '@/lib/agenda/calendario';
import { conAnticiposDemo } from '@/lib/anticiposPanel';

export const dynamic = 'force-dynamic';

// La agenda de la demo: el MISMO calendario que el panel real, con citas
// inventadas dentro del horario del equipo (lib/demo/panelFixtures).
// Agendar, Vino, Cancelar y Cobrar funcionan como ejemplo en esta página
// y no guardan nada: así se recorre agendar → atender → cobrar.
export default async function AgendaDemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { slug } = await params;
  const { fecha: fechaParam } = await searchParams;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const tz = datos.tenant.timezone;
  const fecha = fechaDeParam(fechaParam, dayKey(datos.now, tz));
  const puedeAgendar = datos.services.length > 0 && datos.resources.length > 0;

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Tus citas en calendario. Prueba agendar una, marcar que vino y cobrarla: es un ejemplo y no se guarda."
        action={
          puedeAgendar ? (
            <Link
              href="?nueva=1"
              scroll={false}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Agendar cita
            </Link>
          ) : undefined
        }
      />

      <div className="mt-6">
        <AgendaCalendario
          citas={conAnticiposDemo(datos.citas, datos.now)}
          personas={datos.resources}
          timezone={tz}
          ahora={datos.now.toISOString()}
          fecha={fecha}
          rango={rangoDeCarga(fecha)}
          slug={slug}
          negocio={datos.tenant.name}
          linkReservas={tenantBookingPageUrl(slug)}
          puedeAgendar={puedeAgendar}
          cajaHref="/panel/caja"
          demo={{ servicios: datos.services }}
        />
      </div>
    </div>
  );
}
