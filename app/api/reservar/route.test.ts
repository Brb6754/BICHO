import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/lib/whatsapp/agente/fakeDb';

const estado = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => estado.db }));
const correo = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/lib/email/sendBookingConfirmation', () => ({ sendBookingConfirmation: correo }));
const whatsapp = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/lib/whatsapp/send', () => ({ sendBookingWhatsApp: whatsapp }));

import { POST } from './route';

type Row = Record<string, unknown>;

function escenario(tenant: Row, opts: { sinColumnas?: Record<string, string[]> } = {}) {
  const tablas: Record<string, Row[]> = {
    tenants: [{ id: 'T-A', slug: 'salon-a', name: 'Salón A', timezone: 'America/Mexico_City', whatsapp_enabled: true, ...tenant }],
    resources: [{ id: 'r-a', tenant_id: 'T-A' }],
    service_types: [{ id: 's-corte', tenant_id: 'T-A', name: 'Corte', deposit_mxn: 200 }],
    bookings: [],
  };
  const f = fakeDb(tablas, {
    sinColumnas: opts.sinColumnas,
    rpc: {
      create_booking: (a) => {
        tablas.bookings.push({ id: 'b-1', tenant_id: a.p_tenant_id, status: 'confirmed' });
        return { data: 'b-1' };
      },
    },
  });
  estado.db = f.db;
  return f;
}

// Una IP distinta por petición: el limitador en memoria no debe cruzar pruebas.
let ip = 0;
const pedir = () =>
  POST(
    new Request('https://bichomx.com/api/reservar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ip}` },
      body: JSON.stringify({
        slug: 'salon-a',
        resource_id: 'r-a',
        service_type_id: 's-corte',
        starts_at: '2026-11-20T17:00:00.000Z',
        ends_at: '2026-11-20T17:30:00.000Z',
        customer_name: 'Daniela',
        customer_phone: '618 123 4567',
        customer_email: 'dani@correo.com',
      }),
    })
  );

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => {
  vi.restoreAllMocks();
  correo.mockClear();
  whatsapp.mockClear();
});

describe('POST /api/reservar', () => {
  it('servicio con anticipo: queda apartada, sin "cita confirmada" por WhatsApp y el correo dice que falta el anticipo', async () => {
    const { tablas } = escenario({ anticipo_enabled: true, anticipo_apartado_min: 15 });
    const res = await pedir();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, bookingId: 'b-1', anticipo: { montoMxn: 200, pagoUrl: null } });
    expect(typeof body.anticipo.venceEn).toBe('string');
    expect(tablas.bookings[0]).toMatchObject({ deposit_status: 'pending', deposit_mxn: 200 });
    expect(whatsapp).not.toHaveBeenCalled();
    expect(correo).toHaveBeenCalledWith(expect.objectContaining({ anticipo: expect.objectContaining({ montoMxn: 200 }) }));
  });

  it('sin anticipo: confirmada como siempre, con correo y WhatsApp de confirmación', async () => {
    const { tablas } = escenario({ anticipo_enabled: false });
    const body = await (await pedir()).json();
    expect(body).toEqual({ ok: true, bookingId: 'b-1', anticipo: null });
    expect(tablas.bookings[0].deposit_status).toBeUndefined();
    expect(correo).toHaveBeenCalledWith(expect.objectContaining({ anticipo: null }));
    expect(whatsapp).toHaveBeenCalledTimes(1);
  });

  it('sin db/061 (columnas ausentes): confirmada como siempre aunque la config diga anticipo', async () => {
    escenario({ anticipo_enabled: true }, { sinColumnas: { bookings: ['deposit_status', 'deposit_mxn', 'hold_expires_at'] } });
    const body = await (await pedir()).json();
    expect(body).toEqual({ ok: true, bookingId: 'b-1', anticipo: null });
    expect(whatsapp).toHaveBeenCalledTimes(1);
  });
});
