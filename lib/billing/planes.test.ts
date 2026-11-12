import { describe, expect, it } from 'vitest';
import {
  CUPO_FUNDADOR,
  PLANES,
  banderasDelPlan,
  congelaFundador,
  mensajeTope,
  moduloIncluido,
  planDe,
  planMinimoPara,
  precioCheckout,
  precioMensual,
} from './planes';

describe('planes', () => {
  it('precios de lista', () => {
    expect([PLANES.esencial.precio, PLANES.negocio.precio, PLANES.pro.precio]).toEqual([299, 499, 799]);
  });

  it('planDe: lo desconocido (standard de db/006) es null', () => {
    expect(planDe('pro')).toBe('pro');
    expect(planDe('standard')).toBeNull();
    expect(planDe(undefined)).toBeNull();
    expect(planDe('toString')).toBeNull();
  });

  it('cada plan incluye al anterior; resico gratis en todos', () => {
    expect(moduloIncluido('esencial', 'reservas')).toBe(true);
    expect(moduloIncluido('esencial', 'resico')).toBe(true);
    expect(moduloIncluido('esencial', 'caja')).toBe(false);
    expect(moduloIncluido('negocio', 'caja')).toBe(true);
    expect(moduloIncluido('negocio', 'copiloto')).toBe(false);
    expect(moduloIncluido('pro', 'facturacion')).toBe(true);
    expect(moduloIncluido('pro', 'inventario')).toBe(true);
  });

  it('sin plan nuevo nada se bloquea; posts no depende del plan', () => {
    expect(moduloIncluido(null, 'copiloto')).toBe(true);
    expect(moduloIncluido('esencial', 'posts')).toBe(true);
  });

  it('planMinimoPara da el texto "incluido en <Plan>"', () => {
    expect(planMinimoPara('lealtad')).toBe('negocio');
    expect(planMinimoPara('cotizaciones')).toBe('pro');
    expect(planMinimoPara('reservas')).toBe('esencial');
  });

  it('banderasDelPlan prende lo incluido y apaga lo demás, sin tocar posts', () => {
    const b = banderasDelPlan('negocio');
    expect(b.caja_enabled).toBe(true);
    expect(b.resico_enabled).toBe(true);
    expect(b.quotes_enabled).toBe(false);
    expect(b.copiloto_enabled).toBe(false);
    expect('posts_enabled' in b).toBe(false);
  });
});

describe('precio fundador', () => {
  it('precioMensual: fundador solo aplica a Negocio', () => {
    expect(precioMensual('negocio', 299)).toBe(299);
    expect(precioMensual('pro', 299)).toBe(799);
    expect(precioMensual(null)).toBe(299);
  });

  it('checkout de Negocio ofrece $299 mientras haya cupo', () => {
    expect(precioCheckout('negocio', null, 0)).toEqual({ monto: 299, fundador: true });
    expect(precioCheckout('negocio', null, CUPO_FUNDADOR - 1)).toEqual({ monto: 299, fundador: true });
    expect(precioCheckout('negocio', null, CUPO_FUNDADOR)).toEqual({ monto: 499, fundador: false });
    expect(precioCheckout('negocio', 299, CUPO_FUNDADOR)).toEqual({ monto: 299, fundador: true });
    expect(precioCheckout('pro', null, 0)).toEqual({ monto: 799, fundador: false });
  });

  it('congelaFundador solo con cobro de $299 en Negocio y cupo libre', () => {
    expect(congelaFundador('negocio', null, 299, 5)).toBe(true);
    expect(congelaFundador('negocio', null, 499, 5)).toBe(false);
    expect(congelaFundador('negocio', 299, 299, 5)).toBe(false);
    expect(congelaFundador('esencial', null, 299, 5)).toBe(false);
    expect(congelaFundador('negocio', null, 299, CUPO_FUNDADOR)).toBe(false);
    expect(congelaFundador('negocio', null, null, 0)).toBe(false);
  });
});

describe('topes', () => {
  it('mensaje amable solo al llegar al tope', () => {
    expect(mensajeTope(499, 500, 'copiloto')).toBeNull();
    expect(mensajeTope(500, 500, 'copiloto')).toMatch(/500 preguntas/);
    expect(mensajeTope(100, 100, 'timbres')).toMatch(/100 facturas/);
  });
});
