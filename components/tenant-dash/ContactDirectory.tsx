import Link from 'next/link';
import { ChevronDown, Mail, Phone, StickyNote } from 'lucide-react';
import { dayKey, dayLabel, longDate } from '@/lib/dates/tenantTime';
import type { DirectoryEntry } from '@/lib/contacts/directory';
import { categorize, pendientes, type Categoria } from '@/lib/contacts/categories';

// El directorio de clientes, en secciones por el estado de la relación.
//
// Habla el idioma de la AGENDA, que es la pantalla más trabajada del
// panel, y de ahí salen las tres decisiones visuales:
//
//   · UNA SUPERFICIE POR SECCIÓN, no una tarjeta por persona.
//   · UNA COLUMNA IZQUIERDA ALINEADA con lo que uno escanea. En la
//     agenda es la hora; aquí son las visitas, que es como un dueño
//     reconoce a su clientela de un vistazo.
//   · LO QUE PIDE ACCIÓN CONSERVA SU COLOR, todo lo demás se calma.
//
// Antes eran dos grupos, y el segundo era un cajón donde caían por
// igual alguien que vino ayer por primera vez, alguien que vuelve cada
// mes desde hace dos años y alguien que tiene cita el jueves. El
// reparto vive en `lib/contacts/categories.ts` — aquí solo se dibuja.
//
// Las secciones son `<details>` nativos: se pliegan sin una línea de
// JavaScript, siguen siendo buscables con Ctrl+F del navegador, y
// abren por defecto, así que nada queda escondido sin querer.

export function ContactDirectory({
  entries,
  now,
  timezone,
}: {
  entries: DirectoryEntry[];
  now: Date;
  timezone: string | null;
}) {
  if (entries.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium text-ink">Todavía no hay clientes</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
          Cada persona que reserve, cotice o te pida factura va a aparecer aquí, con su historial
          completo y un espacio para tus notas.
        </p>
      </div>
    );
  }

  const categorias = categorize(entries);
  const porAtender = pendientes(categorias);

  return (
    <div className="mt-6 flex flex-col gap-4">
      {/* Una línea arriba que dice si hay trabajo o no. Sin ella hay que
          contar secciones para saberlo, que es justo lo que esta
          pantalla debería ahorrarle a alguien. */}
      <p className="px-1 text-sm text-muted">
        {porAtender > 0 ? (
          <>
            <span className="font-semibold text-ink">
              {porAtender} {porAtender === 1 ? 'persona necesita' : 'personas necesitan'}
            </span>{' '}
            algo de ti · {entries.length} en total
          </>
        ) : (
          <>Nadie está esperando nada tuyo · {entries.length} clientes en total</>
        )}
      </p>

      {categorias.map((c) => (
        <Seccion key={c.key} categoria={c} now={now} timezone={timezone} />
      ))}
    </div>
  );
}

function Seccion({
  categoria,
  now,
  timezone,
}: {
  categoria: Categoria;
  now: Date;
  timezone: string | null;
}) {
  const { titulo, ayuda, accionable, entries } = categoria;

  return (
    <details open className="group">
      <summary className="flex cursor-pointer list-none items-baseline gap-3 rounded-lg px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="h-4 w-4 shrink-0 self-center text-muted transition-transform duration-150 group-open:rotate-0 -rotate-90"
          aria-hidden="true"
        />
        <h2 className={'text-sm font-semibold ' + (accionable ? 'text-ink' : 'text-muted')}>
          {titulo}
        </h2>
        <span className="text-xs tabular-nums text-muted">{entries.length}</span>
      </summary>

      {/* El texto de ayuda dice qué hacer con esta gente. Una sección sin
          siguiente paso es un reporte, y nadie actúa sobre un reporte. */}
      <p className="mb-2 px-1 pl-8 text-xs leading-relaxed text-muted">{ayuda}</p>

      <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
        {entries.map((c, i) => (
          <Fila
            key={c.id}
            c={c}
            primera={i === 0}
            accionable={accionable}
            now={now}
            timezone={timezone}
          />
        ))}
      </ul>
    </details>
  );
}

// Dentro de una sección, el motivo ya lo dice el título. Solo vale la
// pena un detalle cuando hay MÁS de uno: "2 cotizaciones sin contestar"
// es información nueva; repetir "cotización sin contestar" debajo de
// "Te deben una respuesta" es ruido.
function detalle(e: DirectoryEntry): string | null {
  if (e.openQuotes > 1) return `${e.openQuotes} cotizaciones`;
  if (e.openQuotes === 0 && e.noShows > 1) return `${e.noShows} faltas`;
  return null;
}

function Fila({
  c,
  primera,
  accionable,
  now,
  timezone,
}: {
  c: DirectoryEntry;
  primera: boolean;
  accionable: boolean;
  now: Date;
  timezone: string | null;
}) {
  const extra = detalle(c);

  return (
    <li className={primera ? '' : 'border-t border-border'}>
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-x-4 px-4 py-3.5 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:px-5">
        {/* La columna de escaneo. Mismo lugar y misma métrica tipográfica
            que la hora en la agenda: cifras tabulares arriba, la unidad
            en chico debajo. */}
        <div>
          <p className="text-lg font-semibold tabular-nums leading-none text-ink">{c.visits}</p>
          <p className="mt-1 text-[11px] leading-none text-muted">
            {c.visits === 1 ? 'visita' : 'visitas'}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* El nombre es el enlace, no la fila: adentro van un tel: y
                un mailto:, y un ancla dentro de otra es el error de
                hidratación que este proyecto ya pagó. */}
            <Link
              href={`/dashboard/customers/${c.id}`}
              className="truncate rounded-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {c.name}
            </Link>
            {c.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {t}
              </span>
            ))}
            {c.hasNotes && (
              <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Tiene notas" />
            )}
          </div>

          <p className="mt-1 text-sm text-muted">
            {c.nextVisit ? (
              <>
                Viene{' '}
                <span className="font-medium text-ink">
                  {dayLabel(dayKey(c.nextVisit, timezone), now, timezone)}
                </span>
              </>
            ) : c.lastVisit ? (
              <>Última vez: {longDate(c.lastVisit, timezone)}</>
            ) : (
              'Sin visitas todavía'
            )}
          </p>

          {/* Teléfono y correo: en el teléfono marcan, que es para lo que
              un dueño abre esta pantalla. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
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

          {/* En teléfono el detalle cae aquí debajo; desde sm vive en su
              propia columna a la derecha. */}
          {extra && (
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium sm:hidden ${
                accionable ? 'bg-primary/10 text-primary' : 'bg-ink/[0.06] text-muted'
              }`}
            >
              {extra}
            </span>
          )}
        </div>

        {extra && (
          <span
            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
              accionable ? 'bg-primary/10 text-primary' : 'bg-ink/[0.06] text-muted'
            }`}
          >
            {extra}
          </span>
        )}
      </div>
    </li>
  );
}
