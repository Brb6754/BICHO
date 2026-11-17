import { describe, expect, it } from 'vitest';
import { montoEnPantalla, teclear } from './piezas';

const escribir = (teclas: string[]) => teclas.reduce(teclear, '');

describe('teclado de montos', () => {
  it('escribe pesos y centavos con un solo punto y hasta 2 decimales', () => {
    expect(escribir(['1', '2', '5', '0', '.', '5', '0', '9'])).toBe('1250.50');
    expect(escribir(['3', '.', '.', '5'])).toBe('3.5');
  });

  it('un punto al inicio pone el cero; un cero al inicio se reemplaza', () => {
    expect(escribir(['.', '5'])).toBe('0.5');
    expect(escribir(['0', '7'])).toBe('7');
  });

  it('borrar quita la última tecla y no truena con el monto vacío', () => {
    expect(escribir(['4', '5', 'borrar'])).toBe('4');
    expect(escribir(['borrar'])).toBe('');
  });

  it('no pasa de 7 cifras de pesos', () => {
    expect(escribir(['9', '9', '9', '9', '9', '9', '9', '9'])).toBe('9999999');
  });

  it('en pantalla lleva comas sin perder lo que va escribiendo', () => {
    expect(montoEnPantalla('')).toBe('0');
    expect(montoEnPantalla('1250.')).toBe('1,250.');
    expect(montoEnPantalla('1250.5')).toBe('1,250.5');
  });
});
