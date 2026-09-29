import { Mail, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { buildRoster, customerTenure, type RosterBooking } from '@/lib/customers/roster';
import { dayKey, dayLabel, longDate } from '@/lib/dates/tenantTime';

// CLIENTES — the people behind the agenda.
//
// Derived from bookings, not read from the customers table. create_booking
// inserts a fresh customers row on every booking (db/010) and there is no
// unique key on the phone, so the table holds one row per appointment: a
// regular who has come in five times appears five times. lib/customers/roster
// groups them back into people. See the note at the top of that file for
// why this is done at read time instead of with a data migration.
//
// Deliberately not a CRM. No notes, no tags, no segments — the owner asked
// for none of that and it would be a second product. What a person running
// a salon actually wants off this screen is: who is coming, who hasn't been
// in for a while, and the phone number to call them.

// Enough to cover years of history for a small business without ever
// pulling an unbounded table into memory. A tenant past this ceiling has
// outgrown a single page and needs real pagination — which is a different
// piece of work, not something to fake with a silent truncation.
const BOOKING_LIMIT = 4000;

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

export default async function CustomersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, timezone')
    .eq('slug', slug)
    .single();

  const now = new Date();
  const tz = tenant?.timezone ?? null;

  const { data: raw } = await supabase
    .from('bookings')
    .select('id, starts_at, status, customers(name, phone, email), service_types(name)')
    .eq('tenant_id', tenant!.id)
    .order('starts_at', { ascending: false })
    .limit(BOOKING_LIMIT);

  const roster = buildRoster((raw ?? []) as unknown as RosterBooking[], now);

  const returning = roster.filter((r) => r.visits > 1).length;
  const lapsed = roster.filter((r) => customerTenure(r, now, tz) === 'inactivo').length;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={
          roster.length > 0
            ? `${roster.length} ${roster.length === 1 ? 'persona ha reservado' : 'personas han reservado'} contigo.`
            : 'Cada persona que reserve desde tu página va a aparecer aquí.'
        }
      />

      {roster.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink">Todavía nadie ha reservado</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
            Esta lista se arma sola con las citas. En cuanto alguien reserve, vas a ver aquí su
            teléfono, cuántas veces ha venido y cuándo fue la última.
          </p>
        </div>
      ) : (
        <>
          {/* Two numbers, not a wall of cards: how many come back, and how
              many have drifted. The second is the only one that suggests an
              action — those are the people worth a message. */}
          <div className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <p className="text-sm font-medium text-muted">Repiten</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ink">
                {returning}
                <span className="ml-2 text-base font-normal text-muted">
                  de {roster.length}
                </span>
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
                <li
                  key={c.key}
                  className={i > 0 ? 'border-t border-border' : ''}
                >
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

                      {/* Contact first, because calling someone is the
                          reason an owner opens this page. tel: dials on a
                          phone, which is where most of them are. */}
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
                            Viene{' '}
                            <span className="font-medium text-ink">
                              {dayLabel(dayKey(c.nextVisit, tz), now, tz)}
                            </span>
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

                    {/* Counts read as a sentence, not a table: three
                        aligned numeric columns on a phone would squeeze
                        the name to nothing, and two of the three are
                        usually zero. */}
                    <div className="flex shrink-0 items-baseline gap-4 text-sm tabular-nums">
                      {/* Hidden at zero: "0 visitas" beside a "Nuevo"
                          badge and a "Viene mañana" is the same fact a
                          third time. */}
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

          {(raw?.length ?? 0) >= BOOKING_LIMIT && (
            <p className="mt-4 text-sm text-muted">
              Mostrando los clientes de las últimas {BOOKING_LIMIT.toLocaleString('es-MX')} citas.
            </p>
          )}
        </>
      )}
    </div>
  );
}
