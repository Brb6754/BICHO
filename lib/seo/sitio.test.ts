import { describe, expect, it } from 'vitest';
import { ldSoftware, urlOg, urlWhatsApp } from './sitio';
import { FUNCIONES } from './funciones';
import { GIROS } from './giros';
import { GUIAS } from './guias';

describe('SEO de bicho', () => {
  it('las ofertas del JSON-LD salen de planes.ts, en MXN', () => {
    const offers = ldSoftware('x').offers;
    expect(offers.map((o) => o.price)).toEqual(['299.00', '499.00', '799.00']);
    expect(offers.every((o) => o.priceCurrency === 'MXN')).toBe(true);
  });
  it('la imagen OG no repite la marca y escapa el título', () => {
    expect(urlOg('Caja · bicho')).toMatch(/\/og\?t=Caja$/);
    expect(urlOg('a&b')).toContain('a%26b');
  });
  it('el link de WhatsApp solo lleva dígitos', () => {
    expect(urlWhatsApp('+52 1 618 123 4567', 'hola')).toBe('https://wa.me/5216181234567?text=hola');
  });
  it('los enlaces cruzados apuntan a páginas que existen', () => {
    const f = new Set(FUNCIONES.map((x) => x.slug));
    const g = new Set(GIROS.map((x) => x.slug));
    const gu = new Set<string>(GUIAS.map((x) => x.slug));
    for (const x of FUNCIONES) {
      x.relacionadas.forEach((s) => expect(f.has(s), s).toBe(true));
      x.giros.forEach((s) => expect(g.has(s), s).toBe(true));
      x.guias.forEach((s) => expect(gu.has(s), s).toBe(true));
    }
    for (const x of GIROS) {
      x.funciones.forEach((s) => expect(f.has(s), s).toBe(true));
      x.guias.forEach((s) => expect(gu.has(s), s).toBe(true));
      x.solucion.forEach((s) => s.funcion && expect(f.has(s.funcion), s.funcion).toBe(true));
    }
  });
  it('títulos y descripciones únicos (nada de páginas plantilla)', () => {
    const titulos = [...FUNCIONES, ...GIROS].map((x) => x.titulo);
    const descs = [...FUNCIONES, ...GIROS].map((x) => x.descripcion);
    expect(new Set(titulos).size).toBe(titulos.length);
    expect(new Set(descs).size).toBe(descs.length);
  });
});
