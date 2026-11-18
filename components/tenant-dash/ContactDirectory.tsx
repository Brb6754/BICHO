'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Contact, Mail, MessageCircle, Phone, Search, StickyNote, X } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { dayKey, dayLabel } from '@/lib/dates/tenantTime';
import { waLink } from '@/lib/regresan/mensajes';
import type { DirectoryEntry } from '@/lib/contacts/directory';
import { categorize, pendientes, type Categoria, type CategoriaKey } from '@/lib/contacts/categories';
import { ConHoja } from './fichas/Hoja';
import { Avatar, TARJETA } from './fichas/visual';

// El directorio de clientes, en secciones por el estado de la relación.
//
// Cada persona es una tarjeta: sus iniciales a color, POR QUÉ está en esa
// sección ("No vino 2 veces · última falta: 3 nov"), cuántas veces ha
// venido, y dos botones grandes, WhatsApp y Llamar, que es para lo que se
// abre esta pantalla. Tocar la tarjeta abre su ficha en una hoja, con sus
// últimas citas. Qué hacer con cada sección vive en su ayuda desplegable.
//
// El reparto vive en `lib/contacts/categories.ts`: aquí solo se dibuja.
// Las secciones son `<details>` nativos, abiertos por defecto.
//
// BUSCAR A UN CLIENTE es la tarea #1 ("¿cuál era el teléfono de
// Lupita?"): el buscador va arriba, grande, y filtra mientras escribe.
// Busca por nombre (sin acentos ni mayúsculas) o por un pedazo del
// teléfono. Con búsqueda, las secciones se apagan y queda una lista.

/** "Lupita Pérez" → "lupita perez": así "perez" encuentra a "Pérez". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function coincide(e: DirectoryEntry, consulta: string): boolean {
  const q = normalizar(consulta.trim());
  if (!q) return true;
  const digitos = q.replace(/\D/g, '');
  if (normalizar(e.name).includes(q)) return true;
  if (e.email && normalizar(e.email).includes(q)) return true;
  return digitos.length >= 3 && (e.phone ?? '').replace(/\D/g, '').includes(digitos);
}

export type CitaHistorial = { starts_at: string; status: string; servicio?: string | null };

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "3 nov" en el calendario del negocio (de dayKey, sin construir otro Date). */
export function fechaCorta(iso: string, timezone: string | null): string {
  const [, mes, dia] = dayKey(iso, timezone).split('-');
  return `${Number(dia)} ${MESES[Number(mes) - 1]}`;
}

const veces = (n: number) => `${n} ${n === 1 ? 'vez' : 'veces'}`;

/**
 * Por qué esta persona está en su sección, en una línea que se lee sin
 * pensar: "No vino 2 veces · última falta: 3 nov". `hist` va de la cita
 * más reciente a la más vieja.
 */
export function porQue(
  categoria: CategoriaKey | null,
  e: DirectoryEntry,
  hist: CitaHistorial[],
  now: Date,
  timezone: string | null
): string {
  const ultimaFalta = hist.find((c) => c.status === 'no_show');
  const ultima = e.lastVisit ? `última vez: ${fechaCorta(e.lastVisit, timezone)}` : null;
  const viene = e.nextVisit ? `Viene ${dayLabel(dayKey(e.nextVisit, timezone), now, timezone).toLowerCase()}` : null;
  switch (categoria) {
    case 'sinContestar':
      return `${e.openQuotes} ${e.openQuotes === 1 ? 'cotización' : 'cotizaciones'} sin contestar`;
    case 'noLlegaron':
      return `No vino ${veces(e.noShows)}` + (ultimaFalta ? ` · última falta: ${fechaCorta(ultimaFalta.starts_at, timezone)}` : '');
    case 'seEnfriaron': {
      if (!e.lastVisit) return 'Hace mucho que no viene';
      const meses = Math.max(3, Math.floor((now.getTime() - new Date(e.lastVisit).getTime()) / (30 * 864e5)));
      return `No viene desde hace ${meses} meses · ${ultima}`;
    }
    case 'vienenPronto':
      return viene ?? 'Tiene una cita agendada';
    case 'nuevos':
      return e.visits === 0 ? viene ?? 'Todavía no ha venido' : `Vino una vez · ${ultima}`;
    default:
      return viene ?? (ultima ? ultima[0].toUpperCase() + ultima.slice(1) : 'Sin visitas todavía');
  }
}

type Ctx = {
  now: Date;
  timezone: string | null;
  hrefBase: string | null;
  historial: Record<string, CitaHistorial[]>;
};

export function ContactDirectory({
  entries,
  now,
  timezone,
  hrefBase = '/dashboard/customers',
  emptyAction,
  historial = {},
}: {
  entries: DirectoryEntry[];
  now: Date;
  timezone: string | null;
  /** A dónde lleva "Ver la ficha completa". `null` en la demo: no hay ficha que abrir. */
  hrefBase?: string | null;
  /** Botón del estado vacío (compartir el link). */
  emptyAction?: React.ReactNode;
  /** Sus citas por contacto, la más reciente primero: la ficha y el "por qué". */
  historial?: Record<string, CitaHistorial[]>;
}) {
  const [consulta, setConsulta] = useState('');
  const categorias = useMemo(() => categorize(entries), [entries]);
  const buscador = useRef<HTMLInputElement>(null);

  // El atajo "Buscar cliente" del inicio llega con #buscar: cursor en el buscador.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (window.location.hash === '#buscar') buscador.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Contact}
        title="Todavía no tienes clientes aquí"
        description="Esta lista se arma sola: cada persona que reserve aparece aquí con su teléfono."
        why="Así sabes quién viene seguido y a quién escribirle porque ya no ha vuelto."
        action={emptyAction}
      />
    );
  }

  const porAtender = pendientes(categorias);
  const resultados = consulta.trim() ? entries.filter((e) => coincide(e, consulta)) : null;
  const ctx: Ctx = { now, timezone, hrefBase, historial };

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="relative">
        <label htmlFor="buscar-cliente" className="sr-only">
          Buscar a un cliente por nombre o teléfono
        </label>
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          ref={buscador}
          id="buscar-cliente"
          type="search"
          inputMode="search"
          autoComplete="off"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Nombre o teléfono"
          className="min-h-14 w-full rounded-full border border-border bg-surface py-3 pl-14 pr-14 text-[17px] text-ink shadow-xs placeholder:text-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {consulta && (
          <button
            type="button"
            onClick={() => setConsulta('')}
            aria-label="Borrar la búsqueda"
            className="absolute right-1.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {resultados ? (
        <section aria-live="polite" aria-label="Resultados de la búsqueda">
          {resultados.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-[17px] font-semibold text-ink">Nadie se llama así</p>
              <p className="mx-auto mt-1 max-w-sm text-[15px] leading-relaxed text-muted">
                Revisa cómo lo escribiste o busca por los últimos números del teléfono.
              </p>
              <button
                type="button"
                onClick={() => setConsulta('')}
                className="mt-4 inline-flex min-h-12 items-center rounded-full border border-border px-6 text-[15px] font-medium text-ink hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Ver a todos
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 px-1 text-[15px] text-muted">
                {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
              </p>
              <ul className="grid gap-3 lg:grid-cols-2">
                {resultados.map((c) => (
                  <Tarjeta key={c.id} c={c} categoria={categorias.find((k) => k.entries.includes(c))?.key ?? null} {...ctx} />
                ))}
              </ul>
            </>
          )}
        </section>
      ) : (
        <>
          <p className="px-1 text-[15px] text-muted">
            {porAtender > 0 ? (
              <>
                <span className="font-semibold text-ink">
                  {porAtender} {porAtender === 1 ? 'persona necesita' : 'personas necesitan'} algo de ti
                </span>{' '}
                · {entries.length} en total
              </>
            ) : (
              <>Nadie espera nada de ti · {entries.length} clientes en total</>
            )}
          </p>
          {categorias.map((c) => (
            <Seccion key={c.key} categoria={c} {...ctx} />
          ))}
        </>
      )}
    </div>
  );
}

function Seccion({ categoria, ...ctx }: { categoria: Categoria } & Ctx) {
  const { key, titulo, ayuda, accionable, entries } = categoria;
  return (
    <details open className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-5 w-5 shrink-0 -rotate-90 text-muted transition-transform duration-150 group-open:rotate-0 motion-reduce:transition-none" aria-hidden="true" />
        <h2 className="text-[18px] font-semibold tracking-tight text-ink">{titulo}</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[14px] font-semibold tabular-nums ${
            accionable ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : 'bg-ink/[0.07] text-ink'
          }`}
        >
          {entries.length}
        </span>
      </summary>
      {/* Qué hacer con esta gente va en la ayuda: cada tarjeta ya dice por qué está aquí. */}
      <div className="mb-2 pl-7">
        <HelpTip title={titulo} label="¿Qué hago con ellos?">
          {ayuda}
        </HelpTip>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {entries.map((c) => (
          <Tarjeta key={c.id} c={c} categoria={key} accionable={accionable} {...ctx} />
        ))}
      </ul>
    </details>
  );
}

function Tarjeta({
  c,
  categoria,
  accionable = false,
  now,
  timezone,
  hrefBase,
  historial,
}: { c: DirectoryEntry; categoria: CategoriaKey | null; accionable?: boolean } & Ctx) {
  const hist = historial[c.id] ?? [];
  const motivo = porQue(categoria, c, hist, now, timezone);
  const wa = waLink(c.phone, `Hola ${c.name.split(' ')[0]}, `);
  const tel = c.phone ? `tel:${c.phone.replace(/\s/g, '')}` : null;

  return (
    <li className={`${TARJETA} flex flex-col`}>
      <ConHoja
        titulo={c.name}
        etiqueta={`Ver la ficha de ${c.name}`}
        className="-m-2 rounded-2xl p-2"
        boton={
          <span className="flex items-start gap-3.5">
            <Avatar nombre={c.name} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[17px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{c.name}</span>
                {c.hasNotes && <StickyNote className="h-4 w-4 shrink-0 text-muted" aria-label="Tiene notas" />}
              </span>
              <span className={`mt-0.5 block text-[15px] ${accionable ? 'font-medium text-ink' : 'text-muted'}`}>{motivo}</span>
              {c.tags.length > 0 && (
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {c.tags.map((t) => (
                    <span key={t} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[13px] font-medium text-ink">
                      {t}
                    </span>
                  ))}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[1.5rem] font-bold leading-none tabular-nums text-ink">{c.visits}</span>
              <span className="mt-1 block text-[13px] text-muted">{c.visits === 1 ? 'visita' : 'visitas'}</span>
            </span>
          </span>
        }
      >
        {() => <Ficha c={c} hist={hist} motivo={motivo} wa={wa} tel={tel} now={now} timezone={timezone} hrefBase={hrefBase} />}
      </ConHoja>

      {(wa || tel) && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Contactar wa={wa} tel={tel} />
        </div>
      )}
    </li>
  );
}

/** Los dos botones grandes: WhatsApp en verde (texto blanco AA), Llamar en contorno. */
function Contactar({ wa, tel }: { wa: string | null; tel: string | null }) {
  return (
    <>
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1E7F46] px-4 text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          WhatsApp
        </a>
      ) : (
        <span />
      )}
      {tel && (
        <a
          href={tel}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-[15px] font-semibold text-ink transition hover:bg-ink/[0.04] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
          Llamar
        </a>
      )}
    </>
  );
}

const ESTADO: Record<string, { texto: string; clase: string }> = {
  confirmed: { texto: 'Agendada', clase: 'bg-primary/10 text-ink' },
  completed: { texto: 'Vino', clase: 'bg-success-soft text-ink' },
  no_show: { texto: 'No vino', clase: 'bg-warning-soft text-ink' },
  cancelled: { texto: 'Cancelada', clase: 'bg-ink/[0.06] text-muted' },
};

function Ficha({
  c,
  hist,
  motivo,
  wa,
  tel,
  now,
  timezone,
  hrefBase,
}: {
  c: DirectoryEntry;
  hist: CitaHistorial[];
  motivo: string;
  wa: string | null;
  tel: string | null;
  now: Date;
  timezone: string | null;
  hrefBase: string | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar nombre={c.name} tamano="grande" />
        <div className="min-w-0">
          <p className="text-[16px] text-ink">{motivo}</p>
          {c.phone && <p className="mt-0.5 text-[15px] tabular-nums text-muted">{c.phone}</p>}
          {c.email && (
            <a href={`mailto:${c.email}`} className="mt-0.5 inline-flex min-h-8 max-w-full items-center gap-1.5 text-[15px] text-muted underline-offset-4 hover:text-ink hover:underline">
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{c.email}</span>
            </a>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          { n: c.visits, label: c.visits === 1 ? 'visita' : 'visitas' },
          { n: c.noShows, label: c.noShows === 1 ? 'falta' : 'faltas' },
          { n: c.openQuotes, label: c.openQuotes === 1 ? 'cotización' : 'cotizaciones' },
        ].map((x) => (
          <div key={x.label} className="flex flex-col-reverse rounded-2xl bg-ink/[0.04] px-2 py-3">
            <dt className="mt-1 text-[13px] text-muted">{x.label}</dt>
            <dd className="text-[1.5rem] font-bold leading-none tabular-nums text-ink">{x.n}</dd>
          </div>
        ))}
      </dl>

      {(wa || tel) && (
        <div className="grid grid-cols-2 gap-2">
          <Contactar wa={wa} tel={tel} />
        </div>
      )}

      <section aria-label="Sus citas">
        <h3 className="text-[16px] font-semibold text-ink">Sus citas</h3>
        {hist.length === 0 ? (
          <p className="mt-2 text-[15px] text-muted">Todavía no tiene citas.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
            {hist.slice(0, 8).map((h, i) => {
              const e = ESTADO[h.status] ?? ESTADO.confirmed;
              const futura = new Date(h.starts_at) > now;
              return (
                <li key={h.starts_at + i} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-16 shrink-0 text-[15px] font-semibold tabular-nums text-ink">{fechaCorta(h.starts_at, timezone)}</span>
                  <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{h.servicio ?? 'Cita'}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-medium ${e.clase}`}>
                    {futura && h.status === 'confirmed' ? 'Viene' : e.texto}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {hrefBase && (
        <Link
          href={`${hrefBase}/${c.id}`}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-5 text-[15px] font-medium text-ink hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Ver la ficha completa y sus notas
        </Link>
      )}
    </div>
  );
}
