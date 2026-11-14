import { describe, expect, it } from 'vitest';
import { filtrarDirectorio, giroNombre, opcionesDirectorio, ordenarPorDistancia, slugDirectorio, type NegocioDirectorio } from './directorio';

const n = (slug: string, ciudad: string, vertical: string, lat: number | null, lng: number | null): NegocioDirectorio => ({
  slug, name: slug, vertical, logoUrl: null, ciudad, colonia: null, lat, lng,
});

describe('slugDirectorio', () => {
  it('quita acentos, espacios y mayúsculas', () => {
    expect(slugDirectorio('San Juan del Río')).toBe('san-juan-del-rio');
    expect(slugDirectorio('  Gómez Palacio ')).toBe('gomez-palacio');
    expect(slugDirectorio('Ciudad de México (CDMX)')).toBe('ciudad-de-mexico-cdmx');
    expect(slugDirectorio('peluqueria')).toBe('peluqueria');
  });
});

describe('giroNombre', () => {
  it('usa el plural para los títulos y cae a algo legible si no lo conoce', () => {
    expect(giroNombre('peluqueria', true)).toBe('Estéticas');
    expect(giroNombre('tatuajes')).toBe('Tatuajes');
  });
});

describe('ordenarPorDistancia', () => {
  it('pone el más cercano primero y los sin pin al final', () => {
    const durango = { lat: 24.0277, lng: -104.6532 };
    const lista = [
      n('sin-pin', 'Durango', 'spa', null, null),
      n('torreon', 'Torreón', 'spa', 25.5428, -103.4068),
      n('centro', 'Durango', 'spa', 24.025, -104.67),
    ];
    const r = ordenarPorDistancia(lista, durango);
    expect(r.map((x) => x.slug)).toEqual(['centro', 'torreon', 'sin-pin']);
    expect(r[0].km!).toBeLessThan(3);
    expect(r[1].km!).toBeGreaterThan(150);
    expect(r[2].km).toBeNull();
  });
});

describe('filtrarDirectorio / opcionesDirectorio', () => {
  const lista = [n('a', 'Durango', 'peluqueria', 1, 1), n('b', 'durango ', 'spa', 1, 1), n('c', 'Gómez Palacio', 'spa', 1, 1)];
  it('filtra por slug de ciudad y giro', () => {
    expect(filtrarDirectorio(lista, { ciudad: 'durango' }).map((x) => x.slug)).toEqual(['a', 'b']);
    expect(filtrarDirectorio(lista, { giro: 'spa' }).map((x) => x.slug)).toEqual(['b', 'c']);
    expect(filtrarDirectorio(lista, { ciudad: 'durango', giro: 'spa' }).map((x) => x.slug)).toEqual(['b']);
  });
  it('agrupa ciudades escritas distinto en una sola', () => {
    const { ciudades, giros } = opcionesDirectorio(lista);
    expect(ciudades).toEqual([
      { slug: 'durango', nombre: 'Durango', total: 2 },
      { slug: 'gomez-palacio', nombre: 'Gómez Palacio', total: 1 },
    ]);
    expect(giros.map((g) => g.slug)).toEqual(['peluqueria', 'spa']);
  });
});
