import { describe, expect, it } from 'vitest';
import { citasCsv, clientesCsv, csvCell, toCsv, type ExportBooking } from './csv';

const cita = (over: Partial<ExportBooking>): ExportBooking => ({
  id: 'b1',
  starts_at: '2026-11-03T23:30:00.000Z',
  status: 'confirmed',
  customers: { name: 'Ana Peña', phone: '618 111 2233', email: null },
  service_types: { name: 'Corte' },
  resources: { name: 'Renata' },
  ...over,
});

describe('csvCell', () => {
  it('neutraliza fórmulas con un apóstrofo', () => {
    for (const v of ['=HYPERLINK("x")', '+52 618', '-1', '@SUM(A1)', '\tx']) {
      expect(csvCell(v).replace(/^"/, '').startsWith("'")).toBe(true);
    }
    expect(csvCell('Ana')).toBe('Ana');
  });

  it('escapa comillas, comas y saltos de línea', () => {
    expect(csvCell('Corte, lavado')).toBe('"Corte, lavado"');
    expect(csvCell('Dice "hola"')).toBe('"Dice ""hola"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell('=1,2')).toBe(`"'=1,2"`);
  });

  it('números tal cual y vacíos como nada', () => {
    expect(csvCell(3)).toBe('3');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(null)).toBe('');
  });
});

describe('toCsv', () => {
  it('empieza con BOM y usa \\r\\n', () => {
    const out = toCsv(['A', 'B'], [['1', 'ñ']]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out.slice(1)).toBe('A,B\r\n1,ñ\r\n');
  });
});

describe('citasCsv', () => {
  it('fecha y hora en la zona del negocio, no en UTC', () => {
    // 23:30 UTC del 3 de nov = 17:30 del 3 en Ciudad de México.
    const out = citasCsv([cita({})], 'America/Mexico_City');
    expect(out).toContain('2026-11-03,17:30,Corte,Renata,Ana Peña,618 111 2233,Confirmada');
    // La misma cita en Madrid ya es el día 4.
    expect(citasCsv([cita({})], 'Europe/Madrid')).toContain('2026-11-04,00:30');
  });

  it('traduce el estado', () => {
    expect(citasCsv([cita({ status: 'no_show' })], null)).toContain('No vino');
  });
});

describe('clientesCsv', () => {
  it('una fila por persona, con visitas y última visita local', () => {
    const now = new Date('2026-11-10T00:00:00Z');
    const out = clientesCsv(
      [
        cita({ id: 'a', starts_at: '2026-11-01T16:00:00Z' }),
        cita({ id: 'b', starts_at: '2026-11-03T23:30:00Z', customers: { name: 'Ana Peña', phone: '6181112233', email: 'ana@x.mx' } }),
        cita({ id: 'c', customers: { name: '=cmd', phone: '6189990000', email: null } }),
      ],
      'America/Mexico_City',
      now
    );
    const lines = out.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Nombre,Teléfono,Correo,Visitas,Última visita');
    expect(lines).toHaveLength(3);
    expect(lines.some((l) => l.startsWith("'=cmd,"))).toBe(true);
    expect(lines.find((l) => l.startsWith('Ana Peña'))).toMatch(/,2,2026-11-03 17:30$/);
  });
});
