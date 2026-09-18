// Date formatting in the TENANT's timezone, for server-rendered pages.
//
// Why this exists: the dashboard used `new Date(x).toLocaleString('es-MX')`
// inside Server Components. That formats in the timezone of the process
// running it — which is the developer's machine locally (America/Mexico_City,
// so everything looked right) and UTC on Vercel. In production a 10:00
// appointment in Durango would have rendered as 16:00, and a late-evening
// one would have been grouped under the wrong DAY. Every business-facing
// time has to be formatted against `tenants.timezone` explicitly.

const DEFAULT_TZ = 'America/Mexico_City';

function tz(timezone: string | null | undefined): string {
  return timezone && timezone.length > 0 ? timezone : DEFAULT_TZ;
}

// "09:30" — 24h, zero-padded, so a column of times aligns.
export function formatTime(iso: string, timezone?: string | null): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: tz(timezone),
  }).format(new Date(iso));
}

// "2026-09-23" in the tenant's local calendar. Used as a grouping key:
// two instants belong to the same day only if they share this string.
// en-CA is used purely because it formats dates as YYYY-MM-DD.
export function dayKey(date: Date | string, timezone?: string | null): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz(timezone),
  }).format(typeof date === 'string' ? new Date(date) : date);
}

// `key` moved by `days` calendar days (negative goes back). Computed at
// NOON UTC of that calendar date rather than "now + 24h", so a
// daylight-saving boundary can never push the result into the wrong day.
export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  noon.setUTCDate(noon.getUTCDate() + days);
  return noon.toISOString().slice(0, 10);
}

export function nextDayKey(key: string): string {
  return addDaysKey(key, 1);
}

// "Hoy", "Mañana", or "martes 23 de septiembre".
export function dayLabel(key: string, now: Date, timezone?: string | null): string {
  const today = dayKey(now, timezone);
  if (key === today) return 'Hoy';
  if (key === nextDayKey(today)) return 'Mañana';

  const [y, m, d] = key.split('-').map(Number);
  // Noon UTC again, formatted in UTC: we already HAVE the local calendar
  // date, we only need its weekday and month name, and noon keeps any
  // timezone offset from rolling it to an adjacent day.
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  const parts = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).formatToParts(noon);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')} ${get('day')} de ${get('month')}`;
}

// Long form, never relative: "lunes 15 de septiembre". For page headers
// and for anything a customer reads later (an email, "Ver mi cita"),
// where "Mañana" would be wrong by the time they read it.
export function longDate(date: Date | string, timezone?: string | null): string {
  return dayLabel(dayKey(date, timezone), new Date(0), timezone);
}

// "Miércoles 23 de septiembre, 17:30" — when an appointment is, stated
// the way a customer needs it: absolute day, local time, sentence case.
export function appointmentWhen(iso: string, timezone?: string | null): string {
  const day = longDate(iso, timezone);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${formatTime(iso, timezone)}`;
}

// Bucket already-sorted items by local day, preserving order.
export function groupByDay<T>(
  items: T[],
  getIso: (item: T) => string,
  timezone?: string | null
): { key: string; items: T[] }[] {
  const groups: { key: string; items: T[] }[] = [];
  for (const item of items) {
    const key = dayKey(getIso(item), timezone);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

// The inverse of everything above: a wall-clock time the OWNER typed
// ("25/12", "14:00") turned into the absolute instant it names in the
// business's timezone.
//
// Needed because blocking time is entered as local time but stored as
// timestamptz. `new Date('2026-12-25T14:00')` would resolve against the
// PROCESS timezone — UTC on Vercel — so a block typed as 2pm in Durango
// would be written as 8am and free up exactly the hours it was meant to
// close.
//
// Method: assume the wall time is UTC, measure how far that guess lands
// from the target zone, and subtract the difference. The second pass
// handles the DST boundary, where the correction itself changes the
// offset (the hour a clock jumps).
function zoneOffsetMs(instant: Date, timeZone: string): number {
  // 'sv' formats as YYYY-MM-DD HH:mm:ss, which Date.parse reads as local
  // — but we only use it to subtract two UTC-based numbers, so the
  // parsing convention cancels out.
  const parts = new Intl.DateTimeFormat('sv', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
  const [date, time] = parts.split(' ');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm, ss) - instant.getTime();
}

export function instantFromLocal(
  dayKeyValue: string,
  time: string,
  timezone?: string | null
): string {
  const zone = tz(timezone);
  const [y, m, d] = dayKeyValue.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const asIfUtc = Date.UTC(y, m - 1, d, hh || 0, mm || 0);

  let offset = zoneOffsetMs(new Date(asIfUtc), zone);
  let instant = new Date(asIfUtc - offset);
  const corrected = zoneOffsetMs(instant, zone);
  if (corrected !== offset) {
    offset = corrected;
    instant = new Date(asIfUtc - offset);
  }
  return instant.toISOString();
}
