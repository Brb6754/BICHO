import { describe, it, expect } from 'vitest';
import { buildEmbudo, type MeetingEntry } from './pipeline';

const AHORA = new Date('2026-10-26T18:00:00Z');

function reunion(over: Partial<MeetingEntry> & { id: string }): MeetingEntry {
  return {
    startsAt: '2026-10-20T16:00:00Z',
    endsAt: '2026-10-20T17:00:00Z',
    status: 'confirmed',
    tipo: 'Visita técnica',
    modality: 'sitio',
    contactName: 'Prospecto',
    contactId: null,
    company: null,
    phone: null,
    address: null,
    outcome: null,
    quoteId: null,
    ...over,
  };
}

describe('buildEmbudo', () => {
  it('manda a "sin capturar" lo que ya terminó y nadie resolvió', () => {
    const e = buildEmbudo([reunion({ id: 'a' })], AHORA);
    expect(e.sinCapturar.map((m) => m.id)).toEqual(['a']);
    expect(e.proximas).toHaveLength(0);
  });

  it('una reunión en curso todavía no pide resultado', () => {
    // Empezó hace 20 minutos y dura dos horas: sigue ocurriendo.
    const e = buildEmbudo(
      [
        reunion({
          id: 'encurso',
          startsAt: '2026-10-26T17:40:00Z',
          endsAt: '2026-10-26T19:40:00Z',
        }),
      ],
      AHORA
    );
    expect(e.sinCapturar).toHaveLength(0);
    expect(e.proximas.map((m) => m.id)).toEqual(['encurso']);
  });

  it('una cancelada no entra a ninguna lista', () => {
    const e = buildEmbudo([reunion({ id: 'x', status: 'cancelled' })], AHORA);
    expect(e.sinCapturar).toHaveLength(0);
    expect(e.proximas).toHaveLength(0);
    expect(e.porResultado.perdido).toHaveLength(0);
  });

  it('una cancelada con resultado tampoco cuenta', () => {
    const e = buildEmbudo(
      [reunion({ id: 'x', status: 'cancelled', outcome: 'ganado' })],
      AHORA
    );
    expect(e.porResultado.ganado).toHaveLength(0);
    expect(e.tasaCierre).toBeNull();
  });

  it('agrupa por resultado', () => {
    const e = buildEmbudo(
      [
        reunion({ id: 'a', outcome: 'ganado' }),
        reunion({ id: 'b', outcome: 'cotizado' }),
        reunion({ id: 'c', outcome: 'ganado' }),
      ],
      AHORA
    );
    expect(e.porResultado.ganado.map((m) => m.id).sort()).toEqual(['a', 'c']);
    expect(e.porResultado.cotizado.map((m) => m.id)).toEqual(['b']);
    expect(e.sinCapturar).toHaveLength(0);
  });

  it('la tasa de cierre solo cuenta las que ya tienen desenlace', () => {
    const e = buildEmbudo(
      [
        reunion({ id: 'a', outcome: 'ganado' }),
        reunion({ id: 'b', outcome: 'perdido' }),
        // Vivas: no pueden bajar la tasa de cierre.
        reunion({ id: 'c', outcome: 'interesado' }),
        reunion({ id: 'd', outcome: 'cotizado' }),
      ],
      AHORA
    );
    expect(e.tasaCierre).toBe(0.5);
  });

  it('sin reuniones cerradas la tasa es null, no cero', () => {
    // Cero diría "no cierras nada"; null dice "todavía no se sabe".
    const e = buildEmbudo([reunion({ id: 'c', outcome: 'interesado' })], AHORA);
    expect(e.tasaCierre).toBeNull();
  });

  it('las próximas salen de la más cercana a la más lejana', () => {
    const e = buildEmbudo(
      [
        reunion({ id: 'lejos', startsAt: '2026-11-10T16:00:00Z', endsAt: '2026-11-10T17:00:00Z' }),
        reunion({ id: 'cerca', startsAt: '2026-10-27T16:00:00Z', endsAt: '2026-10-27T17:00:00Z' }),
      ],
      AHORA
    );
    expect(e.proximas.map((m) => m.id)).toEqual(['cerca', 'lejos']);
  });

  it('las pasadas salen de la más reciente primero', () => {
    const e = buildEmbudo(
      [
        reunion({ id: 'vieja', startsAt: '2026-09-01T16:00:00Z', endsAt: '2026-09-01T17:00:00Z' }),
        reunion({ id: 'ayer', startsAt: '2026-10-25T16:00:00Z', endsAt: '2026-10-25T17:00:00Z' }),
      ],
      AHORA
    );
    expect(e.sinCapturar.map((m) => m.id)).toEqual(['ayer', 'vieja']);
  });
});
