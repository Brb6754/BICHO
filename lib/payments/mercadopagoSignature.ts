import { createHmac, timingSafeEqual } from 'node:crypto';

// Verificación del header `x-signature` de los webhooks de Mercado Pago.
//
// Formato: "ts=<timestamp>,v1=<hmac-sha256 hex>". El HMAC se calcula con
// el secreto de webhooks (MP_WEBHOOK_SECRET, NO el access token) sobre el
// manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. Si falta
// data.id o x-request-id, MP omite esa parte del manifest.
//
// Ojo: MP no firma el cuerpo. Por eso el handler, además de verificar,
// vuelve a consultar el recurso en la API antes de cambiar nada.

export const MP_WEBHOOK_TOLERANCE_SECONDS = 300;

export type MpVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'missing_header' | 'malformed_header' | 'stale_timestamp' | 'bad_signature' };

export function buildMpManifest(dataId: string | null, requestId: string | null, ts: string): string {
  // MP pide data.id en minúsculas cuando es alfanumérico.
  const id = dataId ? `id:${dataId.toLowerCase()};` : '';
  const req = requestId ? `request-id:${requestId};` : '';
  return `${id}${req}ts:${ts};`;
}

export function verifyMercadoPagoSignature(input: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  toleranceSeconds?: number;
  nowMs?: number;
}): MpVerifyResult {
  if (!input.signatureHeader) return { ok: false, reason: 'missing_header' };

  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of input.signatureHeader.split(',')) {
    const [k, v] = part.split('=').map((s) => s?.trim());
    if (k === 'ts') ts = v ?? null;
    if (k === 'v1') v1 = v ?? null;
  }
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[0-9a-f]{64}$/i.test(v1)) {
    return { ok: false, reason: 'malformed_header' };
  }

  // La ventana va antes del HMAC: una firma reenviada es genuinamente
  // válida y el reloj es lo único que la detiene. MP ha mandado ts en
  // segundos y en milisegundos según la versión; se aceptan los dos.
  const tsNum = Number(ts);
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
  const now = input.nowMs ?? Date.now();
  const tolerance = (input.toleranceSeconds ?? MP_WEBHOOK_TOLERANCE_SECONDS) * 1000;
  if (Math.abs(now - tsMs) > tolerance) return { ok: false, reason: 'stale_timestamp' };

  const expected = createHmac('sha256', input.secret)
    .update(buildMpManifest(input.dataId, input.requestId, ts))
    .digest('hex');

  // Mismo largo garantizado (64 hex validado arriba), así que timingSafeEqual no lanza.
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1.toLowerCase(), 'hex');
  return timingSafeEqual(a, b) ? { ok: true } : { ok: false, reason: 'bad_signature' };
}
