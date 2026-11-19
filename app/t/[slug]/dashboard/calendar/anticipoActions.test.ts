import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/lib/whatsapp/agente/fakeDb';

// Las acciones de anticipo del panel: membresía (requireTenantStaff),
// aislamiento por tenant y el comprobante por WhatsApp. Supabase en memoria.

const estado = vi.hoisted(() => ({ db: null as unknown, after: [] as (() => unknown)[] }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => estado.db }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => estado.after.push(fn) }));
vi.mock('@/lib/boost/motor', () => ({ avisarCitaLiberada: vi.fn() }));
vi.mock('@/lib/anticipos/avisar', () => ({ avisarPorWhatsapp: vi.fn().mockResolvedValue(true), pesosMxn: (n: number) => `$${n} MXN` }));
vi.mock('@/lib/auth/tenantStaff', () => ({
  requireTenantStaff: vi.fn(async (slug: string) => {
    if (slug !== 'salon-a') throw new Error('No tienes acceso a este negocio.');
    return { tenantId: 'T-A', userId: 'u-1', role: 'staff', timezone: 'America/Mexico_City' };
  }),
}));

import { darMasTiempoAnticipo, liberarAnticipo, marcarAnticipoPagado } from './anticipoActions';
import { avisarPorWhatsapp } from '@/lib/anticipos/avisar';

function escenario(agente = true) {
  const f = fakeDb({
    tenants: [{ id: 'T-A', agente_whatsapp_enabled: agente }, { id: 'T-B' }],
    bookings: [
      { id: 'b1', tenant_id: 'T-A', status: 'confirmed', deposit_status: 'pending', deposit_mxn: 150, hold_expires_at: '2099-01-01T00:00:00.000Z' },
      { id: 'b2', tenant_id: 'T-A', status: 'cancelled', deposit_status: 'released', deposit_mxn: 150 },
      { id: 'bB', tenant_id: 'T-B', status: 'confirmed', deposit_status: 'pending', deposit_mxn: 150 },
    ],
  });
  estado.db = f.db;
  return f;
}

beforeEach(() => {
  estado.after = [];
  vi.mocked(avisarPorWhatsapp).mockClear();
});

describe('marcarAnticipoPagado', () => {
  it('un miembro marca pagado y sale el comprobante si la recepcionista está prendida', async () => {
    const { tablas } = escenario();
    await marcarAnticipoPagado('salon-a', 'b1');
    expect(tablas.bookings[0]).toMatchObject({ deposit_status: 'paid' });
    expect(String(tablas.bookings[0].deposit_payment_id)).toMatch(/^manual:u-1:/);
    await Promise.all(estado.after.map((f) => f()));
    expect(avisarPorWhatsapp).toHaveBeenCalledTimes(1);
    const texto = vi.mocked(avisarPorWhatsapp).mock.calls[0][2]({ servicio: 'Corte', cuando: 'Jueves 19 de noviembre, 12:00' });
    expect(texto).toBe('Recibimos tu anticipo de $150 MXN para Corte el Jueves 19 de noviembre, 12:00. Tu cita queda confirmada.');
  });

  it('ya pagada: idempotente y sin segundo comprobante', async () => {
    escenario();
    await marcarAnticipoPagado('salon-a', 'b1');
    estado.after = [];
    await expect(marcarAnticipoPagado('salon-a', 'b1')).resolves.toBeUndefined();
    expect(estado.after).toHaveLength(0);
  });

  it('sin recepcionista no manda WhatsApp', async () => {
    escenario(false);
    await marcarAnticipoPagado('salon-a', 'b1');
    expect(estado.after).toHaveLength(0);
  });

  it('alguien ajeno no puede, y un miembro no toca la cita de otro negocio', async () => {
    const { tablas } = escenario();
    await expect(marcarAnticipoPagado('otro', 'b1')).rejects.toThrow(/acceso/);
    await expect(marcarAnticipoPagado('salon-a', 'bB')).rejects.toThrow(/ya no tiene un anticipo pendiente/);
    expect(tablas.bookings[0].deposit_status).toBe('pending');
    expect(tablas.bookings[2].deposit_status).toBe('pending');
  });

  it('liberada: avisa que hay que agendarla otra vez', async () => {
    escenario();
    await expect(marcarAnticipoPagado('salon-a', 'b2')).rejects.toThrow(/ya se liberó/);
  });
});

describe('darMasTiempoAnticipo y liberarAnticipo', () => {
  it('más tiempo solo si sigue pendiente', async () => {
    const { tablas } = escenario();
    await darMasTiempoAnticipo('salon-a', 'b1');
    expect(tablas.bookings[0].hold_expires_at).toBe('2099-01-01T01:00:00.000Z');
    await expect(darMasTiempoAnticipo('salon-a', 'b2')).rejects.toThrow(/ya no está esperando pago/);
    await expect(darMasTiempoAnticipo('otro', 'b1')).rejects.toThrow(/acceso/);
  });

  it('liberar cancela el apartado de este negocio y deja pasar el aviso de Boost', async () => {
    const { tablas } = escenario();
    await expect(liberarAnticipo('salon-a', 'bB')).rejects.toThrow(/ya no está esperando pago/);
    await liberarAnticipo('salon-a', 'b1');
    expect(tablas.bookings[0]).toMatchObject({ status: 'cancelled', deposit_status: 'released' });
    expect(estado.after).toHaveLength(1);
  });
});
