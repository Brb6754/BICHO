import { createHmac, randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/lib/whatsapp/agente/fakeDb';
import { buildMpManifest } from '@/lib/payments/mercadopagoSignature';
import { cifrarToken } from '@/lib/payments/mpConnectCrypto';

const estado = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => estado.db }));

import { POST } from './route';

const SECRET = 'whsec-prueba';
const TA = '11111111-1111-4111-8111-111111111111';
const TB = '22222222-2222-4222-8222-222222222222';
const BK = '33333333-3333-4333-8333-333333333333';
type Row = Record<string, unknown>;

function escenario(cita: Row = {}) {
  const f = fakeDb(
    {
      tenants: [{ id: TA, timezone: 'America/Mexico_City', whatsapp_phone_number_id: 'PNID' }],
      tenant_mp_connections: [
        { tenant_id: TA, mp_user_id: '777', access_token_enc: cifrarToken('TOKEN-VENDEDOR'), refresh_token_enc: null, token_expires_at: null, live_mode: false },
      ],
      mp_anticipo_events: [],
      bookings: [
        {
          id: BK, tenant_id: TA, starts_at: '2026-11-20T17:00:00.000Z', status: 'confirmed',
          deposit_status: 'pending', deposit_mxn: 150, hold_expires_at: '2026-11-18T18:15:00.000Z',
          customers: { phone: '6181234567' }, service_types: { name: 'Corte' }, ...cita,
        },
      ],
    },
    { unicas: { mp_anticipo_events: ['event_id'] } }
  );
  estado.db = f.db;
  return f;
}

let pago: Row;
let fetchMock: ReturnType<typeof vi.fn>;

function peticion({ eventId = 'evt-1', dataId = '9001', firma }: { eventId?: string; dataId?: string; firma?: string } = {}) {
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = createHmac('sha256', SECRET).update(buildMpManifest(dataId, 'req-1', ts)).digest('hex');
  return new Request(`https://bichomx.com/api/webhooks/mercadopago-anticipos?data.id=${dataId}&type=payment`, {
    method: 'POST',
    headers: { 'x-signature': firma ?? `ts=${ts},v1=${v1}`, 'x-request-id': 'req-1', 'content-type': 'application/json' },
    body: JSON.stringify({ id: eventId, type: 'payment', user_id: 777, date_created: '2026-11-18T18:05:00Z', data: { id: dataId } }),
  });
}

const mensajes = () =>
  fetchMock.mock.calls.filter(([u]) => String(u).includes('graph.facebook.com')).map(([, init]) => JSON.parse((init as RequestInit).body as string));

beforeEach(() => {
  process.env.MP_CONNECT_ENABLED = '1';
  process.env.MP_CONNECT_WEBHOOK_SECRET = SECRET;
  process.env.MP_TOKEN_ENC_KEY = randomBytes(32).toString('base64');
  process.env.WHATSAPP_ACCESS_TOKEN = 'wa';
  pago = { id: 9001, status: 'approved', transaction_amount: 150, currency_id: 'MXN', external_reference: `${TA}:${BK}`, collector_id: 777 };
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith('https://api.mercadopago.com/v1/payments/')) {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer TOKEN-VENDEDOR');
      return new Response(JSON.stringify(pago));
    }
    if (url.includes('graph.facebook.com')) return new Response('{}');
    throw new Error(`fetch inesperado ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  for (const k of ['MP_CONNECT_ENABLED', 'MP_CONNECT_WEBHOOK_SECRET', 'MP_TOKEN_ENC_KEY', 'WHATSAPP_ACCESS_TOKEN']) delete process.env[k];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('webhook de anticipos', () => {
  it('firma inválida → 401 sin tocar nada', async () => {
    const { tablas } = escenario();
    const res = await POST(peticion({ firma: `ts=${Math.floor(Date.now() / 1000)},v1=${'0'.repeat(64)}` }));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tablas.mp_anticipo_events).toHaveLength(0);
    expect(tablas.bookings[0].deposit_status).toBe('pending');
  });

  it('pago aprobado → confirma y manda comprobante', async () => {
    const { tablas } = escenario();
    expect((await POST(peticion())).status).toBe(200);
    expect(tablas.bookings[0]).toMatchObject({ deposit_status: 'paid', deposit_payment_id: '9001' });
    const [m] = mensajes();
    expect(m.to).toBe('526181234567');
    expect(m.text.body).toContain('$150 MXN');
    expect(m.text.body).toContain('Corte');
    expect(m.text.body).toContain('11:00'); // 17:00 UTC en Ciudad de México
    expect(m.text.body).toContain('9001');
  });

  it('evento repetido → no duplica', async () => {
    escenario();
    await POST(peticion());
    const res = await POST(peticion());
    expect(await res.json()).toMatchObject({ duplicate: true });
    expect(mensajes()).toHaveLength(1);
  });

  it('otra notificación del mismo pago ya confirmado → sin segundo comprobante', async () => {
    escenario();
    await POST(peticion());
    await POST(peticion({ eventId: 'evt-2' }));
    expect(mensajes()).toHaveLength(1);
  });

  it.each(['pending', 'rejected'])('pago %s → no confirma', async (status) => {
    pago.status = status;
    const { tablas } = escenario();
    expect((await POST(peticion())).status).toBe(200);
    expect(tablas.bookings[0].deposit_status).toBe('pending');
    expect(tablas.mp_anticipo_events).toHaveLength(0);
    expect(mensajes()).toHaveLength(0);
  });

  it('monto menor al anticipo → no confirma', async () => {
    pago.transaction_amount = 100;
    const { tablas } = escenario();
    await POST(peticion());
    expect(tablas.bookings[0].deposit_status).toBe('pending');
    expect(mensajes()).toHaveLength(0);
  });

  it('external_reference de otro negocio → rechaza', async () => {
    pago.external_reference = `${TB}:${BK}`;
    const { tablas } = escenario();
    expect((await POST(peticion())).status).toBe(400);
    expect(tablas.bookings[0].deposit_status).toBe('pending');
    expect(mensajes()).toHaveLength(0);
  });

  it('apartado ya liberado → mensaje honesto, una sola vez', async () => {
    const { tablas } = escenario({ status: 'cancelled', deposit_status: 'released' });
    await POST(peticion());
    await POST(peticion({ eventId: 'evt-2' }));
    expect(tablas.bookings[0].deposit_status).toBe('released');
    const ms = mensajes();
    expect(ms).toHaveLength(1);
    expect(ms[0].text.body).toMatch(/venció el apartado/);
    expect(ms[0].text.body).toMatch(/reagendar o devolverte/);
  });

  it('flag apagado → 404', async () => {
    escenario();
    delete process.env.MP_CONNECT_ENABLED;
    expect((await POST(peticion())).status).toBe(404);
  });

  it('migración ausente → 500 controlado para que MP reintente', async () => {
    const f = fakeDb({}).db as unknown as { from: (t: string) => Record<string, unknown> };
    const orig = f.from;
    f.from = (t: string) => {
      const q = orig(t);
      if (t === 'tenant_mp_connections') q.eq = () => Promise.resolve({ data: null, error: { code: '42P01' } });
      return q;
    };
    estado.db = f;
    expect((await POST(peticion())).status).toBe(500);
  });
});
