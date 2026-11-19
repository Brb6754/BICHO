import { SLUG_MAX, slugError } from '@/lib/onboarding/slug';

// Cuando el link que quiere ya lo tiene otro negocio, en vez de dejarla
// inventando variantes le ofrecemos unas listas para tocar. Solo se
// sugieren las que pasan el mismo formato que exige la base; cuál está
// libre lo decide checkSlug con una consulta.
export function slugCandidates(slug: string): string[] {
  return ['2', '3', '4', 'mx'].map((suffix) => {
    const base = slug.slice(0, SLUG_MAX - suffix.length - 1).replace(/-+$/, '');
    return `${base}-${suffix}`;
  }).filter((s) => s !== slug && !slugError(s));
}
