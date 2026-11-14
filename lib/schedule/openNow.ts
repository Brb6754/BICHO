// "Abierto · cierra 20:00", calculado del bloque de horario.
//
// El bloque `hours` es texto libre que escribe el negocio
// ("Martes a viernes: 10:00–20:00", "Domingo y lunes: cerrado"), no una
// tabla. Este parser entiende las formas que de verdad aparecen en las
// plantillas y en los negocios sembrados; ante cualquier línea que no
// entiende devuelve null y la ficha simplemente no se pinta. Mejor no
// decir nada que decir "abierto" a alguien que va a encontrar la cortina
// abajo.

const DAY_KEYS = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sa'] as const; // 0 = domingo
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

type Range = { from: number; to: number }; // minutos desde medianoche
export type DayHours = { days: Set<number>; ranges: Range[] }; // ranges vacío = cerrado

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function dayIndex(word: string): number | null {
  const k = norm(word).slice(0, 2);
  const i = DAY_KEYS.indexOf(k as (typeof DAY_KEYS)[number]);
  return i === -1 ? null : i;
}

function parseDays(part: string): Set<number> | null {
  const p = norm(part);
  if (/todos los dias|diario|toda la semana/.test(p)) return new Set([0, 1, 2, 3, 4, 5, 6]);
  const out = new Set<number>();
  for (const seg of p.split(/,|\by\b/)) {
    const s = seg.trim();
    if (!s) continue;
    const range = s.split(/\s+a\s+|\s*[–—-]\s*/);
    if (range.length === 2) {
      const a = dayIndex(range[0]);
      const b = dayIndex(range[1]);
      if (a === null || b === null) return null;
      for (let d = a; ; d = (d + 1) % 7) {
        out.add(d);
        if (d === b) break;
      }
    } else {
      const d = dayIndex(s);
      if (d === null) return null;
      out.add(d);
    }
  }
  return out.size ? out : null;
}

function parseRanges(part: string): Range[] | null {
  if (/cerrad/.test(norm(part))) return [];
  const re = /(\d{1,2})(?::(\d{2}))?\s*(?:[–—-]|a)\s*(\d{1,2})(?::(\d{2}))?/g;
  const out: Range[] = [];
  for (const m of part.matchAll(re)) {
    const from = Number(m[1]) * 60 + Number(m[2] ?? 0);
    let to = Number(m[3]) * 60 + Number(m[4] ?? 0);
    if (to <= from) to += 24 * 60; // cierra pasada la medianoche
    out.push({ from, to });
  }
  return out.length ? out : null;
}

/** Null si alguna línea no se entiende: un horario a medias es peor que ninguno. */
export function parseHours(lines: string[]): DayHours[] | null {
  const out: DayHours[] = [];
  for (const line of lines) {
    const i = line.indexOf(':');
    if (i === -1) return null;
    const days = parseDays(line.slice(0, i));
    const ranges = parseRanges(line.slice(i + 1));
    if (!days || !ranges) return null;
    out.push({ days, ranges });
  }
  return out.length ? out : null;
}

function hhmm(min: number): string {
  const m = min % (24 * 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** Qué línea del horario corresponde a ese día (para resaltarla). */
export function lineForDay(lines: string[], weekday: number): number {
  const parsed = parseHours(lines);
  if (!parsed) return -1;
  return parsed.findIndex((d) => d.days.has(weekday));
}

export type OpenStatus = { open: boolean; label: string };

/** `weekday` 0 = domingo, `minutes` desde medianoche, ambos en la hora del negocio. */
export function openStatus(lines: string[], weekday: number, minutes: number): OpenStatus | null {
  const parsed = parseHours(lines);
  if (!parsed) return null;
  const rangesOf = (d: number) => parsed.find((h) => h.days.has(d))?.ranges ?? [];

  const now = rangesOf(weekday).find((r) => minutes >= r.from && minutes < r.to);
  if (now) return { open: true, label: `Abierto · cierra ${hhmm(now.to)}` };

  const laterToday = rangesOf(weekday).find((r) => r.from > minutes);
  if (laterToday) return { open: false, label: `Cerrado · abre hoy ${hhmm(laterToday.from)}` };

  for (let i = 1; i <= 7; i++) {
    const d = (weekday + i) % 7;
    const first = rangesOf(d)[0];
    if (first) {
      const when = i === 1 ? 'mañana' : `el ${DAY_NAMES[d]}`;
      return { open: false, label: `Cerrado · abre ${when} ${hhmm(first.from)}` };
    }
  }
  return null;
}

/** Día de la semana y minuto actuales en la zona del negocio. */
export function nowIn(timezone: string | null | undefined, date = new Date()): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'America/Mexico_City',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { weekday, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
