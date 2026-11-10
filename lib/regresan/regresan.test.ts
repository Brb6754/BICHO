import { describe, it, expect } from 'vitest';
import { buildRoster, type RosterBooking } from '@/lib/customers/roster';
import { clientasInactivas, visitasParaResena } from './clientas';
import {
  limpiarLinkResena,
  limpiarSemanas,
  mensajeRegreso,
  mensajeResena,
  waLink,
} from './mensajes';
import { tocaRecordatorio } from './recordatorios';

const TZ = 'America/Mexico_City';
const NOW = new Date('2026-11-10T18:00:00Z');
const haceDias = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const enHoras = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

function cita(
  id: string,
  starts_at: string,
  status: string,
  name: string,
  phone: string | null,
  service = 'Retoque de uñas',
  email: string | null = null
): RosterBooking {
  return { id, starts_at, status, customers: { name, phone, email }, service_types: { name: service } };
}

describe('clientasInactivas', () => {
  const citas = [
    // Ana: última visita hace 50 días (> 6 semanas), nada agendado.
    cita('1', haceDias(80), 'completed', 'Ana López', '618 111 2233', 'Gelish'),
    cita('2', haceDias(50), 'completed', 'Ana López', '6181112233', 'Retoque de uñas'),
    // Bety: hace 60 días pero ya tiene cita mañana → no aparece.
    cita('3', haceDias(60), 'completed', 'Bety Ruiz', '618 222 3344'),
    cita('4', enHoras(20), 'confirmed', 'Bety Ruiz', '618 222 3344'),
    // Caro: vino hace 20 días → todavía no toca.
    cita('5', haceDias(20), 'confirmed', 'Caro Soto', '618 333 4455'),
    // Dani: canceló hace 90 días y nunca vino → no es "clienta que no volvió".
    cita('6', haceDias(90), 'cancelled', 'Dani Paz', '618 444 5566'),
    // Eva: hace 100 días.
    cita('7', haceDias(100), 'confirmed', 'Eva Gil', '618 555 6677', 'Corte'),
  ];
  const roster = buildRoster(citas, NOW);

  it('lista solo a quien lleva más de N semanas sin venir y sin cita próxima', () => {
    const lista = clientasInactivas(roster, 6, NOW, TZ);
    expect(lista.map((c) => c.name)).toEqual(['Ana López', 'Eva Gil']);
  });

  it('trae el servicio de la ÚLTIMA visita, no el favorito', () => {
    const ana = clientasInactivas(roster, 6, NOW, TZ)[0];
    expect(ana.lastService).toBe('Retoque de uñas');
    expect(ana.semanas).toBe(7);
  });

  it('N es configurable', () => {
    expect(clientasInactivas(roster, 2, NOW, TZ).map((c) => c.name)).toEqual(['Caro Soto', 'Ana López', 'Eva Gil']);
    expect(clientasInactivas(roster, 52, NOW, TZ)).toEqual([]);
  });
});

describe('visitasParaResena', () => {
  it('una fila por persona, solo visitas de los últimos días que sí ocurrieron', () => {
    const lista = visitasParaResena(
      [
        cita('1', haceDias(1), 'completed', 'Ana', '618 111 2233', 'Gelish', 'ana@x.mx'),
        cita('2', haceDias(3), 'confirmed', 'Ana', '6181112233'),
        cita('3', haceDias(2), 'no_show', 'Bety', '618 222 3344'),
        cita('4', haceDias(2), 'cancelled', 'Caro', '618 333 4455'),
        cita('5', haceDias(30), 'completed', 'Dani', '618 444 5566'),
        cita('6', enHoras(5), 'confirmed', 'Eva', '618 555 6677'),
      ],
      NOW
    );
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ bookingId: '1', name: 'Ana', service: 'Gelish', email: 'ana@x.mx' });
  });
});

describe('mensajes', () => {
  it('arma el mensaje de regreso con primer nombre, servicio y link', () => {
    expect(
      mensajeRegreso({ nombre: 'Ana Sofía López', servicio: 'Retoque de uñas', negocio: 'Lima Laca', linkReservar: 'https://x.mx/t/lima-laca/reservar' })
    ).toBe('¡Hola Ana! Ya toca tu próxima cita de retoque de uñas en Lima Laca. Aparta tu horario aquí cuando quieras: https://x.mx/t/lima-laca/reservar');
  });

  it('sin servicio no inventa uno', () => {
    expect(mensajeRegreso({ nombre: 'Eva', servicio: null, negocio: 'Lima Laca', linkReservar: 'L' })).toContain('Ya toca tu próxima visita');
  });

  it('el mensaje de reseña lleva el link', () => {
    expect(mensajeResena({ nombre: 'Ana López', negocio: 'Lima Laca', linkResena: 'https://g.page/r/abc/review' })).toContain(
      'Ana! Si te gustó'
    );
  });

  it('waLink normaliza el teléfono mexicano y codifica el texto', () => {
    expect(waLink('618 111 2233', '¡Hola Ana! & más')).toBe(
      'https://wa.me/526181112233?text=%C2%A1Hola%20Ana!%20%26%20m%C3%A1s'
    );
    expect(waLink('123', 'x')).toBeNull();
    expect(waLink(null, 'x')).toBeNull();
  });

  it('el link de reseñas solo acepta https', () => {
    expect(limpiarLinkResena('  https://g.page/r/abc/review ')).toEqual({ ok: true, url: 'https://g.page/r/abc/review' });
    expect(limpiarLinkResena('')).toEqual({ ok: true, url: null });
    expect(limpiarLinkResena('javascript:alert(1)')).toEqual({ ok: false });
    expect(limpiarLinkResena('http://g.page/x')).toEqual({ ok: false });
  });

  it('semanas entre 1 y 52', () => {
    expect(limpiarSemanas('6')).toBe(6);
    expect(limpiarSemanas('0')).toBeNull();
    expect(limpiarSemanas('53')).toBeNull();
    expect(limpiarSemanas('4.5')).toBeNull();
  });
});

describe('tocaRecordatorio', () => {
  const base = { status: 'confirmed', created_at: haceDias(2), reminder_sent_at: null };
  it('manda para citas confirmadas dentro de la ventana', () => {
    expect(tocaRecordatorio({ ...base, starts_at: enHoras(24) }, NOW)).toBe(true);
  });
  it('no repite, no manda a canceladas ni a citas pasadas o lejanas', () => {
    expect(tocaRecordatorio({ ...base, starts_at: enHoras(24), reminder_sent_at: haceDias(0) }, NOW)).toBe(false);
    expect(tocaRecordatorio({ ...base, starts_at: enHoras(24), status: 'cancelled' }, NOW)).toBe(false);
    expect(tocaRecordatorio({ ...base, starts_at: enHoras(-1) }, NOW)).toBe(false);
    expect(tocaRecordatorio({ ...base, starts_at: enHoras(40) }, NOW)).toBe(false);
  });
  it('no recuerda una cita recién agendada (ya tuvo su confirmación)', () => {
    expect(tocaRecordatorio({ ...base, starts_at: enHoras(10), created_at: enHoras(-1) }, NOW)).toBe(false);
  });
});
