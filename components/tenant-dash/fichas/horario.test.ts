import { describe, expect, it } from 'vitest';
import { reglaDe, resumirHorario } from './horario';

const f = (d: number, a: string, b: string) => ({ day_of_week: d, starts_at: a + ':00', ends_at: b + ':00' });

describe('resumirHorario', () => {
  it('junta los días seguidos con las mismas horas', () => {
    const lv = [1, 2, 3, 4, 5].map((d) => f(d, '09:00', '18:00'));
    expect(resumirHorario([...lv, f(6, '10:00', '14:00')])).toBe('Lun a Vie 9:00–18:00 · Sáb 10:00–14:00');
  });

  it('no junta días separados por uno cerrado', () => {
    expect(resumirHorario([f(1, '09:00', '18:00'), f(3, '09:00', '18:00')])).toBe('Lun 9:00–18:00 · Mié 9:00–18:00');
  });

  it('domingo va al final y el día partido se lee completo', () => {
    expect(resumirHorario([f(0, '10:00', '14:00'), f(1, '09:00', '14:00'), f(1, '16:00', '20:00')])).toBe(
      'Lun 9:00–14:00 y 16:00–20:00 · Dom 10:00–14:00'
    );
  });

  it('sin franjas', () => {
    expect(resumirHorario([])).toBe('Sin horario');
  });
});

describe('reglaDe', () => {
  it('cubre la primera y la última hora', () => {
    expect(reglaDe([f(1, '09:30', '14:00'), f(2, '10:00', '19:15')])).toEqual({ desde: 9, hasta: 20 });
  });
});
