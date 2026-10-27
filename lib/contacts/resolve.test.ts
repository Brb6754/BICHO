import { describe, it, expect } from 'vitest';
import { normalizeContactPhone } from './resolve';

describe('normalizeContactPhone', () => {
  it('reduce a dígitos las formas que la gente teclea de verdad', () => {
    // Las cuatro tienen que resolver al MISMO contacto. Si no, cada
    // forma de escribir el número crea una persona nueva, que es el
    // problema que contacts vino a resolver.
    const esperado = '6181234567';
    expect(normalizeContactPhone('6181234567')).toBe(esperado);
    expect(normalizeContactPhone('618 123 4567')).toBe(esperado);
    expect(normalizeContactPhone('618-123-4567')).toBe(esperado);
    expect(normalizeContactPhone('(618) 123 4567')).toBe(esperado);
  });

  it('conserva el 52 de lada, porque cambia a quién llamas', () => {
    // No se recorta a 10 dígitos: +52 618… y 618… podrían ser la misma
    // persona, pero adivinarlo sería fusionar dos contactos sin que
    // nadie lo pidiera. Mejor dos fichas que una fusión equivocada.
    expect(normalizeContactPhone('+52 618 123 4567')).toBe('526181234567');
  });

  it('una cadena sin dígitos es null, no una llave vacía', () => {
    // Si devolviera '', todos los contactos sin teléfono chocarían
    // contra el mismo índice único y serían "la misma persona".
    expect(normalizeContactPhone('')).toBeNull();
    expect(normalizeContactPhone('   ')).toBeNull();
    expect(normalizeContactPhone('sin teléfono')).toBeNull();
    expect(normalizeContactPhone(null)).toBeNull();
    expect(normalizeContactPhone(undefined)).toBeNull();
  });
});
