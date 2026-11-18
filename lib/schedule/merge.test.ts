import { describe, it, expect } from 'vitest';
import { mergeRanges, mismosRangos, hhmm, planDia } from './merge';

const r = (a: string, b: string) => ({ starts_at: a, ends_at: b });

describe('mergeRanges', () => {
  it('une un rango contenido dentro de otro', () => {
    // El caso reportado: 09:00–20:00 con 10:00–18:00 encima ofrecía cada
    // hora de la tarde dos veces en la página de reservas.
    expect(mergeRanges([r('09:00', '20:00'), r('10:00', '18:00')])).toEqual([r('09:00', '20:00')]);
  });

  it('une dos rangos que se solapan parcialmente', () => {
    expect(mergeRanges([r('09:00', '14:00'), r('13:00', '18:00')])).toEqual([r('09:00', '18:00')]);
  });

  it('une dos rangos que apenas se tocan', () => {
    // Abierto de corrido, no dos turnos.
    expect(mergeRanges([r('09:00', '14:00'), r('14:00', '18:00')])).toEqual([r('09:00', '18:00')]);
  });

  it('CONSERVA un turno partido de verdad', () => {
    // Lo que hace que unir sea seguro y reemplazar no: aquí no hay
    // solape, así que la mañana no se pierde.
    expect(mergeRanges([r('09:00', '14:00'), r('16:00', '20:00')])).toEqual([
      r('09:00', '14:00'),
      r('16:00', '20:00'),
    ]);
  });

  it('ordena aunque lleguen al revés', () => {
    expect(mergeRanges([r('16:00', '20:00'), r('09:00', '14:00')])).toEqual([
      r('09:00', '14:00'),
      r('16:00', '20:00'),
    ]);
  });

  it('acepta el formato de Postgres y lo normaliza', () => {
    expect(mergeRanges([r('09:00:00', '20:00:00')])).toEqual([r('09:00', '20:00')]);
  });

  it('descarta un rango invertido o vacío', () => {
    expect(mergeRanges([r('18:00', '09:00'), r('10:00', '10:00')])).toEqual([]);
  });

  it('une tres rangos encadenados en uno solo', () => {
    expect(mergeRanges([r('09:00', '12:00'), r('11:00', '15:00'), r('14:00', '20:00')])).toEqual([
      r('09:00', '20:00'),
    ]);
  });

  it('deja en paz una lista que ya está bien', () => {
    const ya = [r('09:00', '20:00')];
    expect(mergeRanges(ya)).toEqual(ya);
  });
});

describe('mismosRangos', () => {
  it('no le importa el orden', () => {
    expect(mismosRangos([r('16:00', '20:00'), r('09:00', '14:00')], [r('09:00', '14:00'), r('16:00', '20:00')])).toBe(
      true
    );
  });

  it('compara ignorando los segundos de Postgres', () => {
    expect(mismosRangos([r('09:00:00', '20:00:00')], [r('09:00', '20:00')])).toBe(true);
  });

  it('distingue listas distintas', () => {
    expect(mismosRangos([r('09:00', '20:00')], [r('10:00', '18:00')])).toBe(false);
    expect(mismosRangos([r('09:00', '20:00')], [])).toBe(false);
  });
});

describe('hhmm', () => {
  it('recorta los segundos y los espacios', () => {
    expect(hhmm(' 09:00:00 ')).toBe('09:00');
    expect(hhmm('09:00')).toBe('09:00');
  });
});

describe('planDia (cambiar horas sin dejar el día vacío)', () => {
  const f = (id: string, a: string, b: string) => ({ id, starts_at: `${a}:00`, ends_at: `${b}:00` });

  it('cambiar 09–18 por 10–17 inserta la nueva y borra la vieja (en ese orden lo aplica el servidor)', () => {
    expect(planDia([f('a', '09:00', '18:00')], [r('10:00', '17:00')])).toEqual({
      insertar: [r('10:00', '17:00')],
      borrarIds: ['a'],
    });
  });

  it('no toca la franja que no cambió en un turno partido', () => {
    const plan = planDia([f('m', '09:00', '14:00'), f('t', '16:00', '20:00')], [r('09:00', '14:00'), r('16:00', '19:00')]);
    expect(plan).toEqual({ insertar: [r('16:00', '19:00')], borrarIds: ['t'] });
  });

  it('sin cambios no escribe nada', () => {
    expect(planDia([f('a', '09:00', '18:00')], [r('09:00', '18:00')])).toEqual({ insertar: [], borrarIds: [] });
  });

  it('un duplicado exacto se borra y el original se queda', () => {
    expect(planDia([f('a', '09:00', '18:00'), f('b', '09:00', '18:00')], [r('09:00', '18:00')])).toEqual({
      insertar: [],
      borrarIds: ['b'],
    });
  });

  it('nunca deja el día sin horario si hay rangos deseados: lo que se borra ya está cubierto por lo insertado o lo que queda', () => {
    const existentes = [f('a', '09:00', '13:00'), f('b', '12:00', '18:00')];
    const deseados = mergeRanges([...existentes]);
    const { insertar, borrarIds } = planDia(existentes, deseados);
    const quedan = existentes.filter((e) => !borrarIds.includes(e.id));
    expect(mismosRangos([...quedan, ...insertar], deseados)).toBe(true);
  });
});
