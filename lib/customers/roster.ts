import { dayKey } from '@/lib/dates/tenantTime';

// Turning a pile of bookings into a list of PEOPLE.
//
// The awkward fact this module exists for: `create_booking` inserts a
// brand-new row into `customers` on every single booking (db/010), and
// there is no unique constraint on (tenant_id, phone). So the customers
// table is not a list of customers — it is a list of bookings wearing a
// different hat. Reading it directly would show the same regular five
// times, which is worse than having no customers page at all.
//
// So the roster is derived, not read: bookings are grouped by the one
// field a person actually keeps between visits, their phone number.
// Deduping in the query would have meant a data migration that merges
// existing rows, and merging two people who share a phone (a couple, a
// household landline, a shop's own number typed in by staff) is not
// reversible. Grouping at read time is.

export type RosterBooking = {
  id: string;
  starts_at: string;
  status: string;
  customers: { name: string; phone?: string | null; email?: string | null } | null;
  service_types: { name: string } | null;
};

export type CustomerRecord = {
  /** Stable within one render: the grouping key, used as the React key. */
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  /** Appointments explicitly marked as attended. */
  completed: number;
  /**
   * Times this person actually came in: `completed`, plus past
   * appointments still sitting at 'confirmed'. Nothing could write
   * 'completed' before db/023, so counting only that would show every
   * regular as a first-timer. This is the number the UI shows.
   */
  visits: number;
  /** Appointments they didn't show up for. Counted separately on purpose. */
  noShows: number;
  cancelled: number;
  /** Confirmed and still in the future. */
  upcoming: number;
  /** Every booking, whatever became of it. */
  total: number;
  /** Most recent past appointment that wasn't cancelled, as an ISO instant. */
  lastVisit: string | null;
  /** The service of that most recent visit ("Clientes que regresan" lo usa en el mensaje). */
  lastService?: string | null;
  /** Next confirmed appointment, as an ISO instant. */
  nextVisit: string | null;
  /** What they booked most often, for the one line of context a row can hold. */
  favouriteService: string | null;
};

// Digits only. "618 114 2290", "(618) 114-2290" and "6181142290" are one
// person; a formatting change between two visits must not split them.
// The country code is NOT stripped: +52 618… and 618… are left as
// different keys, because assuming a country here would merge real
// strangers the moment this is used outside Mexico.
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

// Falls back to the name when there is no usable phone. Staff-created
// bookings require a phone, but a row imported or edited by hand may not
// have one, and dropping those customers entirely would be worse than
// grouping them by a name that might collide.
function groupKey(b: RosterBooking): string | null {
  const phone = normalizePhone(b.customers?.phone);
  if (phone) return `tel:${phone}`;
  const name = b.customers?.name?.trim().toLowerCase();
  return name ? `name:${name}` : null;
}

export function buildRoster(bookings: RosterBooking[], now: Date): CustomerRecord[] {
  // `services` counts what they book; `lastSeenAt` tracks which booking
  // supplied the name/phone currently held, so a later correction wins.
  // Both are scaffolding, stripped before the records are returned.
  type Accum = CustomerRecord & { services: Map<string, number>; lastSeenAt: string | null };
  const byKey = new Map<string, Accum>();

  for (const b of bookings) {
    const key = groupKey(b);
    if (!key) continue;

    let rec = byKey.get(key);
    if (!rec) {
      rec = {
        key,
        name: b.customers?.name?.trim() || 'Cliente',
        phone: b.customers?.phone?.trim() || null,
        email: b.customers?.email?.trim() || null,
        completed: 0,
        visits: 0,
        noShows: 0,
        cancelled: 0,
        upcoming: 0,
        total: 0,
        lastVisit: null,
        nextVisit: null,
        favouriteService: null,
        services: new Map(),
        lastSeenAt: null,
      };
      byKey.set(key, rec);
    }

    rec.total += 1;
    const isFuture = new Date(b.starts_at) > now;

    if (b.status === 'cancelled') rec.cancelled += 1;
    else if (b.status === 'no_show') rec.noShows += 1;
    else if (b.status === 'completed') rec.completed += 1;
    else if (isFuture) rec.upcoming += 1;

    // A past confirmed appointment counts as a visit even if nobody
    // pressed "Vino": the status only got a way to be written in
    // db/023, so every booking made before that is still 'confirmed'.
    // Treating those as "never visited" would show a loyal regular as a
    // stranger for as long as their history goes back.
    const attended = b.status === 'completed' || (b.status === 'confirmed' && !isFuture);
    if (attended) {
      rec.visits += 1;
      if (!rec.lastVisit || b.starts_at > rec.lastVisit) {
        rec.lastVisit = b.starts_at;
        rec.lastService = b.service_types?.name ?? null;
      }
    }
    if (b.status === 'confirmed' && isFuture && (!rec.nextVisit || b.starts_at < rec.nextVisit)) {
      rec.nextVisit = b.starts_at;
    }

    // The most recent spelling of the name wins: people correct a typo
    // on a later booking, and the correction is the better one to show.
    if (!rec.lastSeenAt || b.starts_at > rec.lastSeenAt) {
      rec.lastSeenAt = b.starts_at;
      if (b.customers?.name?.trim()) rec.name = b.customers.name.trim();
      if (b.customers?.phone?.trim()) rec.phone = b.customers.phone.trim();
    }
    // Email is kept from whichever booking has one — it's optional in
    // the public flow, so the newest booking often has none.
    if (!rec.email && b.customers?.email?.trim()) rec.email = b.customers.email.trim();

    const service = b.service_types?.name;
    if (service && b.status !== 'cancelled') {
      rec.services.set(service, (rec.services.get(service) ?? 0) + 1);
    }
  }

  const records = [...byKey.values()].map((rec) => {
    let favourite: string | null = null;
    let best = 0;
    for (const [name, count] of rec.services) {
      if (count > best) {
        best = count;
        favourite = name;
      }
    }
    const { services: _services, lastSeenAt: _lastSeenAt, ...rest } = rec;
    return { ...rest, favouriteService: favourite };
  });

  // Whoever the owner is most likely to be thinking about: someone
  // booked in first, then by how recently they were here. A list sorted
  // alphabetically makes you scroll to find today's people.
  return records.sort((a, b) => {
    if (a.nextVisit && b.nextVisit) return a.nextVisit < b.nextVisit ? -1 : 1;
    if (a.nextVisit) return -1;
    if (b.nextVisit) return 1;
    if (a.lastVisit && b.lastVisit) return a.lastVisit > b.lastVisit ? -1 : 1;
    if (a.lastVisit) return -1;
    if (b.lastVisit) return 1;
    return a.name.localeCompare(b.name, 'es');
  });
}

// "Nuevo" is the honest label for someone with one booking and nothing
// behind it — calling them a "cliente" implies a relationship that
// hasn't happened yet.
export function customerTenure(
  rec: CustomerRecord,
  now: Date,
  timezone: string | null
): 'nuevo' | 'recurrente' | 'inactivo' {
  if (rec.total <= 1) return 'nuevo';
  if (!rec.lastVisit) return 'nuevo';

  // Ninety days without coming in, and nothing on the books. Measured in
  // the business's own calendar days, like every other date in the app.
  const last = dayKey(rec.lastVisit, timezone);
  const cutoff = dayKey(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), timezone);
  if (!rec.nextVisit && last < cutoff) return 'inactivo';
  return 'recurrente';
}
