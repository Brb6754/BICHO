import type { Metadata } from 'next';
import { Mail, Phone } from 'lucide-react';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { DemoNote } from '@/components/demo/DemoNote';
import { DEMO, demoBookings } from '@/components/demo/fixtures';
import { buildRoster, customerTenure } from '@/lib/customers/roster';
import { dayKey, dayLabel, longDate } from '@/lib/dates/tenantTime';

export const metadata: Metadata = {
  title: 'Clientes · demo — bicho',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Mirrors app/t/[slug]/dashboard/customers/page.tsx against the fixture
// appointments. Same buildRoster, so the grouping a visitor sees here is
// literally the grouping the real product does — including collapsing
// "(618) 309-6620" and "618 309 6620" into one person.
const TENURE_STYLES: Record<string, string> = {
  nuevo: 'bg-success-soft text-success',
  recurrente: 'bg-ink/[0.06] text-muted',
  inactivo: 'bg-warning-soft text-warning',
};

const TENURE_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  recurrente: 'Recurrente',
  inactivo: 'Sin venir',
};

export default function DemoCustomersPage() {
  const now = new Date();
  const tz = DEMO.timezone;
  const roster = buildRoster(demoBookings(now), now);

  const returning = roster.filter((r) => r.visits > 1).length;
  const lapsed = roster.filter((r) => customerTenure(r, now, tz) === 'inactivo').length;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${roster.length} personas han reservado contigo.`}
      />

      <DemoNote>
        Esta lista no se captura: se arma sola con las citas. El teléfono marca
        con un toque desde el celular, y «Sin venir» marca a quien lleva más de
        tres meses sin pasar y no tiene nada agendado.
      </DemoNote>

      <div className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
        <div>
          <p className="text-sm font-medium text-muted">Repiten</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ink">
            {returning}
            <span className="ml-2 text-base font-normal text-muted">de {roster.length}</span>
          </p>
        </div>
        {lapsed > 0 && (
          <div>
            <p className="text-sm font-medium text-muted">Sin venir en 3 meses</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-warning">
              {lapsed}
            </p>
          </div>
        )}
      </div>

      <ul className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
        {roster.map((c, i) => {
          const tenure = customerTenure(c, now, tz);
          return (
            <li key={c.key} className={i > 0 ? 'border-t border-border' : ''}>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <p className="font-medium text-ink">{c.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TENURE_STYLES[tenure]}`}
                    >
                      {TENURE_LABELS[tenure]}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {c.phone && (
                      <a
                        href={`tel:${c.phone.replace(/\s/g, '')}`}
                        className="inline-flex items-center gap-1.5 rounded-sm text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex min-w-0 items-center gap-1.5 rounded-sm text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{c.email}</span>
                      </a>
                    )}
                  </div>

                  <p className="mt-1.5 text-sm text-muted">
                    {c.nextVisit ? (
                      <>
                        Viene <span className="font-medium text-ink">{dayLabel(dayKey(c.nextVisit, tz), now, tz)}</span>
                      </>
                    ) : c.lastVisit ? (
                      <>Última vez: {longDate(c.lastVisit, tz)}</>
                    ) : (
                      'Sin visitas todavía'
                    )}
                    {c.favouriteService && (
                      <span className="text-muted/70"> &middot; {c.favouriteService}</span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-baseline gap-4 text-sm tabular-nums">
                  {/* Hidden at zero: "0 visitas" beside a "Nuevo" badge
                      and a "Viene mañana" is the same fact a third time. */}
                  {c.visits > 0 && (
                    <span className="text-muted">
                      <span className="font-semibold text-ink">{c.visits}</span>{' '}
                      {c.visits === 1 ? 'visita' : 'visitas'}
                    </span>
                  )}
                  {c.noShows > 0 && (
                    <span className="text-warning" title="Citas a las que no vino">
                      {c.noShows} no vino
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
