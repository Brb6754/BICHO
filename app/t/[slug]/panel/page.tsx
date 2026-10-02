import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarDays, Users, Wallet } from 'lucide-react';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { PageHeader, SectionHeading } from '@/components/tenant-dash/PageHeader';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { buildRoster } from '@/lib/customers/roster';
import { dayKey, longDate } from '@/lib/dates/tenantTime';

export const metadata: Metadata = {
  title: 'Panel del negocio · demo',
  robots: { index: false, follow: false },
};

// Las citas se generan relativas a `new Date()`, así que una página
// cacheada se volvería, poco a poco, la demo de la semana pasada.
export const dynamic = 'force-dynamic';

// EL PANEL DEL DUEÑO, ABIERTO.
//
// Vive en {slug}.bichomx.com/panel y no pide contraseña, que es justo
// lo que un panel real sí hace. Dos cosas lo vuelven seguro:
//
//  1. Solo existe para los ocho negocios de demostración (isDemoSlug).
//     Sobre cualquier otro slug devuelve 404 — un cliente real no
//     quiere que cualquiera vea cómo luce su agenda.
//  2. Las citas NO salen de la base. La tabla de citas guarda nombre y
//     teléfono de personas reales; aquí se inventan a partir del
//     catálogo público del negocio (sus servicios, sus recursos). El
//     panel enseña la agenda de ESE negocio sin que exista una sola
//     fila real detrás.
//
// Y es de solo lectura: ningún botón escribe. Un panel público con
// acciones sería una puerta abierta para cancelarle la agenda a alguien
// desde la calle.
export default async function PanelDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { tenant, citas, now } = datos;
  const tz = tenant.timezone;

  const hoyKey = dayKey(now, tz);
  const hoy = citas.filter((c) => dayKey(c.starts_at, tz) === hoyKey);
  const hoyActivas = hoy.filter((c) => c.status !== 'cancelled');
  const proximas = citas.filter((c) => dayKey(c.starts_at, tz) > hoyKey && c.status === 'confirmed');

  const clientes = buildRoster(
    citas.map((c) => ({
      id: c.id,
      starts_at: c.starts_at,
      status: c.status,
      customers: c.customers,
      service_types: c.service_types,
    })),
    now
  );

  const metricas = [
    { label: 'Citas hoy', valor: hoyActivas.length, Icon: CalendarDays },
    { label: 'Próximos días', valor: proximas.length, Icon: Wallet },
    { label: 'Clientes', valor: clientes.length, Icon: Users },
  ];

  return (
    <div>
      <PageHeader eyebrow={longDate(now, tz)} title={tenant.name} />

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {metricas.map(({ label, valor, Icon }) => (
          <div key={label} className="rounded-2xl bg-surface p-5 ring-1 ring-border">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {label}
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">{valor}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <SectionHeading title="Hoy" />
        <div className="mt-4">
          <AgendaList
            bookings={hoy}
            timezone={tz}
            now={now}
            hideDayHeader
            emptyTitle="Hoy no hay citas"
            emptyHint="Aparecerán aquí en cuanto alguien reserve."
          />
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading title="Próximos días" />
        <div className="mt-4">
          <AgendaList
            bookings={proximas.slice(0, 8)}
            timezone={tz}
            now={now}
            emptyTitle="Nada agendado todavía"
            emptyHint="Las próximas citas se listan aquí."
          />
        </div>
      </section>

      <p className="mt-12 text-[13px] leading-relaxed text-muted">
        En el panel real cada cita se puede mover, cancelar o marcar como atendida, y el dueño
        agenda a mano a quien llama por teléfono. Aquí todo es de solo lectura.
      </p>
    </div>
  );
}
