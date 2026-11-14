import { describe, expect, it } from 'vitest';
import { lineForDay, nowIn, openStatus, parseHours } from './openNow';

const LIMA = ['Martes a viernes: 10:00–20:00', 'Sábado: 10:00–18:00', 'Domingo y lunes: cerrado'];

describe('openStatus', () => {
  it('abierto dentro del rango', () => {
    expect(openStatus(LIMA, 3, 12 * 60)).toEqual({ open: true, label: 'Abierto · cierra 20:00' });
  });
  it('antes de abrir hoy', () => {
    expect(openStatus(LIMA, 6, 9 * 60)?.label).toBe('Cerrado · abre hoy 10:00');
  });
  it('salta los días cerrados', () => {
    expect(openStatus(LIMA, 6, 19 * 60)?.label).toBe('Cerrado · abre el martes 10:00');
    expect(openStatus(LIMA, 1, 12 * 60)?.label).toBe('Cerrado · abre mañana 10:00');
  });
  it('todos los días y rangos con guion simple', () => {
    expect(openStatus(['Todos los días: 9:00-20:00'], 0, 20 * 60)?.label).toBe('Cerrado · abre mañana 9:00');
  });
  it('turno partido', () => {
    const l = ['Lunes a viernes: 9:00–14:00 y 16:00–20:00', 'Sábado y domingo: cerrado'];
    expect(openStatus(l, 2, 15 * 60)?.label).toBe('Cerrado · abre hoy 16:00');
  });
  it('null ante texto que no entiende', () => {
    expect(parseHours(['Con cita previa'])).toBeNull();
    expect(openStatus(['Previa cita: llámanos'], 2, 600)).toBeNull();
  });
});

describe('lineForDay / nowIn', () => {
  it('ubica la línea del día', () => {
    expect(lineForDay(LIMA, 0)).toBe(2);
    expect(lineForDay(LIMA, 6)).toBe(1);
  });
  it('convierte a la hora del negocio', () => {
    // 2026-11-13T18:30Z es viernes 12:30 en Ciudad de México (UTC-6)
    expect(nowIn('America/Mexico_City', new Date('2026-11-13T18:30:00Z'))).toEqual({ weekday: 5, minutes: 750 });
  });
});
