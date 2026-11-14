import { createHmac, timingSafeEqual } from 'node:crypto';

// Meta firma cada webhook con el App Secret: X-Hub-Signature-256 =
// "sha256=" + HMAC-SHA256(body CRUDO). Se calcula sobre los bytes tal
// como llegaron — re-serializar el JSON cambia espacios/escapes y la
// firma deja de coincidir. Sin secreto configurado se rechaza todo:
// mejor no atender que atender a cualquiera.
export function firmaValida(rawBody: string, header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith('sha256=')) return false;
  const esperada = Buffer.from(createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex'), 'utf8');
  const recibida = Buffer.from(header.slice('sha256='.length), 'utf8');
  // timingSafeEqual truena con longitudes distintas; distinta longitud ya es "no".
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

/** Comparación en tiempo constante para el verify token del GET. */
export function igualSeguro(a: string | null | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}
