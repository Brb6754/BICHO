import { describe, expect, it } from 'vitest';
import { slugError, slugify } from './slug';

describe('slugify', () => {
  it('quita acentos, signos y espacios', () => {
    expect(slugify('Barbería El Punto')).toBe('barberia-el-punto');
    expect(slugify('  Uñas & Más!! ')).toBe('unas-mas');
    expect(slugify('--a  -- b--')).toBe('a-b');
  });

  it('corta en el máximo sin dejar guion al final', () => {
    const s = slugify('a'.repeat(39) + ' bcdef');
    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('slugError', () => {
  it('acepta un slug normal', () => {
    expect(slugError('lima-laca')).toBeNull();
  });

  it('rechaza formato inválido', () => {
    expect(slugError('Mi-Negocio')).not.toBeNull();
    expect(slugError('-abc')).not.toBeNull();
    expect(slugError('abc-')).not.toBeNull();
    expect(slugError('a--b')).not.toBeNull();
    expect(slugError('ab')).not.toBeNull();
    expect(slugError('a'.repeat(41))).not.toBeNull();
  });

  it('rechaza subdominios reservados', () => {
    for (const s of ['admin', 'vendedores', 'reservas', 'www', 'api', 'choose', 'punto-y-fiesta']) {
      expect(slugError(s)).not.toBeNull();
    }
  });
});
