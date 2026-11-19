import { describe, expect, it } from 'vitest';
import { slugCandidates } from './sugerencia';
import { SLUG_MAX, slugError } from '@/lib/onboarding/slug';

describe('slugCandidates', () => {
  it('propone variantes válidas del mismo link', () => {
    expect(slugCandidates('casa-luma')).toEqual(['casa-luma-2', 'casa-luma-3', 'casa-luma-4', 'casa-luma-mx']);
  });

  it('recorta un link largo para que la variante quepa y no termine en guion', () => {
    const largo = 'a'.repeat(SLUG_MAX - 2) + '-b';
    const out = slugCandidates(largo);
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(s.length).toBeLessThanOrEqual(SLUG_MAX);
      expect(slugError(s)).toBeNull();
    }
  });
});
