import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, CalendarDays, Users, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isDemoSlug } from '@/lib/domains';
import { PageHeader, SectionHeading } from '@/components/tenant-dash/PageHeader';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { demoAgendaDeNegocio } from '@/lib/demo/panelFixtures';
import { buildRoster } from '@/lib/customers/roster';
import { tenantColorCssVars, tenantDarkModeCssVars } from '@/lib/branding/colors';
import { dayKey, longDate } from '@/lib/dates/tenantTime';
import { PLATFORM_PRIMARY, PLATFORM_SECONDARY, PLATFORM_ACCENT } from '@/lib/branding/colors';

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
  if (!isDemoSlug(slug)) notFound();

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, timezone, primary_color, secondary_color, accent_color, logo_url, resource_label')
    .eq('slug', slug)
    .maybeSingle();
  if (!tenant) notFound();

  const [{ data: services }, { data: resources }] = await Promise.all([
    supabase
      .from('service_types')
      .select('id, name, duration_minutes, price_cents')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('name'),
    supabase.from('resources').select('id, name').eq('tenant_id', tenant.id).eq('active', true).order('name'),
  ]);

  const tz = tenant.timezone ?? 'America/Mexico_City';
  const now = new Date();
  const citas = demoAgendaDeNegocio(
    { slug, timezone: tz, services: services ?? [], resources: resources ?? [] },
    now
  );

  const hoyKey = dayKey(now, tz);
  const hoy = citas.filter((c) => dayKey(c.starts_at, tz) === hoyKey);
  const hoyActivas = hoy.filter((c) => c.status !== 'cancelled');
  const proximas = citas.filter((c) => dayKey(c.starts_at, tz) > hoyKey && c.status === 'confirmed');

  // La misma función que arma la vista de Clientes del panel real, sobre
  // las citas inventadas: el conteo de clientes no se inventa aparte.
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

  const primary = tenant.primary_color ?? PLATFORM_PRIMARY;
  const secondary = tenant.secondary_color ?? PLATFORM_SECONDARY;
  const accent = tenant.accent_color ?? PLATFORM_ACCENT;

  const metricas = [
    { label: 'Citas hoy', valor: hoyActivas.length, Icon: CalendarDays },
    { label: 'Próximos días', valor: proximas.length, Icon: Wallet },
    { label: 'Clientes', valor: clientes.length, Icon: Users },
  ];

  return (
    <div
      className="tenant-shell tenant-dash min-h-screen bg-paper"
      style={
        {
          ...tenantColorCssVars(primary, secondary, accent),
          ...tenantDarkModeCssVars(primary, secondary, accent),
        } as React.CSSProperties
      }
    >
      {/* La franja que dice qué es esto. Sin ella, alguien podría creer
          que está viendo la agenda real de un negocio — y son citas
          inventadas. */}
      <div className="border-b border-border bg-surface px-5 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          <span className="font-semibold text-ink">Demo del panel</span>
          <span className="text-muted">
            Así ve su agenda el dueño de {tenant.name}. Datos de ejemplo, solo lectura.
          </span>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 font-medium text-ink underline-offset-4 hover:underline"
          >
            Ver su página de reservas
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
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
            {hoy.length === 0 ? (
              <p className="text-sm text-muted">Hoy no hay citas agendadas.</p>
            ) : (
              <AgendaList
                bookings={hoy}
                timezone={tz}
                now={now}
                hideDayHeader
                emptyTitle="Hoy no hay citas"
                emptyHint="Aparecerán aquí en cuanto alguien reserve."
              />
            )}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeading title="Próximos días" />
          <div className="mt-4">
            {proximas.length === 0 ? (
              <p className="text-sm text-muted">Nada agendado todavía.</p>
            ) : (
              <AgendaList
                bookings={proximas.slice(0, 8)}
                timezone={tz}
                now={now}
                emptyTitle="Nada agendado todavía"
                emptyHint="Las próximas citas se listan aquí."
              />
            )}
          </div>
        </section>

        <p className="mt-12 text-[13px] leading-relaxed text-muted">
          En el panel real, cada cita se puede mover, cancelar o marcar como atendida, y el dueño
          agenda a mano a quien llama. Aquí todo es de solo lectura.
        </p>
      </div>
    </div>
  );
}
