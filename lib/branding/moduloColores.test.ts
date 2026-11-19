import { describe, expect, it } from 'vitest';
import { COLOR_MODULO, contrasteTile, tilesDe, type ClaveColor } from './moduloColores';
import type { ProductosDelNegocio } from '@/lib/products';

const nada: ProductosDelNegocio = {
  reservas: false, cotizaciones: false, facturacion: false, reuniones: false, copiloto: false, caja: false,
  lealtad: false, regresan: false, posts: false, resico: false, comisiones: false, inventario: false, whatsapp: false, boost: false,
};

describe('moduloColores', () => {
  it('cada tile pasa AA (4.5:1) con el texto que elige', () => {
    for (const k of Object.keys(COLOR_MODULO) as ClaveColor[]) expect(contrasteTile(k)).toBeGreaterThanOrEqual(4.5);
  });

  it('un tile por módulo prendido, href sin /t/{slug}', () => {
    const t = tilesDe({ ...nada, reservas: true, caja: true }, '/dashboard', null);
    expect(t.map((x) => x.href)).toEqual(['/dashboard/calendar', '/dashboard/caja', '/dashboard/services', '/dashboard/anticipos']);
    expect(t.every((x) => !x.bloqueado)).toBe(true);
  });

  it('lo que el plan no incluye sale con candado y lleva a /plan', () => {
    const t = tilesDe({ ...nada, reservas: true, resico: true }, '/dashboard', 'esencial');
    const caja = t.find((x) => x.clave === 'caja');
    expect(caja).toMatchObject({ href: '/dashboard/plan', bloqueado: { plan: 'Negocio' } });
    expect(t.find((x) => x.clave === 'copiloto')?.bloqueado?.plan).toBe('Pro');
    // posts no depende del plan: apagado, no aparece.
    expect(t.some((x) => x.clave === 'posts')).toBe(false);
  });

  it('la demo (sin plan) no enseña candados', () => {
    expect(tilesDe({ ...nada, reservas: true }, '/panel', null, false).some((x) => x.bloqueado)).toBe(false);
  });
});
