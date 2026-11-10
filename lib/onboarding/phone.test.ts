import { describe, expect, it } from 'vitest';
import { normalizeMxWhatsapp } from './phone';

describe('normalizeMxWhatsapp', () => {
  it('normaliza formatos comunes a +52 y 10 dígitos', () => {
    for (const v of ['6181234567', '618 123 4567', '(618) 123-45-67', '+52 618 123 4567', '526181234567', '+521 618 123 4567']) {
      expect(normalizeMxWhatsapp(v)).toBe('+526181234567');
    }
  });

  it('rechaza lo que no son 10 dígitos de México', () => {
    for (const v of ['', '618123456', '61812345678', '0181234567', '+1 618 123 4567', '618-abc-4567', '1'.repeat(40)]) {
      expect(normalizeMxWhatsapp(v)).toBeNull();
    }
  });
});
