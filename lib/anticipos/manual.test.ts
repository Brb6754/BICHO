import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/lib/whatsapp/agente/fakeDb';
import { confirmarAnticipoManual, extenderApartado, liberarApartado } from './manual';

const AHORA = new Date('2026-11-18T18:00:00.000Z');

const datos = () => ({
  bookings: [
    { id: 'b1', tenant_id: 'T-A', status: 'confirmed', deposit_status: 'pending', deposit_mxn: 150, hold_expires_at: '2026-11-18T18:10:00.000Z' },
    { id: 'b2', tenant_id: 'T-A', status: 'cancelled', deposit_status: 'released', deposit_mxn: 150, hold_expires_at: '2026-11-18T17:00:00.000Z' },
    { id: 'b3', tenant_id: 'T-A', status: 'confirmed', deposit_status: 'paid', deposit_mxn: 150, hold_expires_at: null },
    { id: 'b4', tenant_id: 'T-A', status: 'confirmed', deposit_status: 'pending', deposit_mxn: 100, hold_expires_at: '2026-11-18T17:30:00.000Z' },
  ] as Record<string, unknown>[],
});

describe('confirmarAnticipoManual', () => {
  it('pending → paid con referencia manual del usuario; la segunda vez es idempotente', async () => {
    const { db, tablas } = fakeDb(datos());
    const args = { tenantId: 'T-A', bookingId: 'b1', userId: 'u-1' };
    expect(await confirmarAnticipoManual(db, args, AHORA)).toEqual({ ok: true, yaEstaba: false, montoMxn: 150 });
    expect(tablas.bookings[0]).toMatchObject({ deposit_status: 'paid', deposit_payment_id: `manual:u-1:${AHORA.toISOString()}` });
    expect(await confirmarAnticipoManual(db, args, AHORA)).toMatchObject({ ok: true, yaEstaba: true });
  });

  it('liberada no se revive; de otro negocio no se encuentra', async () => {
    const { db, tablas } = fakeDb(datos());
    expect(await confirmarAnticipoManual(db, { tenantId: 'T-A', bookingId: 'b2', userId: 'u' }, AHORA)).toEqual({ ok: false, motivo: 'liberada' });
    expect(await confirmarAnticipoManual(db, { tenantId: 'T-B', bookingId: 'b1', userId: 'u' }, AHORA)).toEqual({ ok: false, motivo: 'no_encontrada' });
    expect(tablas.bookings[0].deposit_status).toBe('pending');
    expect(tablas.bookings[1]).toMatchObject({ status: 'cancelled', deposit_status: 'released' });
  });
});

describe('extenderApartado', () => {
  it('suma sobre el reloj actual si no ha vencido, o desde ahora si ya venció', async () => {
    const { db, tablas } = fakeDb(datos());
    expect(await extenderApartado(db, { tenantId: 'T-A', bookingId: 'b1', minutos: 60 }, AHORA)).toMatchObject({ ok: true });
    expect(tablas.bookings[0].hold_expires_at).toBe('2026-11-18T19:10:00.000Z');
    await extenderApartado(db, { tenantId: 'T-A', bookingId: 'b4', minutos: 60 }, AHORA);
    expect(tablas.bookings[3].hold_expires_at).toBe('2026-11-18T19:00:00.000Z');
  });

  it('solo si sigue pendiente, y nunca en otro negocio', async () => {
    const { db, tablas } = fakeDb(datos());
    expect(await extenderApartado(db, { tenantId: 'T-A', bookingId: 'b3', minutos: 60 }, AHORA)).toEqual({ ok: false, motivo: 'no_pendiente' });
    expect(await extenderApartado(db, { tenantId: 'T-A', bookingId: 'b2', minutos: 60 }, AHORA)).toEqual({ ok: false, motivo: 'no_pendiente' });
    expect(await extenderApartado(db, { tenantId: 'T-B', bookingId: 'b1', minutos: 60 }, AHORA)).toEqual({ ok: false, motivo: 'no_pendiente' });
    expect(tablas.bookings[0].hold_expires_at).toBe('2026-11-18T18:10:00.000Z');
  });
});

describe('liberarApartado', () => {
  it('cancela y marca released solo un apartado pendiente de este negocio', async () => {
    const { db, tablas } = fakeDb(datos());
    expect(await liberarApartado(db, { tenantId: 'T-B', bookingId: 'b1' })).toEqual({ ok: false, motivo: 'no_pendiente' });
    expect(await liberarApartado(db, { tenantId: 'T-A', bookingId: 'b3' })).toEqual({ ok: false, motivo: 'no_pendiente' });
    expect(await liberarApartado(db, { tenantId: 'T-A', bookingId: 'b1' })).toEqual({ ok: true });
    expect(tablas.bookings[0]).toMatchObject({ status: 'cancelled', deposit_status: 'released' });
    expect(tablas.bookings[2]).toMatchObject({ status: 'confirmed', deposit_status: 'paid' });
  });
});
