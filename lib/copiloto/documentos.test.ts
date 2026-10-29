import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));
import { fragmentar, tipoDeArchivo } from './documentos';

describe('fragmentar', () => {
  it('un texto corto es un solo fragmento', () => {
    expect(fragmentar('Garantía de 25 años en paneles.')).toEqual(['Garantía de 25 años en paneles.']);
  });

  it('un texto largo se parte con solape y sin perder el final', () => {
    const oraciones = Array.from({ length: 60 }, (_, i) => `Oración número ${i} sobre paneles solares.`).join(' ');
    const fs = fragmentar(oraciones);
    expect(fs.length).toBeGreaterThan(1);
    expect(fs.every((f) => f.length <= 900)).toBe(true);
    expect(fs.at(-1)).toContain('Oración número 59');
    // solape: el inicio de cada fragmento ya apareció al final del anterior
    for (let i = 1; i < fs.length; i++) expect(fs[i - 1]).toContain(fs[i].slice(0, 20));
  });

  it('texto vacío o solo espacios no da fragmentos', () => {
    expect(fragmentar('   \n\n  ')).toEqual([]);
  });
});

describe('tipoDeArchivo', () => {
  it.each([
    ['Lista de precios.PDF', 'pdf'],
    ['garantia.docx', 'docx'],
    ['notas.md', 'txt'],
    ['foto.jpg', null],
    ['viejo.doc', null],
  ])('%s → %s', (n, t) => expect(tipoDeArchivo(n)).toBe(t));
});
