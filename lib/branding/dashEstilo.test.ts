import { describe, expect, it } from 'vitest';
import { ESTILOS, estiloDe } from './dashEstilo';

describe('estiloDe', () => {
  it('acepta los cuatro estilos', () => {
    for (const e of ESTILOS) expect(estiloDe(e.id)).toBe(e.id);
  });
  it('cae a clasico con cualquier otra cosa (columna sin migrar, query manipulada)', () => {
    for (const v of [undefined, null, '', 'POSTER', 'neon', 3, {}]) expect(estiloDe(v)).toBe('clasico');
  });
});
