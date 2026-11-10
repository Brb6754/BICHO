import { isReservedSlug } from '@/lib/domains';

// El slug es el subdominio: {slug}.bichomx.com. Mismo formato que el
// check constraint de la tabla (db/001, tenants.slug_format).
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MIN = 3;
// Una etiqueta DNS aguanta 63; 40 sobra para un nombre de negocio y
// cabe en un link de WhatsApp sin partirse.
export const SLUG_MAX = 40;

// "Barbería El Punto" → "barberia-el-punto"
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-$/, '');
}

// null = válido. Solo formato y reservados; si ya está ocupado lo dice
// la base (checkSlug / registerBusiness).
export function slugError(slug: string): string | null {
  if (slug.length < SLUG_MIN) return `Usa al menos ${SLUG_MIN} letras o números.`;
  if (slug.length > SLUG_MAX) return `Máximo ${SLUG_MAX} caracteres.`;
  if (!SLUG_REGEX.test(slug)) return 'Solo minúsculas, números y guiones (no al inicio ni al final).';
  if (isReservedSlug(slug)) return 'Ese nombre está reservado. Elige otro.';
  return null;
}
