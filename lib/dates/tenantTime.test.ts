import { describe, it, expect } from 'vitest';
import {
  formatTime,
  dayKey,
  addDaysKey,
  nextDayKey,
  dayLabel,
  longDate,
  appointmentWhen,
  groupByDay,
  minutesBetween,
  instantFromLocal,
} from './tenantTime';

const MX = 'America/Mexico_City'; // UTC-6, no DST since 2022

describe('formatTime', () => {
  it('formats in the tenant timezone, not the process timezone', () => {
    // 16:00 UTC is 10:00 in Mexico City. On a UTC server (Vercel) the old
    // toLocaleString() call rendered this as 16:00.
    expect(formatTime('2026-09-15T16:00:00Z', MX)).toBe('10:00');
  });

  it('uses 24h with zero padding so a column of times aligns', () => {
    expect(formatTime('2026-09-15T15:05:00Z', MX)).toBe('09:05');
    expect(formatTime('2026-09-16T04:30:00Z', MX)).toBe('22:30');
  });
});

describe('dayKey', () => {
  it('assigns a late-evening appointment to its LOCAL day', () => {
    // 23:30 UTC on the 23rd is 17:30 on the 23rd in Mexico City — but
    // 02:00 UTC on the 24th is still 20:00 on the 23rd locally. A UTC
    // server would have grouped it under the 24th.
    expect(dayKey('2026-09-23T23:30:00Z', MX)).toBe('2026-09-23');
    expect(dayKey('2026-09-24T02:00:00Z', MX)).toBe('2026-09-23');
  });
});

describe('nextDayKey', () => {
  it('rolls over months and years', () => {
    expect(nextDayKey('2026-09-30')).toBe('2026-10-01');
    expect(nextDayKey('2026-12-31')).toBe('2027-01-01');
  });
});

describe('dayLabel', () => {
  const now = new Date('2026-09-15T18:00:00Z'); // noon, 15 Sep, in MX

  it('says Hoy and Mañana relative to the tenant day', () => {
    expect(dayLabel('2026-09-15', now, MX)).toBe('Hoy');
    expect(dayLabel('2026-09-16', now, MX)).toBe('Mañana');
  });

  it('spells out any other day in Spanish', () => {
    expect(dayLabel('2026-09-23', now, MX)).toBe('miércoles 23 de septiembre');
  });

  it('does not treat the UTC date as "today" late in the local evening', () => {
    // 04:00 UTC on the 16th is still 22:00 on the 15th in Mexico City.
    const lateEvening = new Date('2026-09-16T04:00:00Z');
    expect(dayLabel('2026-09-15', lateEvening, MX)).toBe('Hoy');
  });
});

describe('groupByDay', () => {
  it('buckets sorted items by local day and keeps their order', () => {
    const items = [
      { id: 'a', at: '2026-09-15T16:00:00Z' },
      { id: 'b', at: '2026-09-15T20:00:00Z' },
      { id: 'c', at: '2026-09-16T03:00:00Z' }, // 21:00 on the 15th locally
      { id: 'd', at: '2026-09-16T16:00:00Z' },
    ];
    const groups = groupByDay(items, (i) => i.at, MX);
    expect(groups.map((g) => g.key)).toEqual(['2026-09-15', '2026-09-16']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('minutesBetween', () => {
  it('returns whole minutes', () => {
    expect(minutesBetween('2026-09-15T16:00:00Z', '2026-09-15T16:45:00Z')).toBe(45);
  });
});

describe('addDaysKey', () => {
  it('moves forward and back across month boundaries', () => {
    expect(addDaysKey('2026-09-25', 60)).toBe('2026-11-24');
    expect(addDaysKey('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('appointmentWhen', () => {
  // The bug this guards: the confirmation email and "Ver mi cita" are
  // server-rendered, and on Vercel the process runs in UTC. 23:30 UTC is
  // 17:30 in Mexico City — a customer reading "23:30" would miss it.
  it('states the local day and time of a late-evening appointment', () => {
    expect(appointmentWhen('2026-09-23T23:30:00Z', MX)).toBe('Miércoles 23 de septiembre, 17:30');
  });

  it('never goes relative, even for today', () => {
    expect(longDate(new Date('2026-09-15T18:00:00Z'), MX)).toBe('martes 15 de septiembre');
  });
});

describe('instantFromLocal', () => {
  it('reads the wall time in the tenant timezone, not the process one', () => {
    // 14:00 in Durango (UTC-6, no DST since 2022) is 20:00 UTC.
    expect(instantFromLocal('2026-12-25', '14:00', 'America/Mexico_City')).toBe(
      '2026-12-25T20:00:00.000Z'
    );
  });

  it('round-trips through the formatters', () => {
    const iso = instantFromLocal('2026-09-23', '09:30', 'America/Mexico_City');
    expect(formatTime(iso, 'America/Mexico_City')).toBe('09:30');
    expect(dayKey(iso, 'America/Mexico_City')).toBe('2026-09-23');
  });

  it('handles a zone that still observes DST, on both sides of the change', () => {
    // Madrid is UTC+1 in winter and UTC+2 in summer.
    expect(instantFromLocal('2026-01-15', '12:00', 'Europe/Madrid')).toBe(
      '2026-01-15T11:00:00.000Z'
    );
    expect(instantFromLocal('2026-07-15', '12:00', 'Europe/Madrid')).toBe(
      '2026-07-15T10:00:00.000Z'
    );
  });

  it('defaults to the platform timezone when the tenant has none', () => {
    expect(instantFromLocal('2026-12-25', '00:00', null)).toBe('2026-12-25T06:00:00.000Z');
  });
});
