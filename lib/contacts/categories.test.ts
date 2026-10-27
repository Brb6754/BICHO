import { describe, it, expect } from 'vitest';
import { categorize, pendientes, type CategoriaKey } from './categories';
import type { DirectoryEntry } from './directory';

function c(over: Partial<DirectoryEntry> & { id: string }): DirectoryEntry {
  return {
    name: over.id,
    phone: null,
    email: null,
    tags: [],
    hasNotes: false,
    hasRfc: false,
    visits: 3,
    noShows: 0,
    nextVisit: null,
    lastVisit: '2026-10-01T16:00:00Z',
    openQuotes: 0,
    acceptedQuotes: 0,
    stampedInvoices: 0,
    tenure: 'recurrente',
    ...over,
  };
}

const keys = (entries: DirectoryEntry[]): CategoriaKey[] =>
  categorize(entries).map((x) => x.key);

describe('categorize', () => {
  it('no devuelve secciones vacías', () => {
    expect(keys([c({ id: 'a' })])).toEqual(['frecuentes']);
  });

  it('ordena las secciones por urgencia, no por tamaño', () => {
    const cats = keys([
      c({ id: 'frec' }),
      c({ id: 'nuevo', tenure: 'nuevo', visits: 1 }),
      c({ id: 'frio', tenure: 'inactivo' }),
      c({ id: 'debe', openQuotes: 1 }),
    ]);
    expect(cats).toEqual(['sinContestar', 'seEnfriaron', 'nuevos', 'frecuentes']);
  });

  // La propiedad que hace que los contadores signifiquen algo.
  it('cada persona cae en exactamente una categoría', () => {
    const gente = [
      c({ id: 'todo', openQuotes: 2, noShows: 1, tenure: 'inactivo', nextVisit: '2026-11-01T16:00:00Z' }),
      c({ id: 'simple' }),
      c({ id: 'nuevo', tenure: 'nuevo', visits: 1 }),
    ];
    const cats = categorize(gente);
    const todos = cats.flatMap((x) => x.entries.map((e) => e.id));
    expect(todos).toHaveLength(gente.length);
    expect(new Set(todos).size).toBe(gente.length);
  });

  it('gana la razón más urgente cuando varias aplican', () => {
    // Debe una respuesta Y faltó Y se enfrió: la cotización manda,
    // porque es la que se enfría en días y no en meses.
    const cats = categorize([
      c({ id: 'x', openQuotes: 1, noShows: 2, tenure: 'inactivo' }),
    ]);
    expect(cats).toHaveLength(1);
    expect(cats[0].key).toBe('sinContestar');
  });

  it('una cita agendada no saca a nadie de una lista accionable', () => {
    // Tener cita el jueves no borra que te deben una respuesta.
    const cats = categorize([
      c({ id: 'x', openQuotes: 1, nextVisit: '2026-11-01T16:00:00Z' }),
    ]);
    expect(cats[0].key).toBe('sinContestar');
  });

  it('"vienen pronto" gana sobre "apenas te conocen"', () => {
    // Alguien con una sola visita pero con cita agendada ya no es un
    // pendiente de reactivación: es alguien que vuelve el jueves.
    const cats = categorize([
      c({ id: 'x', tenure: 'nuevo', visits: 1, nextVisit: '2026-11-01T16:00:00Z' }),
    ]);
    expect(cats[0].key).toBe('vienenPronto');
  });

  it('un prospecto sin ninguna visita entra en "apenas te conocen"', () => {
    const cats = categorize([c({ id: 'x', tenure: 'nuevo', visits: 0, lastVisit: null })]);
    expect(cats[0].key).toBe('nuevos');
  });

  it('un directorio vacío no devuelve secciones', () => {
    expect(categorize([])).toEqual([]);
  });
});

describe('pendientes', () => {
  it('solo cuenta las secciones accionables', () => {
    const cats = categorize([
      c({ id: 'debe', openQuotes: 1 }),
      c({ id: 'falto', noShows: 1 }),
      c({ id: 'frio', tenure: 'inactivo' }),
      c({ id: 'frec' }),
      c({ id: 'pronto', nextVisit: '2026-11-01T16:00:00Z' }),
    ]);
    expect(pendientes(cats)).toBe(3);
  });

  it('sin nada accionable es cero', () => {
    expect(pendientes(categorize([c({ id: 'a' })]))).toBe(0);
  });
});
