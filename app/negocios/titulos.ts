import type { NegocioDirectorio } from '@/lib/directorio/directorio';

/** Nombre de la ciudad tal como la escribió un dueño; si no hay, el slug legible. */
export function nombreCiudad(negociosDeLaCiudad: NegocioDirectorio[], slug: string): string {
  return negociosDeLaCiudad[0]?.ciudad ?? slug.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
