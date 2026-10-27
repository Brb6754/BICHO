import { describe, it, expect } from 'vitest';
import { buildDirectory, tenureOf, actionLists } from './directory';

const AHORA = new Date('2026-10-26T18:00:00Z');
const TZ = 'America/Mexico_City';

const dias = (n: number) => new Date(AHORA.getTime() + n * 86400000).toISOString();

const contacto = (id: string, name: string, extra = {}) => ({
  id,
  name,
  phone: null,
  email: null,
  tags: null,
  notes: null,
  rfc: null,
  ...extra,
});

describe('buildDirectory', () => {
  it('junta citas, cotizaciones y facturas bajo una sola persona', () => {
    // Lo que el roster viejo no podía hacer: la misma persona aparecía
    // una vez por cita y las cotizaciones no existían para él.
    const [e] = buildDirectory(
      [contacto('c1', 'María')],
      [
        { contact_id: 'c1', starts_at: dias(-30), status: 'completed' },
        { contact_id: 'c1', starts_at: dias(-10), status: 'confirmed' },
        { contact_id: 'c1', starts_at: dias(5), status: 'confirmed' },
      ],
      [{ contact_id: 'c1', status: 'sent' }],
      [{ contact_id: 'c1', status: 'stamped' }],
      AHORA,
      TZ
    );

    expect(e.visits).toBe(2); // la completada + la pasada en confirmed
    expect(e.nextVisit).toBe(dias(5));
    expect(e.openQuotes).toBe(1);
    expect(e.stampedInvoices).toBe(1);
  });

  it('una cita pasada en confirmed cuenta como visita', () => {
    // Nada podía escribir 'completed' antes de db/023: contar solo eso
    // mostraría a toda la clientela histórica como desconocidos.
    const [e] = buildDirectory(
      [contacto('c1', 'Ana')],
      [{ contact_id: 'c1', starts_at: dias(-3), status: 'confirmed' }],
      [],
      [],
      AHORA,
      TZ
    );
    expect(e.visits).toBe(1);
  });

  it('no_show y cancelled no cuentan como visita', () => {
    const [e] = buildDirectory(
      [contacto('c1', 'Luis')],
      [
        { contact_id: 'c1', starts_at: dias(-5), status: 'no_show' },
        { contact_id: 'c1', starts_at: dias(-6), status: 'cancelled' },
      ],
      [],
      [],
      AHORA,
      TZ
    );
    expect(e.visits).toBe(0);
    expect(e.noShows).toBe(1);
  });

  it('ignora filas sin contacto en vez de inventarle una persona', () => {
    // Lo creado antes de db/037 tiene contact_id null. Debe desaparecer
    // de esta vista, no aparecer como un contacto fantasma.
    const [e] = buildDirectory(
      [contacto('c1', 'Sofía')],
      [{ contact_id: null, starts_at: dias(-2), status: 'completed' }],
      [{ contact_id: null, status: 'sent' }],
      [],
      AHORA,
      TZ
    );
    expect(e.visits).toBe(0);
    expect(e.openQuotes).toBe(0);
  });

  it('ordena primero a quien dejó algo sin contestar', () => {
    const orden = buildDirectory(
      [contacto('a', 'Ana'), contacto('b', 'Beto')],
      [{ contact_id: 'a', starts_at: dias(-1), status: 'completed' }],
      [{ contact_id: 'b', status: 'viewed' }],
      [],
      AHORA,
      TZ
    ).map((e) => e.name);

    // Beto no ha venido nunca, pero tiene una cotización esperando
    // respuesta: ese es el renglón que hay que atender hoy.
    expect(orden[0]).toBe('Beto');
  });
});

describe('tenureOf', () => {
  it('una sola visita es "nuevo", no "cliente"', () => {
    expect(tenureOf({ visits: 1, lastVisit: dias(-2), nextVisit: null }, AHORA, TZ)).toBe('nuevo');
  });

  it('noventa días sin venir y sin nada agendado es "inactivo"', () => {
    expect(tenureOf({ visits: 4, lastVisit: dias(-120), nextVisit: null }, AHORA, TZ)).toBe(
      'inactivo'
    );
  });

  it('con una cita agendada NO es inactivo aunque lleve meses', () => {
    // Ya va a volver; ponerlo en la lista de "búscalo" sería mandarle un
    // mensaje a alguien que tiene cita el jueves.
    expect(tenureOf({ visits: 4, lastVisit: dias(-120), nextVisit: dias(3) }, AHORA, TZ)).toBe(
      'recurrente'
    );
  });

  it('quien solo cotizó, sin citas, es nuevo', () => {
    expect(tenureOf({ visits: 0, lastVisit: null, nextVisit: null }, AHORA, TZ)).toBe('nuevo');
  });
});

describe('actionLists', () => {
  it('separa las tres listas que generan trabajo', () => {
    const entries = buildDirectory(
      [contacto('a', 'Ana'), contacto('b', 'Beto'), contacto('c', 'Caro')],
      [
        { contact_id: 'b', starts_at: dias(-200), status: 'completed' },
        { contact_id: 'b', starts_at: dias(-190), status: 'completed' },
        { contact_id: 'c', starts_at: dias(-4), status: 'no_show' },
      ],
      [{ contact_id: 'a', status: 'sent' }],
      [],
      AHORA,
      TZ
    );

    const { sinContestar, noVuelven, noLlegaron } = actionLists(entries);
    expect(sinContestar.map((e) => e.name)).toEqual(['Ana']);
    expect(noVuelven.map((e) => e.name)).toEqual(['Beto']);
    expect(noLlegaron.map((e) => e.name)).toEqual(['Caro']);
  });
});
