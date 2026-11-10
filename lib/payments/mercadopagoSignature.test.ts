import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildMpManifest, verifyMercadoPagoSignature } from './mercadopagoSignature';

const secret = 'test_webhook_secret';
const nowMs = 1_762_689_600_000; // fijo
const ts = String(Math.floor(nowMs / 1000));

function sign(dataId: string | null, requestId: string | null, t = ts, key = secret) {
  return createHmac('sha256', key).update(buildMpManifest(dataId, requestId, t)).digest('hex');
}

describe('verifyMercadoPagoSignature', () => {
  it('accepts a valid signature', () => {
    const header = `ts=${ts},v1=${sign('123456', 'req-1')}`;
    expect(verifyMercadoPagoSignature({ signatureHeader: header, requestId: 'req-1', dataId: '123456', secret, nowMs })).toEqual({ ok: true });
  });

  it('lowercases alphanumeric data.id like MP does', () => {
    const header = `ts=${ts},v1=${sign('abc123', 'req-1')}`;
    expect(verifyMercadoPagoSignature({ signatureHeader: header, requestId: 'req-1', dataId: 'ABC123', secret, nowMs }).ok).toBe(true);
  });

  it('accepts a millisecond timestamp', () => {
    const tsMs = String(nowMs);
    const header = `ts=${tsMs},v1=${sign('1', 'r', tsMs)}`;
    expect(verifyMercadoPagoSignature({ signatureHeader: header, requestId: 'r', dataId: '1', secret, nowMs }).ok).toBe(true);
  });

  it('rejects a wrong secret', () => {
    const header = `ts=${ts},v1=${sign('123456', 'req-1', ts, 'other')}`;
    expect(verifyMercadoPagoSignature({ signatureHeader: header, requestId: 'req-1', dataId: '123456', secret, nowMs })).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects a tampered data.id', () => {
    const header = `ts=${ts},v1=${sign('123456', 'req-1')}`;
    expect(verifyMercadoPagoSignature({ signatureHeader: header, requestId: 'req-1', dataId: '999', secret, nowMs }).ok).toBe(false);
  });

  it('rejects an old timestamp even with a valid HMAC', () => {
    const old = String(Number(ts) - 301);
    const header = `ts=${old},v1=${sign('1', 'r', old)}`;
    expect(verifyMercadoPagoSignature({ signatureHeader: header, requestId: 'r', dataId: '1', secret, nowMs })).toEqual({
      ok: false,
      reason: 'stale_timestamp',
    });
  });

  it('rejects missing or malformed headers', () => {
    expect(verifyMercadoPagoSignature({ signatureHeader: null, requestId: 'r', dataId: '1', secret, nowMs }).ok).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=zz`, requestId: 'r', dataId: '1', secret, nowMs })).toEqual({
      ok: false,
      reason: 'malformed_header',
    });
  });

  it('omits missing parts from the manifest', () => {
    expect(buildMpManifest(null, null, '1')).toBe('ts:1;');
    expect(buildMpManifest('A', 'r', '1')).toBe('id:a;request-id:r;ts:1;');
  });
});
