import { describe, expect, it } from 'vitest';
import { coincide, porQue } from './ContactDirectory';
import type { DirectoryEntry } from '@/lib/contacts/directory';

const lupita = {
  id: '1',
  name: 'Lupita Pérez',
  phone: '618 123 4567',
  email: 'lupita@correo.mx',
} as DirectoryEntry;

describe('buscar una clienta', () => {
  it('encuentra por nombre sin importar acentos ni mayúsculas', () => {
    expect(coincide(lupita, 'perez')).toBe(true);
    expect(coincide(lupita, 'LUPI')).toBe(true);
    expect(coincide(lupita, 'Ana')).toBe(false);
  });

  it('encuentra por un pedazo del teléfono, con o sin espacios', () => {
    expect(coincide(lupita, '4567')).toBe(true);
    expect(coincide(lupita, '123 45')).toBe(true);
  });

  it('dos dígitos sueltos no bastan para buscar por teléfono', () => {
    expect(coincide(lupita, '18')).toBe(false);
  });

  it('sin texto, todas coinciden', () => {
    expect(coincide(lupita, '   ')).toBe(true);
  });
});

describe('por qué está en su sección', () => {
  const now = new Date('2026-11-17T18:00:00Z');
  const base = { ...lupita, visits: 3, noShows: 2, openQuotes: 0, lastVisit: '2026-10-20T17:00:00Z', nextVisit: null } as DirectoryEntry;

  it('dice cuántas faltas y cuándo fue la última', () => {
    const hist = [
      { starts_at: '2026-11-03T17:00:00Z', status: 'no_show' },
      { starts_at: '2026-10-20T17:00:00Z', status: 'completed' },
      { starts_at: '2026-09-01T17:00:00Z', status: 'no_show' },
    ];
    expect(porQue('noLlegaron', base, hist, now, 'America/Mexico_City')).toBe('No vino 2 veces · última falta: 3 nov');
  });

  it('a quien se enfrió le dice desde cuándo', () => {
    const fria = { ...base, lastVisit: '2026-06-10T17:00:00Z' } as DirectoryEntry;
    expect(porQue('seEnfriaron', fria, [], now, 'America/Mexico_City')).toBe('No viene desde hace 5 meses · última vez: 10 jun');
  });
});
