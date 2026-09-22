import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PageHeader, SectionHeading } from '@/components/tenant-dash/PageHeader';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { CopyLinkButton } from '@/components/tenant-dash/CopyLinkButton';
import { DEMO, demoBookings } from '@/components/demo/fixtures';
import { dayKey, longDate } from '@/lib/dates/tenantTime';

export const metadata: Metadata = {
  title: 'Panel del negocio · demo — bicho',
  robots: { index: false, follow: false },
};

// Never cached: the fixtures are generated relative to `new Date()`, so
// a cached render would slowly become a demo of last week.
export const dynamic = 'force-dynamic';

// Mirrors app/t/[slug]/dashboard/page.tsx — same components, same
// structure, same "what do I have today?" question — against fixture
// appointments instead of a Supabase query. The setup checklist that
// the real page shows when a business can't take bookings yet is
// absent here on purpose: this demo business is fully set up, and a
// warning about missing setup would be a lie about it.
export default function DemoOverviewPage() {
  const now = new Date();
  const tz = DEMO.timezone;
  const bookings = demoBookings(now);
  const todayKey = dayKey(now, tz);

  const today = bookings.filter((b) => dayKey(b.starts_at, tz) === todayKey);
  const upcoming = bookings.filter((b) => dayKey(b.starts_at, tz) > todayKey && b.status === 'confirmed');
  const todayActive = today.filter((b) => b.status !== 'cancelled');
  const nextToday = todayActive.find((b) => new Date(b.ends_at) > now && b.status === 'confirmed');

  return (
    <div>
      <PageHeader
        eyebrow={longDate(now, tz)}
        title={DEMO.name}
        action={<CopyLinkButton url="/plataforma/reservar" />}
      />

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Hoy</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-ink">
              {todayActive.length}
              <span className="ml-2 text-lg font-normal text-muted">
                {todayActive.length === 1 ? 'cita' : 'citas'}
              </span>
            </p>
          </div>
          {nextToday && (
            <p className="text-sm text-muted">
              Sigue:{' '}
              <span className="font-medium text-ink">
                {nextToday.service_types?.name} con {nextToday.customers?.name}
              </span>
            </p>
          )}
        </div>

        <div className="mt-5">
          <AgendaList
            bookings={today}
            timezone={tz}
            now={now}
            hideDayHeader
            emptyTitle="Nada agendado para hoy"
            emptyHint="Las citas que tus clientes reserven desde tu página van a aparecer aquí, en el orden del día."
          />
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading
          title="Próximos días"
          meta={upcoming.length || undefined}
          action={
            <Link
              href="/plataforma/panel/calendar"
              className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Ver agenda completa
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />
        <AgendaList
          bookings={upcoming}
          timezone={tz}
          now={now}
          emptyTitle="Semana libre por ahora"
          emptyHint="No hay citas en los próximos siete días."
        />
      </section>
    </div>
  );
}
