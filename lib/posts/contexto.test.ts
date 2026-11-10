import { describe, expect, it } from 'vitest';
import {
  armarPrompt,
  baseImagen,
  cantidadesEn,
  imagenUrl,
  inicioDeMes,
  inventaCantidades,
  lineasDeHorarios,
  precioMx,
  restantes,
  validarOpciones,
  type Contexto,
} from './contexto';

const ctx: Contexto = {
  negocio: 'Lima Laca',
  link: 'https://lima-laca.bicho.ai',
  tipo: 'servicio',
  formato: 'feed',
  servicios: [
    { nombre: 'Gelish', precioCents: 35000 },
    { nombre: 'Acrílico', precioCents: 55050 },
  ],
  servicio: { nombre: 'Gelish', precioCents: 35000, minutos: 60 },
};

describe('precios', () => {
  it('formatea pesos', () => {
    expect(precioMx(35000)).toBe('$350');
    expect(precioMx(55050)).toBe('$550.50');
    expect(precioMx(150000)).toBe('$1,500');
  });

  it('lee cantidades y porcentajes', () => {
    expect(cantidadesEn('Gelish $350, acrílico $1,500.5 y 20% off')).toEqual({ pesos: [350, 1500.5], porcentajes: [20] });
  });

  it('detecta precios y descuentos inventados', () => {
    expect(inventaCantidades('Gelish a $350 🙌', ctx)).toBe(false);
    expect(inventaCantidades('Acrílico $550.50', ctx)).toBe(false);
    expect(inventaCantidades('Gelish a $299', ctx)).toBe(true);
    expect(inventaCantidades('20% de descuento', ctx)).toBe(true);
    // El descuento sí viene de la promoción.
    expect(inventaCantidades('20% de descuento', { ...ctx, promo: { titulo: '20% en gelish', detalle: null, codigo: null, vigencia: 'hoy' } })).toBe(false);
  });
});

describe('armarPrompt', () => {
  it('lleva datos reales, el link y la regla de no inventar', () => {
    const { system, user } = armarPrompt(ctx);
    expect(system).toContain(ctx.link);
    expect(system).toMatch(/Nunca inventes precios/);
    expect(user).toContain('"precio": "$350"');
    expect(user).toContain('El servicio "Gelish" ($350, 60 min)');
  });

  it('sin horarios no pide horas concretas', () => {
    const { user } = armarPrompt({ ...ctx, tipo: 'horarios', horarios: [] });
    expect(user).toMatch(/no menciones horas/);
    const con = armarPrompt({ ...ctx, tipo: 'horarios', horarios: ['mar 11: 10:00, 12:30'] });
    expect(con.user).toContain('mar 11: 10:00, 12:30');
  });
});

describe('validarOpciones', () => {
  it('acepta JSON en texto, agrega el link y quita emojis del titular', () => {
    const r = validarOpciones(
      JSON.stringify({ opciones: [{ titular: 'Uñas listas ✨', texto: 'Gelish a $350' }, { titular: 'B', texto: `Hola ${ctx.link}` }] }),
      ctx
    );
    expect(r).toHaveLength(2);
    expect(r[0].titular).toBe('Uñas listas');
    expect(r[0].texto.endsWith(ctx.link)).toBe(true);
    expect(r[1].texto).toBe(`Hola ${ctx.link}`);
  });

  it('descarta repetidas, vacías e inventadas, y corta en 3', () => {
    const r = validarOpciones(
      {
        opciones: [
          { titular: 'a', texto: 'uno' },
          { titular: 'a', texto: 'uno' },
          { titular: 'b', texto: '' },
          { titular: 'c', texto: 'Promo $199' },
          { titular: 'd', texto: 'dos' },
          { titular: 'e', texto: 'tres' },
          { titular: 'f', texto: 'cuatro' },
        ],
      },
      ctx
    );
    expect(r.map((o) => o.texto.split('\n')[0])).toEqual(['uno', 'dos', 'tres']);
  });

  it('lanza si no queda nada usable', () => {
    expect(() => validarOpciones('no es json', ctx)).toThrow();
    expect(() => validarOpciones({ opciones: [{ titular: 'x', texto: '50% off' }] }, ctx)).toThrow();
    expect(() => validarOpciones({}, ctx)).toThrow();
  });
});

describe('límite mensual', () => {
  it('cuenta lo que queda', () => {
    expect(restantes(0)).toBe(30);
    expect(restantes(29)).toBe(1);
    expect(restantes(45)).toBe(0);
  });

  it('el mes empieza en la zona del negocio', () => {
    // 1 de dic 03:00 UTC = 30 de nov 21:00 en CDMX: sigue siendo noviembre.
    expect(inicioDeMes(new Date('2026-12-01T03:00:00Z'), 'America/Mexico_City')).toBe('2026-11-01T06:00:00.000Z');
    expect(inicioDeMes(new Date('2026-12-01T07:00:00Z'), 'America/Mexico_City')).toBe('2026-12-01T06:00:00.000Z');
  });
});

describe('imagen', () => {
  it('elige plantilla según lo que se anuncia', () => {
    expect(baseImagen(ctx).plantilla).toBe('precio');
    expect(baseImagen(ctx).precio).toBe('$350');
    expect(baseImagen({ ...ctx, tipo: 'horarios', horarios: ['a', 'b'] })).toMatchObject({ plantilla: 'horarios', lineas: ['a', 'b'] });
    expect(baseImagen({ ...ctx, tipo: 'fecha', fecha: 'Navidad' }).plantilla).toBe('temporada');
    expect(baseImagen({ ...ctx, tipo: 'promo', promo: null, lealtad: { sellos: 8, premio: 'Gratis' } })).toMatchObject({ plantilla: 'lealtad', sellos: 8 });
  });

  it('arma una URL acotada', () => {
    const u = new URL(imagenUrl('lima-laca', 'whatsapp', 'x'.repeat(200), baseImagen(ctx)), 'http://h');
    expect(u.pathname).toBe('/api/posts/imagen');
    expect(u.searchParams.get('f')).toBe('feed');
    expect(u.searchParams.get('t')).toHaveLength(70);
  });
});

describe('lineasDeHorarios', () => {
  it('agrupa por día local, quita pasados y repetidos', () => {
    const now = new Date('2026-11-10T18:00:00Z'); // 12:00 CDMX, martes
    const l = lineasDeHorarios(
      [
        '2026-11-10T16:00:00Z', // 10:00, ya pasó
        '2026-11-10T21:00:00Z', // 15:00
        '2026-11-10T21:00:00Z', // repetido (otra estilista)
        '2026-11-11T16:00:00Z',
        '2026-11-11T05:30:00Z', // 23:30 del martes en CDMX
      ],
      now,
      'America/Mexico_City'
    );
    expect(l).toEqual(['Mar 10: 15:00 · 23:30', 'Mié 11: 10:00']);
  });
});
