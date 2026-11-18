import { describe, expect, it } from 'vitest';
import { instantFromLocal } from '@/lib/dates/tenantTime';
import {
  colorPersona,
  fechaDeParam,
  horaDelToque,
  horasVisibles,
  mesDe,
  moverFecha,
  posicionar,
  rangoDeCarga,
  semanaDe,
  tituloPeriodo,
} from './calendario';
import { demoAgendaDeNegocio } from '@/lib/demo/panelFixtures';

const TZ = 'America/Mexico_City';
const cita = (dia: string, ini: string, fin: string, id = ini) => ({
  id,
  starts_at: instantFromLocal(dia, ini, TZ),
  ends_at: instantFromLocal(dia, fin, TZ),
});

describe('semanas y meses', () => {
  it('la semana va de lunes a domingo', () => {
    // 17 nov 2026 es martes.
    expect(semanaDe('2026-11-17')).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
  });

  it('el mes trae semanas completas y empieza en lunes', () => {
    const m = mesDe('2026-11-17');
    expect(m[0][0]).toBe('2026-10-26');
    expect(m[m.length - 1][6]).toBe('2026-12-06');
    expect(m.every((s) => s.length === 7)).toBe(true);
  });

  it('el rango de carga cubre una semana que cruza de mes', () => {
    const r = rangoDeCarga('2026-11-30');
    const semana = semanaDe('2026-11-30');
    expect(r.desde <= semana[0] && r.hasta >= semana[6]).toBe(true);
  });

  it('moverFecha avanza un día, una semana o un mes', () => {
    expect(moverFecha('2026-12-31', 'dia', 1)).toBe('2027-01-01');
    expect(moverFecha('2026-11-17', 'semana', -1)).toBe('2026-11-10');
    expect(moverFecha('2027-01-31', 'mes', 1)).toBe('2027-02-28');
  });

  it('fechaDeParam rechaza fechas que no existen', () => {
    expect(fechaDeParam('2026-02-30', '2026-11-17')).toBe('2026-11-17');
    expect(fechaDeParam('hola', '2026-11-17')).toBe('2026-11-17');
    expect(fechaDeParam('2026-12-24', '2026-11-17')).toBe('2026-12-24');
  });
});

describe('línea de tiempo', () => {
  it('se estira para no cortar citas tempranas o tardías', () => {
    expect(horasVisibles([], TZ)).toEqual({ desde: 9, hasta: 19 });
    expect(horasVisibles([cita('2026-11-17', '07:30', '08:15'), cita('2026-11-17', '19:30', '20:10')], TZ)).toEqual({
      desde: 7,
      hasta: 21,
    });
  });

  it('coloca cada cita en minutos desde el inicio visible', () => {
    const [b] = posicionar([cita('2026-11-17', '10:30', '11:15')], TZ, 9);
    expect(b).toMatchObject({ inicio: 90, duracion: 45, carril: 0, carriles: 1 });
  });

  it('reparte las encimadas en carriles y deja solas a las que no se tocan', () => {
    const bs = posicionar(
      [
        cita('2026-11-17', '10:00', '11:00', 'a'),
        cita('2026-11-17', '10:30', '11:30', 'b'),
        cita('2026-11-17', '11:00', '12:00', 'c'),
        cita('2026-11-17', '13:00', '14:00', 'd'),
      ],
      TZ,
      9
    );
    const de = (id: string) => bs.find((b) => b.cita.id === id)!;
    expect(de('a')).toMatchObject({ carril: 0, carriles: 2 });
    expect(de('b')).toMatchObject({ carril: 1, carriles: 2 });
    // c empieza cuando a termina: reusa su carril.
    expect(de('c')).toMatchObject({ carril: 0, carriles: 2 });
    expect(de('d')).toMatchObject({ carril: 0, carriles: 1 });
  });

  it('un toque cae en su media hora', () => {
    expect(horaDelToque(0, 88, 9)).toBe('09:00');
    expect(horaDelToque(50, 88, 9)).toBe('09:30');
    expect(horaDelToque(88 * 3 + 10, 88, 9)).toBe('12:00');
  });

  it('cada persona tiene un color y se repiten en ciclo', () => {
    expect(colorPersona(0)).not.toBe(colorPersona(1));
    expect(colorPersona(8)).toBe(colorPersona(0));
  });
});

describe('títulos', () => {
  it('nombra el mes y la semana en español', () => {
    expect(tituloPeriodo('2026-11-17', 'mes')).toBe('Noviembre 2026');
    expect(tituloPeriodo('2026-11-17', 'semana')).toBe('16 – 22 de noviembre');
    expect(tituloPeriodo('2026-12-01', 'semana')).toMatch(/^30 nov.* – 6 dic/);
  });
});

describe('agenda de la demo', () => {
  it('solo pone citas dentro del horario de quien atiende', () => {
    const resources = [
      { id: 'r1', name: 'Renata' },
      { id: 'r2', name: 'Paola' },
    ];
    // Renata de 10 a 14 entre semana; Paola no tiene horario.
    const schedules = [1, 2, 3, 4, 5].map((d) => ({ resource_id: 'r1', day_of_week: d, starts_at: '10:00:00', ends_at: '14:00:00' }));
    const citas = demoAgendaDeNegocio(
      { slug: 'x', timezone: TZ, services: [{ id: 's', name: 'Corte', duration_minutes: 45 }], resources, schedules },
      new Date('2026-11-18T18:00:00Z')
    );
    expect(citas.length).toBeGreaterThan(0);
    for (const c of citas) {
      expect(c.resource_id).toBe('r1');
      const local = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', weekday: 'short' }).format(new Date(c.starts_at));
      expect(local).not.toMatch(/Sat|Sun/);
      const [h, m] = local.split(' ')[1].split(':').map(Number);
      expect(h * 60 + m).toBeGreaterThanOrEqual(600);
      expect(h * 60 + m + 45).toBeLessThanOrEqual(840);
    }
  });
});
