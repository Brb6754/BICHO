import { describe, it, expect } from 'vitest';
import {
  darkenHex,
  lightenHex,
  toRgbTriplet,
  readableFgRgb,
  withAlpha,
  tenantGlassBackground,
  tenantColorCssVars,
  tenantDarkBase,
  tenantDarkModeCssVars,
} from './colors';

describe('toRgbTriplet', () => {
  it('parses a 6-digit hex into a space-separated triplet', () => {
    expect(toRgbTriplet('#4F46E5')).toBe('79 70 229');
  });

  it('expands a 3-digit hex', () => {
    expect(toRgbTriplet('#fff')).toBe('255 255 255');
  });

  it('falls back to mid-gray for an unparseable value instead of throwing', () => {
    expect(toRgbTriplet('not-a-color')).toBe('128 128 128');
  });
});

describe('darkenHex / lightenHex feeding back into toRgbTriplet', () => {
  // Regression test for a real bug found this session: darkenHex/
  // lightenHex return "rgb(r, g, b)" strings, and toRgbTriplet used to
  // only understand hex — chaining the two silently produced the "128
  // 128 128" fallback instead of a real color. parseHex was fixed to
  // accept both formats; this locks that fix in place.
  it('toRgbTriplet(darkenHex(...)) produces a real color, not the gray fallback', () => {
    const result = toRgbTriplet(darkenHex('#4F46E5', 40));
    expect(result).not.toBe('128 128 128');
    expect(result).toBe('39 30 189');
  });

  it('toRgbTriplet(lightenHex(...)) produces a real color, not the gray fallback', () => {
    const result = toRgbTriplet(lightenHex('#4F46E5', 40));
    expect(result).not.toBe('128 128 128');
    expect(result).toBe('119 110 255');
  });

  it('darkenHex clamps at 0, never goes negative', () => {
    expect(darkenHex('#000000', 40)).toBe('rgb(0, 0, 0)');
  });

  it('lightenHex clamps at 255, never overflows', () => {
    expect(lightenHex('#FFFFFF', 40)).toBe('rgb(255, 255, 255)');
  });
});

describe('readableFgRgb', () => {
  it('picks near-black text for a light background', () => {
    expect(readableFgRgb('#F5E9C8')).toBe('17 24 21');
  });

  it('picks white text for a dark background', () => {
    expect(readableFgRgb('#0E3B2C')).toBe('255 255 255');
  });
});

describe('withAlpha', () => {
  it('builds a real rgba() string', () => {
    expect(withAlpha('#4F46E5', 0.5)).toBe('rgba(79, 70, 229, 0.5)');
  });
});

describe('tenantGlassBackground', () => {
  it('uses a white base by default (light mode)', () => {
    const bg = tenantGlassBackground('#4F46E5', '#22D3EE', 2);
    expect(bg).toContain('rgba(255, 255, 255, 0.75)');
  });

  it('uses the given dark base instead of white when darkBase is passed', () => {
    const bg = tenantGlassBackground('#4F46E5', '#22D3EE', 2, '#0E3B2C');
    expect(bg).not.toContain('255, 255, 255');
    expect(bg).toContain('rgba(14, 59, 44, 0.75)');
  });
});

describe('tenantColorCssVars', () => {
  it('returns all seven expected CSS custom properties with real (non-fallback) values', () => {
    const vars = tenantColorCssVars('#4F46E5', '#7C3AED', '#22D3EE');
    expect(Object.keys(vars).sort()).toEqual(
      [
        '--color-accent',
        '--color-accent-soft',
        '--color-cta-fg',
        '--color-primary',
        '--color-primary-dark',
        '--color-secondary',
        '--color-secondary-soft',
      ].sort()
    );
    for (const value of Object.values(vars)) {
      expect(value).not.toBe('128 128 128');
    }
  });
});

describe('tenantDarkBase / tenantDarkModeCssVars — "darkest, except pure black"', () => {
  it('anchors to the darkest color when none of them are pure black', () => {
    // #0E3B2C is darker than #0A2E22... actually reverse this to be
    // unambiguous: primary lighter, secondary darkest, accent lightest.
    const base = tenantDarkBase('#EAD4AE', '#0E3B2C', '#445407');
    // darkest of the three (excluding black) is the deep green primary
    // shade — confirm it's anchored there, not to the lightest (cream)
    // or the mid-tone (olive).
    const vars = tenantDarkModeCssVars('#EAD4AE', '#0E3B2C', '#445407');
    expect(vars['--tenant-dark-paper']).toBe(toRgbTriplet('#0E3B2C'));
    expect(base).not.toBe('#EAD4AE');
  });

  it('skips pure black and anchors to the next-darkest color instead', () => {
    // Real production case found this session: a tenant's secondary
    // color was exactly #000000 — anchoring dark mode to flat black
    // throws away all brand identity, so darkestOf() must skip it.
    const vars = tenantDarkModeCssVars('#EAD4AE', '#000000', '#445407');
    expect(vars['--tenant-dark-paper']).toBe(toRgbTriplet('#445407'));
    expect(vars['--tenant-dark-paper']).not.toBe(toRgbTriplet('#000000'));
  });

  it('falls back to black if literally every assigned color is near-black', () => {
    const vars = tenantDarkModeCssVars('#000000', '#010101', '#000000');
    // No non-black color exists to prefer — must not crash, and must
    // still return a value assembled from one of the given colors.
    expect(vars['--tenant-dark-paper']).toBeTruthy();
  });

  it('each step lightens progressively — paper < surface < elevated < glass', () => {
    const vars = tenantDarkModeCssVars('#0E3B2C', '#0A2E22', '#8FE24A');
    const sum = (triplet: string) => triplet.split(' ').reduce((a, b) => a + Number(b), 0);
    expect(sum(vars['--tenant-dark-paper'])).toBeLessThan(sum(vars['--tenant-dark-surface']));
    expect(sum(vars['--tenant-dark-surface'])).toBeLessThan(sum(vars['--tenant-dark-elevated']));
    expect(sum(vars['--tenant-dark-elevated'])).toBeLessThan(sum(vars['--tenant-dark-glass']));
  });
});
