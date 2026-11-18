import Link from 'next/link';
import { Building2, Check, MapPin, Phone, Plus, Settings2, Video, Users, FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { appointmentWhen, formatTime, dayKey, dayLabel } from '@/lib/dates/tenantTime';
import { buildEmbudo, type MeetingEntry } from '@/lib/meetings/pipeline';
import { RESULTADOS, modalidadLabel } from '@/lib/meetings/kinds';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { Avatar, Chip } from '@/components/tenant-dash/dinero/Visual';
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
// El orden es una opinión: primero lo que ya pasó y nadie anotó. Un
// embudo con huecos no es un embudo, y la única persona que puede
// taparlos es la que está viendo esta pantalla.

const ICONO_MODALIDAD = { video: Video, sitio: MapPin, oficina: Users } as const;

const TONO_CHIP = { info: 'info', primary: 'primary', success: 'success', muted: 'muted' } as const;

const BOTON_PRIMARIO =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2';

// Qué hacer después de cada resultado: sin esto el embudo son cuatro
// etiquetas sueltas.
const SIGUIENTE: Record<string, string> = {
  interesado: 'Lo que sigue: mándale una cotización.',
  cotizado: 'Lo que sigue: escríbele en 2 o 3 días.',
  ganado: '¡Listo, ya es cliente!',
  perdido: 'No pasa nada: queda en tu historial.',
};

function AyudaResultados() {
  return (
    <HelpTip title="¿Qué marco en cada reunión?">
      <ul className="space-y-1.5">
        {RESULTADOS.map((r) => (
          <li key={r.value}>
            <span className="font-semibold text-ink">{r.label}:</span> {r.ayuda} {SIGUIENTE[r.value]}
          </li>
        ))}
      </ul>
    </HelpTip>
  );
}

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

  // La acción principal es agendar; si falta algo para poder hacerlo, la
  // acción principal es eso que falta.
  const accion =
    !sinTipos && !sinAsesores ? (
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
    ) : sinTipos ? (
      <Link href="/dashboard/reuniones/tipos" className={BOTON_PRIMARIO}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Crear un tipo de reunión
      </Link>
    ) : (
      <Link href="/dashboard/resources" className={BOTON_PRIMARIO}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Agregar quién atiende
      </Link>
    );

  return (
    <div>
      <PageHeader
        title="Reuniones"
        description="Con quién vas a hablar y en qué quedaron."
        action={accion}
        actions={
          !sinTipos && (
            <Link
              href="/dashboard/reuniones/tipos"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-sm:flex-1"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Tipos de reunión
            </Link>
          )
        }
      />

      {(sinTipos || sinAsesores) && (
        <section
          className="mt-6 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-6"
          aria-labelledby="preparar-titulo"
        >
          <h2 id="preparar-titulo" className="text-[17px] font-semibold tracking-tight text-ink">
            Antes de tu primera reunión
          </h2>
          <ol className="mt-4 flex flex-col gap-3">
            <PasoPreparar hecho={!sinTipos} n={1} titulo="Crea un tipo de reunión" href="/dashboard/reuniones/tipos">
              Por ejemplo «Videollamada de 30 min». Es lo que tu prospecto elige al agendar.
            </PasoPreparar>
            <PasoPreparar
              hecho={!sinAsesores}
              n={2}
              titulo="Agrega quién atiende y su horario"
              href="/dashboard/resources"
            >
              Sin alguien con horario, no hay horas libres que ofrecer.
            </PasoPreparar>
          </ol>
        </section>
      )}

      {entries.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-surface ring-1 ring-border">
          <EmptyState
            icon={Users}
            title="Todavía no tienes reuniones"
            description="Cuando alguien agende desde tu página, o cuando anotes una a mano, aparece aquí."
            why="Después de cada reunión marcas en qué quedó, y ves de un vistazo a quién darle seguimiento."
          />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {/* Primero el trabajo. Una reunión que ya pasó y nadie anotó es
              el único renglón de esta pantalla sobre el que hay algo que
              hacer ahora mismo. */}
          {embudo.sinCapturar.length > 0 && (
            <Grupo
              titulo="¿En qué quedaron?"
              detalle={`${embudo.sinCapturar.length} ${
                embudo.sinCapturar.length === 1 ? 'ya pasó y falta anotarla' : 'ya pasaron y falta anotarlas'
              }`}
              ayuda={<AyudaResultados />}
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

function PasoPreparar({
  hecho,
  n,
  titulo,
  href,
  children,
}: {
  hecho: boolean;
  n: number;
  titulo: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
          hecho ? 'bg-success text-white' : 'bg-ink/[0.07] text-ink'
        }`}
      >
        {hecho ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
      </span>
      <div>
        {hecho ? (
          <p className="text-[15px] font-medium text-muted line-through decoration-ink/30">{titulo}</p>
        ) : (
          <>
            <Link
              href={href}
              className="inline-flex min-h-7 items-center text-[15px] font-medium text-ink underline underline-offset-4"
            >
              {titulo}
            </Link>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">{children}</p>
          </>
        )}
      </div>
    </li>
  );
}

function Grupo({
  titulo,
  detalle,
  ayuda,
  destacado = false,
  children,
}: {
  titulo: string;
  detalle?: string;
  ayuda?: React.ReactNode;
  destacado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={titulo}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 px-1">
        <h2
          className={
            'flex items-center text-[19px] font-semibold tracking-tight ' + (destacado ? 'text-ink' : 'text-ink/80')
          }
        >
          {titulo}
          {ayuda}
        </h2>
        {detalle && <span className="text-[15px] text-muted">{detalle}</span>}
      </div>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{children}</ul>
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
    <li
      className={`animate-fade-in flex flex-col rounded-3xl bg-surface p-5 ${capturar && !m.outcome ? 'ring-2 ring-warning/40' : 'ring-1 ring-border'}`}
      style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold ${capturar ? 'bg-warning-soft text-warning' : 'bg-info-soft text-info'}`}
        >
          {cuando}
        </span>
        {m.status === 'no_show' ? <Chip tono="warning">No llegó</Chip> : <span className="text-[13px] font-medium text-muted">{m.tipo}</span>}
      </div>
      <div className="mt-3 flex items-start gap-3">
        <Avatar nombre={m.company ?? m.contactName} />
        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* El nombre es el enlace, no la fila: adentro va un tel:,
                  y un ancla dentro de otra es el error de hidratación
                  que este proyecto ya pagó. */}
              {m.contactId ? (
                <Link
                  href={`/dashboard/customers/${m.contactId}`}
                  className="rounded-sm text-[17px] font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {m.contactName}
                </Link>
              ) : (
                <span className="text-[17px] font-semibold text-ink">{m.contactName}</span>
              )}
              {m.company && (
                <span className="inline-flex items-center gap-1 text-[15px] text-muted">
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {m.company}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 text-[15px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {modalidadLabel(m.modality)}
              </span>
              {m.phone && (
                <a
                  href={`tel:${m.phone}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-sm underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {m.phone}
                </a>
              )}
              {m.quoteId && (
                <Link
                  href="/dashboard/cotizaciones"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-sm underline-offset-4 hover:text-ink hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Tiene cotización
                </Link>
              )}
            </div>

            {/* La dirección solo existe en la visita a sitio, y ahí es el
                dato sin el cual no se puede salir. */}
            {m.address && (
              <p className="text-[15px] text-muted">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-sm underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {m.address}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {(cancelable || capturar) && (
        <div className="mt-4 border-t border-border pt-4">
          {cancelable && (
            <ConfirmForm
              action={cancelMeeting.bind(null, m.id, slug)}
              confirmTitle="Cancelar reunión"
              confirmMessage={`¿Cancelar la reunión con ${m.contactName}? Ese horario queda libre otra vez.`}
              confirmLabel="Sí, cancelarla"
              dismissLabel="No, conservarla"
              triggerVariant="outline"
              triggerClassName="min-h-11 px-4 text-[15px]"
            >
              Cancelar reunión
            </ConfirmForm>
          )}
          {capturar && (
            <>
              <p className="mb-2.5 text-[15px] font-semibold text-ink">¿En qué quedaron?</p>
              <OutcomeButtons slug={slug} bookingId={m.id} outcome={m.outcome} />
            </>
          )}
        </div>
      )}
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
    <section aria-label="Cómo van tus prospectos">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 px-1">
        <h2 className="flex items-center text-[17px] font-semibold tracking-tight text-ink/80">
          Cómo van tus prospectos
          <AyudaResultados />
        </h2>
        {/* Null y no 0%: "no cierras nada" y "todavía no se sabe" son
            cosas distintas, y la primera es una acusación. */}
        {embudo.tasaCierre !== null && (
          <span className="text-[13px] text-muted">
            Cierras {Math.round(embudo.tasaCierre * 100)}% de los que llegan a decidir
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RESULTADOS.map((r) => {
          const lista = embudo.porResultado[r.value];
          return (
            <div key={r.value} className="rounded-3xl bg-surface p-5 ring-1 ring-border">
              <div className="flex items-center justify-between gap-2">
                <Chip tono={TONO_CHIP[r.tono]}>{r.label}</Chip>
                <p className="text-[2rem] font-bold leading-none tabular-nums text-ink">{lista.length}</p>
              </div>
              <p className="mt-2 text-[15px] text-muted">{SIGUIENTE[r.value]}</p>

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
                    <span className="block text-[13px] text-muted">
                      {dayLabel(dayKey(m.startsAt, timezone), now, timezone)}
                    </span>
                  </li>
                ))}
                {lista.length > 4 && <li className="text-[13px] text-muted">y {lista.length - 4} más</li>}
                {lista.length === 0 && <li className="text-[13px] text-muted">Nadie todavía.</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
