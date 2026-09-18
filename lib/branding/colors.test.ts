import { describe, it, expect } from 'vitest';
import {
  darkenHex,
  lightenHex,
  toRgbTriplet,
  readableFgRgb,
  tenantCtaStyle,
  legibleBrandText,
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

  it('picks near-black on a mid-tone color where white fails AA', () => {
    // White on #DF4BE2 is ~3.5:1; near-black is ~6:1.
    expect(readableFgRgb('#DF4BE2')).toBe('17 24 21');
  });
});

describe('tenantCtaStyle', () => {
  it('keeps the brand primary as ink when it is legible on the accent', () => {
    expect(tenantCtaStyle('#0E3B2C', '#8FE24A').color).toBe('#0E3B2C');
  });

  it('falls back to a readable ink when primary and accent are both dark', () => {
    expect(tenantCtaStyle('#0E3B2C', '#1E3A8A').color).toBe('rgb(255 255 255)');
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

describe('tenantDarkModeCssVars — brand hue, not brand fill', () => {
  const triplet = (v: string) => v.split(' ').map(Number) as [number, number, number];
  const lum = ([r, g, b]: [number, number, number]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const chroma = ([r, g, b]: [number, number, number]) => Math.max(r, g, b) - Math.min(r, g, b);

  it('is a deep near-neutral, not the brand color as a solid fill', () => {
    // Bruno rejected an olive tenant getting a flat olive screen.
    const paper = triplet(tenantDarkModeCssVars('#EAD4AE', '#000000', '#445407')['--tenant-dark-paper']);
    expect(paper).not.toEqual(triplet(toRgbTriplet('#445407')));
    expect(lum(paper)).toBeLessThan(0.1);
    expect(chroma(paper)).toBeLessThanOrEqual(8);
  });

  it('keeps the brand temperature: a warm brand gives a warmer dark than a cool one', () => {
    const warm = triplet(tenantDarkModeCssVars('#C9A84C', '#4A5D23', '#C9A84C')['--tenant-dark-paper']);
    const cool = triplet(tenantDarkModeCssVars('#1E3A8A', '#0F1E4A', '#3B82F6')['--tenant-dark-paper']);
    expect(warm[0] - warm[2]).toBeGreaterThan(cool[0] - cool[2]);
  });

  it('never renders as black, even if every assigned color is black', () => {
    const vars = tenantDarkModeCssVars('#000000', '#010101', '#000000');
    expect(Math.max(...triplet(vars['--tenant-dark-paper']))).toBeGreaterThanOrEqual(18);
  });

  it('lifts cards off the page by lightness: paper < surface = glass < elevated', () => {
    const v = tenantDarkModeCssVars('#0E3B2C', '#0A2E22', '#8FE24A');
    const L = (k: string) => lum(triplet(v[k]));
    expect(L('--tenant-dark-paper')).toBeLessThan(L('--tenant-dark-surface'));
    expect(v['--tenant-dark-glass']).toBe(v['--tenant-dark-surface']);
    expect(L('--tenant-dark-surface')).toBeLessThan(L('--tenant-dark-elevated'));
  });

  it('lights the ground with the accent: a green brand with a gold accent glows gold', () => {
    const v = tenantDarkModeCssVars('#2C5E32', '#ACB07D', '#E2B93B');
    const glow = triplet(v['--tenant-dark-glow']);
    const paper = triplet(v['--tenant-dark-paper']);
    expect(chroma(glow)).toBeGreaterThan(80);
    expect(glow[0]).toBeGreaterThan(glow[2]); // gold, not blue
    expect(paper[1]).toBeGreaterThanOrEqual(paper[0]); // ground keeps the green primary's hue
  });

  it('tenantDarkBase matches the elevated token', () => {
    const v = tenantDarkModeCssVars('#EAD4AE', '#0E3B2C', '#445407');
    expect(toRgbTriplet(tenantDarkBase('#EAD4AE', '#0E3B2C', '#445407'))).toBe(v['--tenant-dark-elevated']);
  });
});

describe('legibleBrandText', () => {
  it('uses the primary when it reads on the ground', () => {
    expect(legibleBrandText('#0E3B2C', '#8FE24A', '#F7F6F3')).toBe('#0E3B2C');
  });

  it('skips a cream primary on a light page', () => {
    // #EAD4AE on #F7F6F3 is ~1.3:1; the olive accent reads.
    expect(legibleBrandText('#EAD4AE', '#445407', '#F7F6F3')).toBe('#445407');
  });

  it('falls back to the ink token when no brand color reads', () => {
    expect(legibleBrandText('#3A2A20', '#4A3526', '#2E150A')).toBe('rgb(var(--color-ink))');
  });
});
