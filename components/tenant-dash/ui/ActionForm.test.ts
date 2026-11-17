import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.fn();
vi.mock('./Toast', () => ({ toast: (...a: unknown[]) => toast(...a) }));

const { ActionForm, correrConAviso, mensajeDeError } = await import('./ActionForm');

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

// P0 de UX-PANEL: si el guardado falla, lo escrito NO se borra. El form
// solo se limpia cuando correrConAviso devuelve true.
describe('ActionForm no borra lo escrito si falla', () => {
  beforeEach(() => toast.mockClear());

  it('con error: avisa en español y devuelve false (no se pide reset)', async () => {
    const fd = new FormData();
    fd.set('name', 'Corte');
    const ok = await correrConAviso(
      async () => {
        throw new Error('Pon cuántos minutos dura, por ejemplo 45.');
      },
      fd,
      'Servicio agregado'
    );
    expect(ok).toBe(false);
    expect(toast).toHaveBeenCalledWith('Pon cuántos minutos dura, por ejemplo 45.', 'error');
    expect(fd.get('name')).toBe('Corte');
  });

  it('bien: confirma y devuelve true (ahí sí se limpia)', async () => {
    const action = vi.fn();
    const fd = new FormData();
    expect(await correrConAviso(action, fd, 'Servicio agregado')).toBe(true);
    expect(action).toHaveBeenCalledWith(fd);
    expect(toast).toHaveBeenCalledWith('Servicio agregado');
  });

  it('deja pasar redirect() / notFound()', async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/x;307;' });
    await expect(
      correrConAviso(() => Promise.reject(redirect), new FormData(), 'x')
    ).rejects.toBe(redirect);
    expect(toast).not.toHaveBeenCalled();
  });

  it('no usa <form action>: con eso React 19 resetea el form aunque la action falle', () => {
    const html = renderToStaticMarkup(
      createElement(ActionForm, { action: async () => {}, children: createElement('input', { name: 'name' }) })
    );
    expect(html).toMatch(/^<form/);
    expect(html).not.toMatch(/\saction=/);
  });
});
