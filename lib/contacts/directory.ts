import { dayKey } from '@/lib/dates/tenantTime';

// El directorio: una persona por renglón, con lo que pasó con ella en
// los TRES módulos.
//
// Es lo que `lib/customers/roster.ts` no podía dar. Ese agrupa citas por
// teléfono al leer, así que solo ve reservas y no tiene dónde colgar una
// nota. Esto parte de `contacts` —una fila real por persona— y le cuelga
// sus citas, sus cotizaciones y sus facturas.
//
// Las reglas de antigüedad son LAS MISMAS que las de `customerTenure`,
// a propósito: dos pantallas que llamen "inactivo" a cosas distintas es
// peor que no tener la etiqueta.

export type DirectoryBooking = {
  contact_id: string | null;
  starts_at: string;
  status: string;
};

export type DirectoryQuote = {
  contact_id: string | null;
  status: string;
};

export type DirectoryInvoice = {
  contact_id: string | null;
  status: string;
};

export type ContactSeedRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string[] | null;
  notes: string | null;
  rfc: string | null;
};

export type DirectoryEntry = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string[];
  hasNotes: boolean;
  hasRfc: boolean;
  /** Citas en las que de verdad vino: completadas, más las pasadas que
   *  siguen en 'confirmed'. Misma definición que el roster viejo — nada
   *  podía escribir 'completed' antes de db/023, así que contar solo eso
   *  mostraría a toda la clientela histórica como desconocidos. */
  visits: number;
  noShows: number;
  /** Confirmada y todavía en el futuro. */
  nextVisit: string | null;
  lastVisit: string | null;
  /** Cotizaciones enviadas o vistas que nadie contestó. La lista por la
   *  que alguien paga el módulo de cotizaciones. */
  openQuotes: number;
  acceptedQuotes: number;
  stampedInvoices: number;
  tenure: Tenure;
};

export type Tenure = 'nuevo' | 'recurrente' | 'inactivo';

const ABIERTAS = new Set(['sent', 'viewed']);

export function buildDirectory(
  contacts: ContactSeedRow[],
  bookings: DirectoryBooking[],
  quotes: DirectoryQuote[],
  invoices: DirectoryInvoice[],
  now: Date,
  timezone: string | null
): DirectoryEntry[] {
  const porContacto = new Map<string, DirectoryEntry>();

  for (const c of contacts) {
    porContacto.set(c.id, {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      tags: c.tags ?? [],
      hasNotes: Boolean(c.notes?.trim()),
      hasRfc: Boolean(c.rfc?.trim()),
      visits: 0,
      noShows: 0,
      nextVisit: null,
      lastVisit: null,
      openQuotes: 0,
      acceptedQuotes: 0,
      stampedInvoices: 0,
      tenure: 'nuevo',
    });
  }

  const ahora = now.getTime();

  for (const b of bookings) {
    if (!b.contact_id) continue;
    const e = porContacto.get(b.contact_id);
    if (!e) continue;

    const t = new Date(b.starts_at).getTime();
    const pasada = t <= ahora;

    if (b.status === 'no_show') {
      e.noShows += 1;
      continue;
    }
    if (b.status === 'cancelled') continue;

    if (b.status === 'completed' || (pasada && b.status === 'confirmed')) {
      e.visits += 1;
      if (!e.lastVisit || t > new Date(e.lastVisit).getTime()) e.lastVisit = b.starts_at;
    } else if (!pasada && b.status === 'confirmed') {
      if (!e.nextVisit || t < new Date(e.nextVisit).getTime()) e.nextVisit = b.starts_at;
    }
  }

  for (const q of quotes) {
    if (!q.contact_id) continue;
    const e = porContacto.get(q.contact_id);
    if (!e) continue;
    if (ABIERTAS.has(q.status)) e.openQuotes += 1;
    if (q.status === 'accepted') e.acceptedQuotes += 1;
  }

  for (const f of invoices) {
    if (!f.contact_id) continue;
    const e = porContacto.get(f.contact_id);
    if (!e) continue;
    if (f.status === 'stamped') e.stampedInvoices += 1;
  }

  for (const e of porContacto.values()) {
    e.tenure = tenureOf(e, now, timezone);
  }

  // Quien tiene algo esperando respuesta va primero; después, los más
  // recientes. Una lista alfabética es un directorio telefónico; esta
  // tiene que empujar a actuar.
  return [...porContacto.values()].sort((a, b) => {
    if (a.openQuotes !== b.openQuotes) return b.openQuotes - a.openQuotes;
    const ta = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
    const tb = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
    if (ta !== tb) return tb - ta;
    return a.name.localeCompare(b.name, 'es');
  });
}

/**
 * Mismas reglas que `customerTenure` del roster viejo: una sola visita
 * es "nuevo" —llamarle cliente implica una relación que todavía no
 * existe— y noventa días sin venir, sin nada agendado, es "inactivo".
 *
 * Un contacto que solo ha cotizado o facturado, sin citas, cuenta como
 * nuevo: no ha pasado por el negocio todavía.
 */
export function tenureOf(
  e: Pick<DirectoryEntry, 'visits' | 'lastVisit' | 'nextVisit'>,
  now: Date,
  timezone: string | null
): Tenure {
  if (e.visits <= 1) return 'nuevo';
  if (!e.lastVisit) return 'nuevo';

  const last = dayKey(e.lastVisit, timezone);
  const cutoff = dayKey(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), timezone);
  if (!e.nextVisit && last < cutoff) return 'inactivo';
  return 'recurrente';
}

/** Las tres listas que generan trabajo, no reportes. */
export function actionLists(entries: DirectoryEntry[]) {
  return {
    sinContestar: entries.filter((e) => e.openQuotes > 0),
    noVuelven: entries.filter((e) => e.tenure === 'inactivo'),
    noLlegaron: entries.filter((e) => e.noShows > 0),
  };
}
