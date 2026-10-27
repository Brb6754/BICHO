import Link from 'next/link';
import { Building2, MapPin, Phone, Settings2, Video, Users, FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { appointmentWhen, formatTime, dayKey, dayLabel } from '@/lib/dates/tenantTime';
import { buildEmbudo, type MeetingEntry } from '@/lib/meetings/pipeline';
import { RESULTADOS, modalidadLabel } from '@/lib/meetings/kinds';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { OutcomeButtons } from '@/app/t/[slug]/dashboard/reuniones/OutcomeButtons';
import { NuevaReunion } from '@/app/t/[slug]/dashboard/reuniones/NuevaReunion';
import { cancelMeeting } from '@/app/t/[slug]/dashboard/reuniones/actions';

// La vista del pipeline, separada de la página que la alimenta.
//
// Está aparte por el mismo motivo que `DemoRequestList`: el panel vive
// detrás de un login que Claude no puede pasar, y una pantalla que
// nadie puede ver antes de entregarla se entrega a ciegas. Así se
// renderiza contra datos reales desde una ruta de prueba sin tocar
// `requireTenantStaff`.
//
// El orden es una opinión: primero lo que ya pasó y nadie capturó. Un
// embudo con huecos no es un embudo, y la única persona que puede
// taparlos es la que está viendo esta pantalla.

const ICONO_MODALIDAD = { video: Video, sitio: MapPin, oficina: Users } as const;

export type TipoReunion = {
  id: string;
  name: string;
  duration_minutes: number;
  modality: string | null;
};

export function ReunionesBoard({
  slug,
  timezone,
  entries,
  tipos,
  asesores,
  now,
}: {
  slug: string;
  timezone: string | null;
  entries: MeetingEntry[];
  tipos: TipoReunion[];
  asesores: { id: string; name: string }[];
  now: Date;
}) {
  const embudo = buildEmbudo(entries, now);

  const sinTipos = tipos.length === 0;
  const sinAsesores = asesores.length === 0;

  return (
    <div>
      <PageHeader
        title="Reuniones"
        description="Con quién vas a hablar, con quién ya hablaste y en qué quedaron."
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {!sinTipos && !sinAsesores && (
          <NuevaReunion
            slug={slug}
            timezone={timezone}
            tipos={tipos.map((t) => ({
              id: t.id,
              name: t.name,
              duration_minutes: t.duration_minutes,
              modality: t.modality ?? null,
            }))}
            asesores={asesores}
          />
        )}
        <Link
          href="/dashboard/reuniones/tipos"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          Tipos de reunión
        </Link>
      </div>

      {(sinTipos || sinAsesores) && (
        <div className="mt-6 rounded-2xl border border-dashed border-border px-5 py-5">
          <p className="text-sm font-medium text-ink">Falta configurar algo</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {sinTipos && (
              <li>
                No tienes tipos de reunión.{' '}
                <Link href="/dashboard/reuniones/tipos" className="text-primary underline-offset-4 hover:underline">
                  Crea el primero
                </Link>{' '}
                — sin eso, nadie puede agendar contigo.
              </li>
            )}
            {sinAsesores && (
              <li>
                No tienes a nadie que atienda.{' '}
                <Link href="/dashboard/resources" className="text-primary underline-offset-4 hover:underline">
                  Agrega un asesor
                </Link>{' '}
                y define su horario.
              </li>
            )}
          </ul>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="Todavía no hay reuniones"
            description="Cuando alguien agende desde tu página, o cuando registres una a mano, va a aparecer aquí con su historial y en qué quedaron."
          />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {/* Primero el trabajo. Una reunión que ya pasó y nadie capturó
              es el único renglón de esta pantalla sobre el que hay algo
              que hacer ahora mismo. */}
          {embudo.sinCapturar.length > 0 && (
            <Grupo
              titulo="¿En qué quedaron?"
              detalle={`${embudo.sinCapturar.length} ${
                embudo.sinCapturar.length === 1 ? 'reunión ya pasó' : 'reuniones ya pasaron'
              } y nadie la capturó`}
              destacado
            >
              {embudo.sinCapturar.map((m, i) => (
                <Fila key={m.id} m={m} i={i} slug={slug} timezone={timezone} now={now} capturar />
              ))}
            </Grupo>
          )}

          {embudo.proximas.length > 0 && (
            <Grupo titulo="Próximas" detalle={`${embudo.proximas.length}`}>
              {embudo.proximas.map((m, i) => (
                <Fila key={m.id} m={m} i={i} slug={slug} timezone={timezone} now={now} cancelable />
              ))}
            </Grupo>
          )}

          <Embudo embudo={embudo} timezone={timezone} now={now} />
        </div>
      )}
    </div>
  );
}

function Grupo({
  titulo,
  detalle,
  destacado = false,
  children,
}: {
  titulo: string;
  detalle?: string;
  destacado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={titulo}>
      <div className="mb-2 flex items-baseline justify-between gap-4 px-4 sm:px-5">
        <h2 className={'text-sm font-semibold ' + (destacado ? 'text-ink' : 'text-muted')}>
          {titulo}
        </h2>
        {detalle && <span className="text-xs text-muted">{detalle}</span>}
      </div>
      <ul className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</ul>
    </section>
  );
}

function Fila({
  m,
  i,
  slug,
  timezone,
  now,
  capturar = false,
  cancelable = false,
}: {
  m: MeetingEntry;
  i: number;
  slug: string;
  timezone: string | null;
  now: Date;
  capturar?: boolean;
  cancelable?: boolean;
}) {
  const Icono = ICONO_MODALIDAD[(m.modality ?? 'oficina') as keyof typeof ICONO_MODALIDAD] ?? Users;
  const cuando = capturar
    ? appointmentWhen(m.startsAt, timezone)
    : `${dayLabel(dayKey(m.startsAt, timezone), now, timezone)}, ${formatTime(m.startsAt, timezone)}`;

  return (
    <li className={i > 0 ? 'border-t border-border' : ''}>
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* El nombre es el enlace, no la fila: adentro va un tel:,
                  y un ancla dentro de otra es el error de hidratación
                  que este proyecto ya pagó. */}
              {m.contactId ? (
                <Link
                  href={`/dashboard/customers/${m.contactId}`}
                  className="rounded-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {m.contactName}
                </Link>
              ) : (
                <span className="font-medium text-ink">{m.contactName}</span>
              )}
              {m.company && (
                <span className="inline-flex items-center gap-1 text-sm text-muted">
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {m.company}
                </span>
              )}
              {m.status === 'no_show' && (
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                  No llegó
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-ink">{cuando}</span> · {m.tipo}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {modalidadLabel(m.modality)}
              </span>
              {m.phone && (
                <a
                  href={`tel:${m.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-sm underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {m.phone}
                </a>
              )}
              {m.quoteId && (
                <Link
                  href="/dashboard/cotizaciones"
                  className="inline-flex items-center gap-1.5 rounded-sm underline-offset-4 hover:text-ink hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Tiene cotización
                </Link>
              )}
            </div>

            {/* La dirección solo existe en la visita a sitio, y ahí es el
                dato sin el cual el asesor no puede salir. */}
            {m.address && (
              <p className="mt-1.5 text-sm text-muted">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:text-ink hover:underline"
                >
                  {m.address}
                </a>
              </p>
            )}
          </div>

          {cancelable && (
            <ConfirmForm
              action={cancelMeeting.bind(null, m.id, slug)}
              confirmTitle="Cancelar reunión"
              confirmMessage={`¿Cancelar la reunión con ${m.contactName}? El horario del asesor queda libre otra vez.`}
              confirmLabel="Sí, cancelarla"
              dismissLabel="No, conservarla"
              triggerClassName="px-3 py-1.5 text-xs"
            >
              Cancelar
            </ConfirmForm>
          )}
        </div>

        {capturar && (
          <div className="mt-3">
            <OutcomeButtons slug={slug} bookingId={m.id} outcome={m.outcome} />
          </div>
        )}
      </div>
    </li>
  );
}

function Embudo({
  embudo,
  timezone,
  now,
}: {
  embudo: ReturnType<typeof buildEmbudo>;
  timezone: string | null;
  now: Date;
}) {
  const total = RESULTADOS.reduce((n, r) => n + embudo.porResultado[r.value].length, 0);
  if (total === 0) return null;

  return (
    <section aria-label="Embudo">
      <div className="mb-2 flex items-baseline justify-between gap-4 px-4 sm:px-5">
        <h2 className="text-sm font-semibold text-muted">Ya capturadas</h2>
        {/* Null y no 0%: "no cierras nada" y "todavía no se sabe" son
            cosas distintas, y la primera es una acusación. */}
        {embudo.tasaCierre !== null && (
          <span className="text-xs text-muted">
            Cierras {Math.round(embudo.tasaCierre * 100)}% de lo que llega a decisión
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RESULTADOS.map((r) => {
          const lista = embudo.porResultado[r.value];
          return (
            <div key={r.value} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">{r.label}</p>
                <p className="text-lg font-semibold tabular-nums text-ink">{lista.length}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted">{r.ayuda}</p>

              <ul className="mt-3 space-y-2">
                {lista.slice(0, 4).map((m) => (
                  <li key={m.id} className="text-sm">
                    {m.contactId ? (
                      <Link
                        href={`/dashboard/customers/${m.contactId}`}
                        className="truncate text-ink underline-offset-4 hover:underline"
                      >
                        {m.company ?? m.contactName}
                      </Link>
                    ) : (
                      <span className="text-ink">{m.company ?? m.contactName}</span>
                    )}
                    <span className="block text-xs text-muted">
                      {dayLabel(dayKey(m.startsAt, timezone), now, timezone)}
                    </span>
                  </li>
                ))}
                {lista.length > 4 && (
                  <li className="text-xs text-muted">y {lista.length - 4} más</li>
                )}
                {lista.length === 0 && <li className="text-xs text-muted">Nadie todavía.</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
