import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Cifrado de los tokens OAuth de Mercado Pago de cada negocio antes de
// guardarlos en tenant_mp_connections. Con esos tokens se cobra a nombre
// del negocio: una fuga de la tabla sin la llave (MP_TOKEN_ENC_KEY, solo
// en Vercel) no sirve de nada.
//
// AES-256-GCM, IV aleatorio de 12 bytes por cifrado, formato versionado
// `v1:<iv>:<tag>:<ct>` en base64url — la versión deja rotar el esquema
// sin adivinar cómo se cifró cada fila.

const VERSION = 'v1';

function llave(): Buffer {
  const k = Buffer.from(process.env.MP_TOKEN_ENC_KEY ?? '', 'base64');
  if (k.length !== 32) throw new Error('MP_TOKEN_ENC_KEY debe ser 32 bytes en base64.');
  return k;
}

export function cifrarToken(plano: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', llave(), iv);
  const ct = Buffer.concat([c.update(plano, 'utf8'), c.final()]);
  return [VERSION, iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join(':');
}

/** Lanza si el texto fue manipulado, la versión no se reconoce o la llave no es la correcta. */
export function descifrarToken(cifrado: string): string {
  const [v, iv, tag, ct] = cifrado.split(':');
  if (v !== VERSION || !iv || !tag || ct === undefined) throw new Error('Token cifrado con formato desconocido.');
  // authTagLength fijo: sin él Node acepta un tag truncado a 4 bytes.
  const d = createDecipheriv('aes-256-gcm', llave(), Buffer.from(iv, 'base64url'), { authTagLength: 16 });
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
}
