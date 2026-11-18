import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/lib/whatsapp/agente/fakeDb';
import { CONFIG_APAGADA, configDesdeFila, leerConfigAnticipo, montoAnticipo } from './config';
import { apartarCita } from './apartar';
import { liberarApartadosVencidos } from './liberar';
import { confirmarAnticipo } from './confirmar';
import { puedeReagendar, reagendarConservandoAnticipo } from './reagendar';
import { obtenerLinkAnticipo } from './pago';

type Row = Record<string, unknown>;
const AHORA = new Date('2026-11-18T18:00:00.000Z');
const INICIO = '2026-11-20T17:00:00.000Z';

function tenant(over: Row = {}): Row {
  return { id: 'T-A', slug: 'salon-a', name: 'Salón A', timezone: 'America/Mexico_City', ...over };
}

// Escenario: un negocio con un recurso y dos servicios; create_booking
// del fake inserta de verdad en `bookings` para que el apartado se pueda leer.
function escenario(t: Row, opts: { sinColumnas?: Record<string, string[]> } = {}) {
  const tablas: Record<string, Row[]> = {
    tenants: [t, tenant({ id: 'T-B', anticipo_enabled: true, anticipo_mxn: 999 })],
    resources: [{ id: 'r-a', tenant_id: 'T-A' }],
    service_types: [
      { id: 's-corte', tenant_id: 'T-A', name: 'Corte', deposit_mxn: null },
      { id: 's-tinte', tenant_id: 'T-A', name: 'Tinte', deposit_mxn: 300 },
      { id: 's-gratis', tenant_id: 'T-A', name: 'Valoración', deposit_mxn: 0 },
    ],
    bookings: [],
  };
  return fakeDb(tablas, {
    sinColumnas: opts.sinColumnas,
    rpc: {
      create_booking: (a) => {
        const id = `b-${tablas.bookings.length + 1}`;
        tablas.bookings.push({ id, tenant_id: a.p_tenant_id, status: 'confirmed', starts_at: a.p_starts_at, service_type_id: a.p_service_type_id });
        return { data: id };
      },
    },
  });
}

const input = (service_type_id: string): Row => ({
  resource_id: 'r-a',
  service_type_id,
  starts_at: INICIO,
  ends_at: '2026-11-20T17:30:00.000Z',
  customer_name: 'Daniela',
  customer_phone: '618 123 4567',
});

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.MP_CONNECT_ENABLED;
});

describe('config y monto', () => {
  it('sin columnas de db/061 = apagado con defaults', async () => {
    const { db } = escenario(tenant());
    expect(await leerConfigAnticipo(db, 'T-A')).toEqual({ ...CONFIG_APAGADA, timezone: 'America/Mexico_City' });
  });

  it('servicio con monto propio manda; null usa el general; 0 es sin anticipo', () => {
    const c = configDesdeFila({ anticipo_enabled: true, anticipo_mxn: 150 });
    expect(montoAnticipo(c, { deposit_mxn: 300 })).toBe(300);
    expect(montoAnticipo(c, { deposit_mxn: null })).toBe(150);
    expect(montoAnticipo(c, {})).toBe(150);
    expect(montoAnticipo(c, { deposit_mxn: 0 })).toBe(0);
    expect(montoAnticipo(configDesdeFila({ anticipo_enabled: true }), { deposit_mxn: null })).toBe(0);
    expect(montoAnticipo(configDesdeFila({ anticipo_enabled: false, anticipo_mxn: 150 }), { deposit_mxn: 300 })).toBe(0);
  });
});

describe('apartarCita', () => {
  it('con anticipo: queda pending con el monto copiado y vencimiento a N minutos', async () => {
    const { db, tablas } = escenario(tenant({ anticipo_enabled: true, anticipo_mxn: 150, anticipo_apartado_min: 20 }));
    const r = await apartarCita(db, 'T-A', input('s-corte'), AHORA);
    expect(r).toMatchObject({ ok: true, requiereAnticipo: true, montoMxn: 150 });
    if (!r.ok) throw new Error();
    expect(r.venceEn?.toISOString()).toBe('2026-11-18T18:20:00.000Z');
    expect(tablas.bookings[0]).toMatchObject({ status: 'confirmed', deposit_status: 'pending', deposit_mxn: 150, hold_expires_at: '2026-11-18T18:20:00.000Z' });
  });

  it('monto por servicio gana al general', async () => {
    const { db } = escenario(tenant({ anticipo_enabled: true, anticipo_mxn: 150 }));
    expect(await apartarCita(db, 'T-A', input('s-tinte'), AHORA)).toMatchObject({ requiereAnticipo: true, montoMxn: 300 });
  });

  it('servicio con 0 o anticipo apagado: confirmada directo, sin tocar columnas', async () => {
    const { db, tablas } = escenario(tenant({ anticipo_enabled: true, anticipo_mxn: 150 }));
    expect(await apartarCita(db, 'T-A', input('s-gratis'), AHORA)).toMatchObject({ ok: true, requiereAnticipo: false, montoMxn: 0, venceEn: null });
    const apagado = escenario(tenant({ anticipo_enabled: false, anticipo_mxn: 150 }));
    expect(await apartarCita(apagado.db, 'T-A', input('s-tinte'), AHORA)).toMatchObject({ requiereAnticipo: false });
    expect(tablas.bookings[0].deposit_status).toBeUndefined();
  });

  it('migración ausente (columnas de bookings no existen): confirma directo', async () => {
    const { db, tablas } = escenario(tenant({ anticipo_enabled: true, anticipo_mxn: 150 }), {
      sinColumnas: { bookings: ['deposit_status', 'deposit_mxn', 'hold_expires_at'] },
    });
    expect(await apartarCita(db, 'T-A', input('s-corte'), AHORA)).toMatchObject({ ok: true, requiereAnticipo: false });
    expect(tablas.bookings[0].status).toBe('confirmed');
  });

  it('propaga el error de crearReserva (servicio de otro negocio)', async () => {
    const { db } = escenario(tenant({ anticipo_enabled: true, anticipo_mxn: 150 }));
    expect(await apartarCita(db, 'T-A', { ...input('s-corte'), service_type_id: 'ajeno' }, AHORA)).toMatchObject({ ok: false, status: 400 });
  });
});

describe('liberarApartadosVencidos', () => {
  const filas = (): Row[] => [
    { id: 'vencida', tenant_id: 'T-A', status: 'confirmed', deposit_status: 'pending', hold_expires_at: '2026-11-18T17:59:00.000Z', starts_at: INICIO, customers: { name: 'Ana', phone: '6181234567' }, service_types: { name: 'Corte' } },
    { id: 'viva', tenant_id: 'T-A', status: 'confirmed', deposit_status: 'pending', hold_expires_at: '2026-11-18T18:05:00.000Z', starts_at: INICIO },
    { id: 'pagada', tenant_id: 'T-A', status: 'confirmed', deposit_status: 'paid', hold_expires_at: '2026-11-18T17:00:00.000Z', starts_at: INICIO },
    { id: 'otra', tenant_id: 'T-B', status: 'confirmed', deposit_status: 'pending', hold_expires_at: '2026-11-18T17:00:00.000Z', starts_at: INICIO },
  ];

  it('libera solo lo vencido y pendiente; idempotente al barrer dos veces', async () => {
    const { db, tablas } = fakeDb({ bookings: filas() });
    const r = await liberarApartadosVencidos(db, AHORA);
    expect(r.map((x) => x.id).sort()).toEqual(['otra', 'vencida']);
    expect(r.find((x) => x.id === 'vencida')).toEqual({ id: 'vencida', tenantId: 'T-A', telefono: '6181234567', nombre: 'Ana', servicio: 'Corte', startsAt: INICIO });
    const por = Object.fromEntries(tablas.bookings.map((b) => [b.id, b]));
    expect(por.vencida).toMatchObject({ status: 'cancelled', deposit_status: 'released' });
    expect(por.viva).toMatchObject({ status: 'confirmed', deposit_status: 'pending' });
    expect(por.pagada).toMatchObject({ status: 'confirmed', deposit_status: 'paid' });
    expect(await liberarApartadosVencidos(db, AHORA)).toEqual([]);
  });

  it('con tenantId barre solo ese negocio', async () => {
    const { db } = fakeDb({ bookings: filas() });
    expect((await liberarApartadosVencidos(db, AHORA, 'T-B')).map((x) => x.id)).toEqual(['otra']);
  });
});

describe('confirmarAnticipo', () => {
  const datos = () => ({
    bookings: [
      { id: 'b1', tenant_id: 'T-A', deposit_status: 'pending', deposit_mxn: 150 },
      { id: 'b2', tenant_id: 'T-A', deposit_status: 'released', deposit_mxn: 150 },
      { id: 'b3', tenant_id: 'T-A', deposit_status: null },
    ],
  });

  it('pending → paid, y la segunda vez dice yaEstaba', async () => {
    const { db, tablas } = fakeDb(datos());
    const args = { tenantId: 'T-A', bookingId: 'b1', paymentId: 'mp-1', montoMxn: 150 };
    expect(await confirmarAnticipo(db, args, AHORA)).toEqual({ ok: true, yaEstaba: false });
    expect(tablas.bookings[0]).toMatchObject({ deposit_status: 'paid', deposit_payment_id: 'mp-1', deposit_paid_at: AHORA.toISOString() });
    expect(await confirmarAnticipo(db, args, AHORA)).toEqual({ ok: true, yaEstaba: true });
  });

  it('liberada, sin anticipo, monto corto, o de otro negocio', async () => {
    const { db, tablas } = fakeDb(datos());
    const base = { tenantId: 'T-A', paymentId: 'mp-1', montoMxn: 150 };
    expect(await confirmarAnticipo(db, { ...base, bookingId: 'b2' })).toEqual({ ok: false, motivo: 'liberada' });
    expect(await confirmarAnticipo(db, { ...base, bookingId: 'b3' })).toEqual({ ok: false, motivo: 'sin_anticipo' });
    expect(await confirmarAnticipo(db, { ...base, bookingId: 'b1', montoMxn: 100 })).toEqual({ ok: false, motivo: 'monto_insuficiente' });
    expect(await confirmarAnticipo(db, { ...base, tenantId: 'T-B', bookingId: 'b1' })).toEqual({ ok: false, motivo: 'no_encontrada' });
    expect(tablas.bookings[0].deposit_status).toBe('pending');
  });
});

describe('reagendar', () => {
  const config = configDesdeFila({ anticipo_enabled: true, anticipo_reagendar_horas: 24, anticipo_politica: 'Cambios con 24 h.', timezone: 'America/Mexico_City' });

  it('dentro y fuera de plazo, con el límite en hora del negocio', () => {
    // Cita 20-nov 11:00 CDMX (17:00Z); límite 19-nov 11:00 CDMX.
    const dentro = puedeReagendar({ starts_at: INICIO }, config, new Date('2026-11-19T16:59:00.000Z'));
    expect(dentro).toMatchObject({ puede: true, politica: 'Cambios con 24 h.' });
    expect(dentro.limiteTexto).toMatch(/19 de noviembre, 11:00/);
    expect(puedeReagendar({ starts_at: INICIO }, config, new Date('2026-11-19T17:00:00.000Z')).puede).toBe(true);
    expect(puedeReagendar({ starts_at: INICIO }, config, new Date('2026-11-19T17:01:00.000Z')).puede).toBe(false);
  });

  const db = (deposit_status: string | null) =>
    fakeDb({
      tenants: [tenant({ anticipo_enabled: true, anticipo_reagendar_horas: 24 })],
      bookings: [{ id: 'b1', tenant_id: 'T-A', status: 'confirmed', starts_at: INICIO, deposit_status, deposit_payment_id: 'mp-1' }],
    }).db;
  const mov = { tenantId: 'T-A', slug: 'salon-a', bookingId: 'b1', newStartsAt: '2026-11-21T17:00:00.000Z', newEndsAt: '2026-11-21T17:30:00.000Z' };

  it('con anticipo pagado y en plazo mueve la misma cita', async () => {
    const mover = vi.fn().mockResolvedValue({ error: null });
    expect(await reagendarConservandoAnticipo(db('paid'), mov, AHORA, mover)).toEqual({ ok: true });
    expect(mover).toHaveBeenCalledWith({ bookingId: 'b1', slug: 'salon-a', newStartsAt: mov.newStartsAt, newEndsAt: mov.newEndsAt });
  });

  it('fuera de plazo no mueve; sin anticipo no aplica el plazo; otro negocio no la ve', async () => {
    const mover = vi.fn().mockResolvedValue({ error: null });
    const tarde = new Date('2026-11-20T10:00:00.000Z');
    expect(await reagendarConservandoAnticipo(db('paid'), mov, tarde, mover)).toMatchObject({ ok: false, motivo: 'fuera_de_plazo' });
    expect(mover).not.toHaveBeenCalled();
    expect(await reagendarConservandoAnticipo(db(null), mov, tarde, mover)).toEqual({ ok: true });
    expect(await reagendarConservandoAnticipo(db('paid'), { ...mov, tenantId: 'T-B' }, AHORA, mover)).toMatchObject({ motivo: 'no_encontrada' });
  });
});

describe('obtenerLinkAnticipo', () => {
  const input = { tenantId: 'T-A', bookingId: 'b1', montoMxn: 150, descripcion: 'Anticipo', vence: AHORA };
  const proveedor = { crearLinkAnticipo: vi.fn().mockResolvedValue({ url: 'https://mp/x', referencia: 'ref' }) };

  it('null sin flag o sin conexión; link con ambos', async () => {
    const { db } = fakeDb({ tenant_mp_connections: [{ tenant_id: 'T-A' }] });
    expect(await obtenerLinkAnticipo(db, input, proveedor)).toBeNull();
    process.env.MP_CONNECT_ENABLED = '1';
    expect(await obtenerLinkAnticipo(fakeDb({}).db, input, proveedor)).toBeNull();
    expect(await obtenerLinkAnticipo(db, input, proveedor)).toEqual({ url: 'https://mp/x', referencia: 'ref' });
  });
});
