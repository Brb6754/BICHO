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
  // 2026 redesign: away from a translucent gradient wash over glass,
  // toward one flat, fully opaque rgb() color — a subtle tenant tint
  // mixed into a neutral base. No more rgba()/gradient/backdrop-blur
  // anywhere in this value.
  function parseRgb(css: string): [number, number, number] {
    const match = css.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) throw new Error(`Expected a plain rgb() string, got: ${css}`);
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }

  it('returns a single opaque rgb() color, not a gradient or rgba()', () => {
    const bg = tenantGlassBackground('#4F46E5', '#22D3EE', 2);
    expect(bg).not.toContain('gradient');
    expect(bg).not.toContain('rgba');
    expect(() => parseRgb(bg)).not.toThrow();
  });

  it('defaults to a white base (light mode) — mostly white, with a subtle tint', () => {
    const [r, g, b] = parseRgb(tenantGlassBackground('#4F46E5', '#22D3EE', 2));
    // Every channel should be close to 255 (white) since the tint at
    // level 2 is a light 7% mix — but not exactly white, or the tint
    // did nothing.
    expect(r).toBeGreaterThan(220);
    expect(g).toBeGreaterThan(220);
    expect(b).toBeGreaterThan(220);
    expect([r, g, b]).not.toEqual([255, 255, 255]);
  });

  it('uses the given dark base instead of white when darkBase is passed', () => {
    const [r, g, b] = parseRgb(tenantGlassBackground('#4F46E5', '#22D3EE', 2, '#0E3B2C'));
    // Should land close to darkBase's own channels (14, 59, 44), not
    // anywhere near white.
    expect(r).toBeLessThan(220);
    expect(g).toBeLessThan(220);
    expect(b).toBeLessThan(220);
  });

  it('higher levels apply a stronger tint (further from the base color)', () => {
    const level1 = parseRgb(tenantGlassBackground('#0E3B2C', '#8FE24A', 1));
    const level3 = parseRgb(tenantGlassBackground('#0E3B2C', '#8FE24A', 3));
    const distanceFromWhite = ([r, g, b]: [number, number, number]) => 255 * 3 - (r + g + b);
    expect(distanceFromWhite(level3)).toBeGreaterThan(distanceFromWhite(level1));
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

  it('never renders as black, even if literally every assigned color is black', () => {
    // Real ask this session: a tenant's dark mode must never show a
    // black background, and must only ever be built from colors the
    // tenant actually entered (no platform-default color standing in).
    // With every input at or near #000000 there's no non-black color
    // left to prefer, so floorDarkness() must lift the chosen base
    // itself rather than pass through true black.
    const vars = tenantDarkModeCssVars('#000000', '#010101', '#000000');
    const [r, g, b] = vars['--tenant-dark-paper'].split(' ').map(Number);
    expect(Math.max(r, g, b)).toBeGreaterThanOrEqual(24);
  });

  it('floors a genuinely dark (but not pure black) tenant color too', () => {
    // The more common real case: not literal #000000, just a very dark
    // color a tenant actually picked (e.g. a near-black "premium" navy)
    // — darkestOf() has no reason to skip it (it has real hue), but
    // left completely unmodified it would still render as black on
    // screen. floorDarkness() must lift it regardless.
    const vars = tenantDarkModeCssVars('#EAD4AE', '#141008', '#445407');
    const [r, g, b] = vars['--tenant-dark-paper'].split(' ').map(Number);
    expect(Math.max(r, g, b)).toBeGreaterThanOrEqual(24);
  });

  it('each step lightens progressively — paper < surface < elevated < glass', () => {
    const vars = tenantDarkModeCssVars('#0E3B2C', '#0A2E22', '#8FE24A');
    const sum = (triplet: string) => triplet.split(' ').reduce((a, b) => a + Number(b), 0);
    expect(sum(vars['--tenant-dark-paper'])).toBeLessThan(sum(vars['--tenant-dark-surface']));
    expect(sum(vars['--tenant-dark-surface'])).toBeLessThan(sum(vars['--tenant-dark-elevated']));
    expect(sum(vars['--tenant-dark-elevated'])).toBeLessThan(sum(vars['--tenant-dark-glass']));
  });
});
