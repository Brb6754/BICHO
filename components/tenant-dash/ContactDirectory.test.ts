import { describe, expect, it } from 'vitest';
import { coincide } from './ContactDirectory';
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
