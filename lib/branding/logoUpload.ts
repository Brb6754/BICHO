// Validación de la marca que el dueño sube desde su panel (/dashboard/marca).
// Puro y sin dependencias para que el cliente y el server action usen la
// misma regla y se pueda probar.

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type LogoType = (typeof LOGO_TYPES)[number];
export const LOGO_EXT: Record<LogoType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

// Tamaño y tipo declarado: lo que el navegador puede revisar antes de subir.
export function logoFileError(file: { size: number; type: string }): string | null {
  if (!file.size) return 'El archivo está vacío.';
  if (file.size > LOGO_MAX_BYTES) return 'El logo pesa más de 2 MB.';
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return 'Sube el logo en JPG, PNG o WebP.';
  return null;
}

// El tipo real por sus primeros bytes. file.type lo manda el cliente y se
// puede falsear; esto es lo que decide en el server.
export function sniffImageType(bytes: Uint8Array): LogoType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}
