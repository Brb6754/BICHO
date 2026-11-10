import { dayKey } from '@/lib/dates/tenantTime';
import { normalizePhone, type CustomerRecord, type RosterBooking } from '@/lib/customers/roster';

// "Clientes que regresan": a quién escribirle hoy.
//
// Las dos listas salen de las MISMAS citas que ya agrupa buildRoster
// (lib/customers/roster.ts), para que "no ha vuelto" signifique lo mismo
// aquí y en la pantalla de Clientes.

const DIA_MS = 24 * 60 * 60 * 1000;
export const SEMANAS_POR_OMISION = 6;

export type ClientaInactiva = {
  key: string;
  name: string;
  phone: string | null;
  lastVisit: string;
  lastService: string | null;
  /** Semanas (redondeadas) desde su última visita. */
  semanas: number;
};

/**
 * Clientas cuya última visita fue hace más de `semanas` semanas y que no
 * tienen nada agendado. Medido en días del calendario del negocio, como
 * el resto de fechas de la app. Las más recientes primero: son las más
 * fáciles de recuperar.
 */
export function clientasInactivas(
  roster: CustomerRecord[],
  semanas: number,
  now: Date,
  timezone: string | null
): ClientaInactiva[] {
  const corte = dayKey(new Date(now.getTime() - semanas * 7 * DIA_MS), timezone);
  return roster
    .filter((r) => r.lastVisit && !r.nextVisit && dayKey(r.lastVisit, timezone) < corte)
    .map((r) => ({
      key: r.key,
      name: r.name,
      phone: r.phone,
      lastVisit: r.lastVisit as string,
      lastService: r.lastService ?? r.favouriteService ?? null,
      semanas: Math.round((now.getTime() - new Date(r.lastVisit as string).getTime()) / (7 * DIA_MS)),
    }))
    .sort((a, b) => (a.lastVisit > b.lastVisit ? -1 : 1));
}

export type VisitaReciente = {
  key: string;
  bookingId: string;
  name: string;
  phone: string | null;
  email: string | null;
  service: string | null;
  startsAt: string;
};

/**
 * Citas que ya ocurrieron en los últimos `dias` días: el momento de
 * pedir la reseña. Cuenta como atendida la marcada "Vino" (completed) y
 * la pasada que sigue en confirmed — mismo criterio que buildRoster.
 * Una fila por persona (la visita más reciente).
 */
export function visitasParaResena(bookings: RosterBooking[], now: Date, dias = 7): VisitaReciente[] {
  const desde = now.getTime() - dias * DIA_MS;
  const porPersona = new Map<string, VisitaReciente>();

  for (const b of bookings) {
    const t = new Date(b.starts_at).getTime();
    if (t > now.getTime() || t < desde) continue;
    if (b.status !== 'completed' && b.status !== 'confirmed') continue;

    const tel = normalizePhone(b.customers?.phone);
    const nombre = b.customers?.name?.trim();
    const key = tel ? `tel:${tel}` : nombre ? `name:${nombre.toLowerCase()}` : null;
    if (!key) continue;

    const previa = porPersona.get(key);
    if (previa && previa.startsAt >= b.starts_at) continue;
    porPersona.set(key, {
      key,
      bookingId: b.id,
      name: nombre || 'Cliente',
      phone: b.customers?.phone?.trim() || null,
      email: b.customers?.email?.trim() || previa?.email || null,
      service: b.service_types?.name ?? null,
      startsAt: b.starts_at,
    });
  }

  return [...porPersona.values()].sort((a, b) => (a.startsAt > b.startsAt ? -1 : 1));
}
