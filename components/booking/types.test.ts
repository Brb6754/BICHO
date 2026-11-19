import { describe, expect, it } from 'vitest';
import { slugDelCodigo } from '@/lib/whatsapp/agente/ruteo';
import { contactoHref, textoAgendaWhatsApp } from './types';

describe('botón "Agenda por WhatsApp"', () => {
  it('el texto prellenado rutea al negocio correcto', () => {
    expect(slugDelCodigo(textoAgendaWhatsApp('lima-laca'))).toBe('lima-laca');
    expect(slugDelCodigo(textoAgendaWhatsApp('casa-luma-2'))).toBe('casa-luma-2');
  });
});

describe('contactoHref', () => {
  it('10 dígitos por WhatsApp lleva lada 52; llamada usa tel:', () => {
    expect(contactoHref({ phone: '6181234567', kind: 'whatsapp' })).toBe('https://wa.me/526181234567');
    expect(contactoHref({ phone: '6181234567', kind: 'call' })).toBe('tel:6181234567');
  });
});
