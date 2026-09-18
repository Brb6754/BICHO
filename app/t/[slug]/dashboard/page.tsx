import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { CopyLinkButton } from '@/components/tenant-dash/CopyLinkButton';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, SectionHeading } from '@/components/tenant-dash/PageHeader';
import { AgendaList, type AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { dayKey, longDate } from '@/lib/dates/tenantTime';
import { tenantBookingPageUrl } from '@/lib/urls';

// RESUMEN — rebuilt around the one question an owner has when they open
// this page: "what do I have today?"
//
// It used to open with three identical count cards — upcoming bookings,
// active resources, services in the catalogue. Two of those three are
// setup facts that don't change from one day to the next, so the most
// prominent thing on the home screen was information nobody needs forty
// times a day. Today's agenda is now the page.
//
// The counts didn't disappear, they changed job: if a business has no
// active service, no resource or no schedule, its public page literally
// cannot produce a bookable slot. That's not a statistic, it's a broken
// setup — so it's shown as a checklist of what's missing, and only when
// something IS missing.
export default async function DashboardOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id, name, timezone').eq('slug', slug).single();

  const now = new Date();
  // Window wide enough to contain all of "today" in any timezone
  // (starting 24h back) and the week ahead. Which bookings belong to
  // today is decided afterwards by the tenant's LOCAL calendar day —
  // doing that arithmetic in the query would mean hand-computing UTC
  // offsets, which is exactly how the old page got days wrong.
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: raw }, { count: serviceCount }, { count: resourceCount }, { count: scheduleCount }] =
    await Promise.all([
      supabase
        .from('bookings')
        .select('id, starts_at, ends_at, status, resources(name), service_types(name), customers(name, phone)')
        .eq('tenant_id', tenant!.id)
        .gte('starts_at', from)
        .lte('starts_at', to)
        .order('starts_at'),
      supabase
        .from('service_types')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant!.id)
        .eq('active', true),
      supabase
        .from('resources')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant!.id)
        .eq('active', true),
      supabase.from('resource_schedules').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant!.id),
    ]);

  const bookings = (raw ?? []) as unknown as AgendaBooking[];
  const tz = tenant?.timezone ?? null;
  const todayKey = dayKey(now, tz);

  const today = bookings.filter((b) => dayKey(b.starts_at, tz) === todayKey);
  const upcoming = bookings.filter((b) => dayKey(b.starts_at, tz) > todayKey && b.status === 'confirmed');
  const todayActive = today.filter((b) => b.status !== 'cancelled');
  const nextToday = todayActive.find((b) => new Date(b.ends_at) > now && b.status === 'confirmed');

  const setup = [
    { done: (serviceCount ?? 0) > 0, label: 'Agrega al menos un servicio', href: '/dashboard/services' },
    { done: (resourceCount ?? 0) > 0, label: 'Agrega quién o qué atiende', href: '/dashboard/resources' },
    { done: (scheduleCount ?? 0) > 0, label: 'Define tu horario de atención', href: '/dashboard/schedule' },
  ];
  const setupComplete = setup.every((s) => s.done);

  return (
    <div>
      <PageHeader
        eyebrow={longDate(now, tz)}
        title={tenant?.name ?? 'Tu negocio'}
        action={<CopyLinkButton url={tenantBookingPageUrl(slug)} />}
      />

      {!setupComplete && (
        // Only shown when the page can't take bookings yet. It sits above
        // everything because nothing below it can happen until it's done.
        <section
          className="mt-8 rounded-2xl border border-warning/30 bg-warning-soft px-5 py-5 sm:px-6"
          aria-label="Configuración pendiente"
        >
          <p className="font-semibold text-ink">Tu página todavía no puede recibir citas</p>
          <p className="mt-1 text-sm text-muted">
            Faltan {setup.filter((s) => !s.done).length} de 3 pasos. Sin ellos no hay horarios que ofrecer.
          </p>
          <ol className="mt-4 flex flex-col gap-2">
            {setup.map((s) => (
              <li key={s.label}>
                {s.done ? (
                  <span className="flex items-center gap-2.5 text-sm text-muted line-through">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {s.label}
                  </span>
                ) : (
                  <Link
                    href={s.href}
                    className="group flex items-center gap-2.5 rounded-sm text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span className="h-5 w-5 rounded-full border-2 border-ink/25" />
                    <span className="underline-offset-4 group-hover:underline">{s.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Today. The headline number is the one an owner actually wants,
          and the "next" line answers the follow-up question before they
          have to scan for it. */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Hoy</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-ink">
              {todayActive.length}
              <span className="ml-2 text-lg font-normal text-muted">{todayActive.length === 1 ? 'cita' : 'citas'}</span>
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
              href="/dashboard/calendar"
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
