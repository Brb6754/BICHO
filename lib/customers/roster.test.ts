import { describe, it, expect } from 'vitest';
import { buildRoster, customerTenure, normalizePhone, type CustomerRecord, type RosterBooking } from './roster';

const NOW = new Date('2026-09-22T18:00:00.000Z');
const TZ = 'America/Mexico_City';

function booking(over: Partial<RosterBooking> & { starts_at: string }): RosterBooking {
  return {
    id: Math.random().toString(36).slice(2),
    status: 'confirmed',
    customers: { name: 'Lucía Fernández', phone: '618 114 2290', email: null },
    service_types: { name: 'Corte' },
    ...over,
  };
}

describe('normalizePhone', () => {
  it('sees through formatting', () => {
    expect(normalizePhone('618 114 2290')).toBe('6181142290');
    expect(normalizePhone('(618) 114-2290')).toBe('6181142290');
    expect(normalizePhone('6181142290')).toBe('6181142290');
  });

  it('refuses a number too short to identify anyone', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });

  it('keeps the country code, because dropping it would merge strangers', () => {
    expect(normalizePhone('+52 618 114 2290')).toBe('526181142290');
    expect(normalizePhone('+52 618 114 2290')).not.toBe(normalizePhone('618 114 2290'));
  });
});

describe('buildRoster', () => {
  // The whole reason this module exists: create_booking writes a NEW
  // customers row per booking, so five visits are five rows.
  it('collapses one person booked five times into one row', () => {
    const roster = buildRoster(
      [
        booking({ starts_at: '2026-05-01T16:00:00.000Z', status: 'completed' }),
        booking({ starts_at: '2026-06-01T16:00:00.000Z', status: 'completed' }),
        booking({ starts_at: '2026-07-01T16:00:00.000Z', status: 'completed' }),
        booking({ starts_at: '2026-08-01T16:00:00.000Z', status: 'completed' }),
        booking({ starts_at: '2026-09-01T16:00:00.000Z', status: 'completed' }),
      ],
      NOW
    );
    expect(roster).toHaveLength(1);
    expect(roster[0].completed).toBe(5);
    expect(roster[0].total).toBe(5);
  });

  it('keeps no-shows apart from cancellations', () => {
    const roster = buildRoster(
      [
        booking({ starts_at: '2026-09-01T16:00:00.000Z', status: 'no_show' }),
        booking({ starts_at: '2026-09-08T16:00:00.000Z', status: 'cancelled' }),
        booking({ starts_at: '2026-09-15T16:00:00.000Z', status: 'completed' }),
      ],
      NOW
    );
    expect(roster[0]).toMatchObject({ noShows: 1, cancelled: 1, completed: 1 });
  });

  // Every booking made before db/023 is still 'confirmed'. Treating
  // those as "never came" would erase years of history overnight.
  it('counts a past confirmed booking as a visit', () => {
    const roster = buildRoster([booking({ starts_at: '2026-09-01T16:00:00.000Z' })], NOW);
    expect(roster[0].lastVisit).toBe('2026-09-01T16:00:00.000Z');
    expect(roster[0].visits).toBe(1);
    // It was never marked attended, so it is not 'completed'.
    expect(roster[0].completed).toBe(0);
  });

  it('does not count a no-show or a cancellation as a visit', () => {
    const roster = buildRoster(
      [
        booking({ starts_at: '2026-09-01T16:00:00.000Z', status: 'no_show' }),
        booking({ starts_at: '2026-09-08T16:00:00.000Z', status: 'cancelled' }),
      ],
      NOW
    );
    expect(roster[0].visits).toBe(0);
  });

  it('does not count a future booking as a visit', () => {
    const roster = buildRoster([booking({ starts_at: '2026-10-01T16:00:00.000Z' })], NOW);
    expect(roster[0].lastVisit).toBeNull();
    expect(roster[0].nextVisit).toBe('2026-10-01T16:00:00.000Z');
    expect(roster[0].upcoming).toBe(1);
  });

  it('takes the name from the most recent booking, so a correction wins', () => {
    const roster = buildRoster(
      [
        booking({
          starts_at: '2026-05-01T16:00:00.000Z',
          customers: { name: 'lucia f', phone: '618 114 2290' },
        }),
        booking({
          starts_at: '2026-09-01T16:00:00.000Z',
          customers: { name: 'Lucía Fernández', phone: '618 114 2290' },
        }),
      ],
      NOW
    );
    expect(roster[0].name).toBe('Lucía Fernández');
  });

  it('keeps an email even when the newest booking has none', () => {
    const roster = buildRoster(
      [
        booking({
          starts_at: '2026-05-01T16:00:00.000Z',
          customers: { name: 'Lucía', phone: '618 114 2290', email: 'lucia@example.com' },
        }),
        booking({
          starts_at: '2026-09-01T16:00:00.000Z',
          customers: { name: 'Lucía', phone: '618 114 2290', email: null },
        }),
      ],
      NOW
    );
    expect(roster[0].email).toBe('lucia@example.com');
  });

  it('ignores cancelled bookings when picking the favourite service', () => {
    const roster = buildRoster(
      [
        booking({
          starts_at: '2026-05-01T16:00:00.000Z',
          status: 'cancelled',
          service_types: { name: 'Color' },
        }),
        booking({
          starts_at: '2026-06-01T16:00:00.000Z',
          status: 'cancelled',
          service_types: { name: 'Color' },
        }),
        booking({
          starts_at: '2026-07-01T16:00:00.000Z',
          status: 'completed',
          service_types: { name: 'Corte' },
        }),
      ],
      NOW
    );
    expect(roster[0].favouriteService).toBe('Corte');
  });

  it('puts whoever is coming next at the top', () => {
    const roster = buildRoster(
      [
        booking({
          starts_at: '2026-09-01T16:00:00.000Z',
          status: 'completed',
          customers: { name: 'Ayer', phone: '618 000 0001' },
        }),
        booking({
          starts_at: '2026-10-05T16:00:00.000Z',
          customers: { name: 'Lejos', phone: '618 000 0002' },
        }),
        booking({
          starts_at: '2026-09-23T16:00:00.000Z',
          customers: { name: 'Mañana', phone: '618 000 0003' },
        }),
      ],
      NOW
    );
    expect(roster.map((r) => r.name)).toEqual(['Mañana', 'Lejos', 'Ayer']);
  });

  it('groups by name when there is no usable phone, rather than dropping the person', () => {
    const roster = buildRoster(
      [
        booking({
          starts_at: '2026-05-01T16:00:00.000Z',
          customers: { name: 'Sin Teléfono', phone: null },
        }),
        booking({
          starts_at: '2026-06-01T16:00:00.000Z',
          customers: { name: 'sin teléfono', phone: '' },
        }),
      ],
      NOW
    );
    expect(roster).toHaveLength(1);
    expect(roster[0].total).toBe(2);
  });
});

describe('customerTenure', () => {
  const rec = (over: Partial<CustomerRecord>) =>
    customerTenure(
      {
        key: 'k',
        name: 'x',
        phone: null,
        email: null,
        completed: 0,
        visits: 0,
        noShows: 0,
        cancelled: 0,
        upcoming: 0,
        total: 0,
        lastVisit: null,
        nextVisit: null,
        favouriteService: null,
        ...over,
      },
      NOW,
      TZ
    );

  it('calls a first-time booking new', () => {
    expect(rec({ total: 1, upcoming: 1, nextVisit: '2026-10-01T16:00:00.000Z' })).toBe('nuevo');
  });

  it('calls someone with history and nothing booked in 90 days inactive', () => {
    expect(rec({ total: 4, completed: 4, lastVisit: '2026-03-01T16:00:00.000Z' })).toBe('inactivo');
  });

  it('does not call someone inactive when they have an appointment booked', () => {
    expect(
      rec({
        total: 4,
        completed: 4,
        lastVisit: '2026-03-01T16:00:00.000Z',
        nextVisit: '2026-10-01T16:00:00.000Z',
      })
    ).toBe('recurrente');
  });

  it('calls a recent repeat customer recurrente', () => {
    expect(rec({ total: 3, completed: 3, visits: 3, lastVisit: '2026-09-15T16:00:00.000Z' })).toBe(
      'recurrente'
    );
  });

  // Someone who booked twice and cancelled both times has a history
  // worth seeing, and calling them "nuevo" forever would hide it.
  it('does not call someone new once they have booked more than once', () => {
    expect(rec({ total: 2, cancelled: 2 })).toBe('nuevo');
    expect(rec({ total: 2, completed: 2, visits: 2, lastVisit: '2026-09-15T16:00:00.000Z' })).toBe(
      'recurrente'
    );
  });
});
