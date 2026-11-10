import { describe, expect, it } from 'vitest';
import { estadoTarjeta, nuevoToken, promoVigente, tokenValido, waNumero } from './tarjeta';

describe('estadoTarjeta', () => {
  it('cuenta sellos hasta llenar', () => {
    expect(estadoTarjeta(4, 0, 6)).toEqual({ sellos: 4, requeridos: 6, completa: false, premiosPendientes: 0 });
  });

  it('al llegar a la regla queda completa', () => {
    const e = estadoTarjeta(6, 0, 6);
    expect(e.completa).toBe(true);
    expect(e.sellos).toBe(6);
  });

  it('el canje descuenta y la tarjeta vuelve a empezar', () => {
    expect(estadoTarjeta(8, 6, 6)).toMatchObject({ sellos: 2, completa: false });
  });

  it('acumula premios si no se canjea', () => {
    expect(estadoTarjeta(13, 0, 6)).toMatchObject({ premiosPendientes: 2, completa: true, sellos: 6 });
  });

  it('nunca baja de cero si se borró un sello ya canjeado', () => {
    expect(estadoTarjeta(5, 6, 6)).toMatchObject({ sellos: 0, completa: false });
  });
});

describe('token', () => {
  it('es 32 hex y no se repite', () => {
    const a = nuevoToken();
    const b = nuevoToken();
    expect(tokenValido(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('rechaza ids, vacíos y basura', () => {
    expect(tokenValido('')).toBe(false);
    expect(tokenValido('3f2b9c1e-0000-4000-8000-000000000000')).toBe(false);
    expect(tokenValido('Z'.repeat(32))).toBe(false);
    expect(tokenValido("' or 1=1 --")).toBe(false);
  });

  it('acepta el formato del trigger (uuid sin guiones)', () => {
    expect(tokenValido(crypto.randomUUID().replace(/-/g, ''))).toBe(true);
  });
});

describe('waNumero', () => {
  it('agrega lada de México a 10 dígitos', () => {
    expect(waNumero('618 112 4590')).toBe('526181124590');
    expect(waNumero('123')).toBeNull();
  });
});

describe('promoVigente', () => {
  const p = { active: true, starts_on: '2026-11-01', ends_on: '2026-11-15' };
  it('respeta el rango incluyendo bordes', () => {
    expect(promoVigente(p, '2026-11-01')).toBe(true);
    expect(promoVigente(p, '2026-11-15')).toBe(true);
    expect(promoVigente(p, '2026-11-16')).toBe(false);
    expect(promoVigente({ ...p, active: false }, '2026-11-05')).toBe(false);
  });
});
