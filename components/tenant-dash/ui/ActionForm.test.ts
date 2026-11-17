import { describe, expect, it } from 'vitest';
import { mensajeDeError } from './ActionForm';

describe('mensajeDeError', () => {
  it('enseña nuestros mensajes en español tal cual', () => {
    expect(mensajeDeError(new Error('Falta el nombre del servicio.'))).toBe('Falta el nombre del servicio.');
  });

  it('nunca enseña el genérico en inglés que Next pone en producción', () => {
    const prod = new Error(
      'An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details.'
    );
    expect(mensajeDeError(prod)).toMatch(/^No se pudo guardar/);
    expect(mensajeDeError(undefined)).toMatch(/^No se pudo guardar/);
  });
});
