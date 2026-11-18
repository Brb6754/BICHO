import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/lib/whatsapp/agente/fakeDb';
import { cifrarToken, descifrarToken } from './mpConnectCrypto';
import { consumirState, crearState, obtenerTokenVendedor, urlAutorizacion } from './mpConnect';

type Row = Record<string, unknown>;
const AHORA = new Date('2026-11-18T18:00:00.000Z');

beforeEach(() => {
  process.env.MP_TOKEN_ENC_KEY = randomBytes(32).toString('base64');
});
afterEach(() => {
  delete process.env.MP_TOKEN_ENC_KEY;
  delete process.env.MP_CONNECT_CLIENT_ID;
  delete process.env.MP_CONNECT_CLIENT_SECRET;
  delete process.env.MP_CONNECT_REDIRECT_URI;
  vi.unstubAllGlobals();
});

describe('cifrado de tokens', () => {
  it('ida y vuelta, con IV distinto cada vez', () => {
    const a = cifrarToken('APP_USR-123');
    expect(a).toMatch(/^v1:[\w-]+:[\w-]+:[\w-]+$/);
    expect(a).not.toContain('APP_USR');
    expect(cifrarToken('APP_USR-123')).not.toBe(a);
    expect(descifrarToken(a)).toBe('APP_USR-123');
  });

  it('detecta manipulación del texto cifrado o del tag', () => {
    const [v, iv, tag, ct] = cifrarToken('APP_USR-123').split(':');
    const otro = (s: string) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1);
    expect(() => descifrarToken([v, iv, tag, otro(ct)].join(':'))).toThrow();
    expect(() => descifrarToken([v, iv, otro(tag), ct].join(':'))).toThrow();
    expect(() => descifrarToken([v, iv, tag.slice(0, 6), ct].join(':'))).toThrow();
    expect(() => descifrarToken(['v2', iv, tag, ct].join(':'))).toThrow();
  });

  it('rechaza una llave inválida o distinta', () => {
    const c = cifrarToken('x');
    process.env.MP_TOKEN_ENC_KEY = randomBytes(32).toString('base64');
    expect(() => descifrarToken(c)).toThrow();
    process.env.MP_TOKEN_ENC_KEY = randomBytes(16).toString('base64');
    expect(() => cifrarToken('x')).toThrow(/32 bytes/);
    delete process.env.MP_TOKEN_ENC_KEY;
    expect(() => cifrarToken('x')).toThrow(/32 bytes/);
  });
});

describe('state del OAuth', () => {
  it('URL de autorización con los parámetros de MP', () => {
    const u = new URL(urlAutorizacion({ clientId: '123', clientSecret: 's', redirectUri: 'https://x.mx/cb' }, 'st'));
    expect(u.origin + u.pathname).toBe('https://auth.mercadopago.com/authorization');
    expect(Object.fromEntries(u.searchParams)).toEqual({ client_id: '123', response_type: 'code', platform_id: 'mp', state: 'st', redirect_uri: 'https://x.mx/cb' });
  });

  it('un solo uso: el segundo consumo falla', async () => {
    const { db } = fakeDb({ mp_oauth_states: [] });
    const state = (await crearState(db, 'T-A', AHORA))!;
    expect(await consumirState(db, state, AHORA)).toBe('T-A');
    expect(await consumirState(db, state, AHORA)).toBeNull();
  });

  it('vencido (> 10 min) se rechaza y se borra', async () => {
    const { db, tablas } = fakeDb({ mp_oauth_states: [{ state: 'viejo', tenant_id: 'T-A', created_at: '2026-11-18T17:49:00.000Z' }] });
    expect(await consumirState(db, 'viejo', AHORA)).toBeNull();
    expect(tablas.mp_oauth_states).toHaveLength(0);
  });

  it('desconocido se rechaza', async () => {
    const { db } = fakeDb({ mp_oauth_states: [{ state: 'a', tenant_id: 'T-A', created_at: AHORA.toISOString() }] });
    expect(await consumirState(db, 'b', AHORA)).toBeNull();
    expect(await consumirState(db, '', AHORA)).toBeNull();
  });
});

describe('obtenerTokenVendedor', () => {
  const conexion = (vence: string) => ({
    tenant_id: 'T-A', mp_user_id: '777', access_token_enc: cifrarToken('VIEJO'),
    refresh_token_enc: cifrarToken('TG-1'), token_expires_at: vence, live_mode: false,
  });

  it('sin conexión → null; vigente → sin refrescar', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await obtenerTokenVendedor(fakeDb({ tenant_mp_connections: [] }).db, 'T-A', AHORA)).toBeNull();
    const { db } = fakeDb({ tenant_mp_connections: [conexion('2027-03-01T00:00:00.000Z')] });
    expect(await obtenerTokenVendedor(db, 'T-A', AHORA)).toEqual({ accessToken: 'VIEJO', mpUserId: '777', liveMode: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('por vencer → refresca con refresh_token y guarda cifrado', async () => {
    process.env.MP_CONNECT_CLIENT_ID = 'cid';
    process.env.MP_CONNECT_CLIENT_SECRET = 'sec';
    process.env.MP_CONNECT_REDIRECT_URI = 'https://x.mx/cb';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 'NUEVO', refresh_token: 'TG-2', expires_in: 15552000, user_id: 777 })));
    vi.stubGlobal('fetch', fetchMock);
    const { db } = fakeDb({ tenant_mp_connections: [conexion('2026-11-20T00:00:00.000Z')] });
    // fakeDb no tiene upsert: se simula como update de la misma fila.
    type Q = Record<string, unknown> & { update: (f: Row) => { eq: (c: string, v: unknown) => unknown } };
    const f = db as unknown as { from: (t: string) => Q };
    const orig = f.from;
    f.from = (t) => {
      const q = orig(t);
      q.upsert = (fila: Row) => orig(t).update(fila).eq('tenant_id', fila.tenant_id);
      return q;
    };
    const t = await obtenerTokenVendedor(db, 'T-A', AHORA);
    expect(t?.accessToken).toBe('NUEVO');
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(cuerpo).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'TG-1', client_id: 'cid' });
    expect(await obtenerTokenVendedor(db, 'T-A', AHORA)).toMatchObject({ accessToken: 'NUEVO' });
  });
});
