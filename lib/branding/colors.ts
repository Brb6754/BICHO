// The platform's own light-mode palette (tailwind.config.ts primary/
// secondary/accent) — kept here too, as plain hex, for the tenant-facing
// pages that render it via inline `style` (a runtime CSS value can't
// reference a Tailwind class). Keep these three in sync with
// tailwind.config.ts by hand; there's no single source of truth shared
// between a JS/TS config and a place needing raw hex strings.
export const PLATFORM_PRIMARY = '#4F46E5'; // indigo-600
export const PLATFORM_SECONDARY = '#7C3AED'; // violet-600
export const PLATFORM_ACCENT = '#22D3EE'; // cyan-400
export const PLATFORM_GRADIENT = `linear-gradient(135deg, ${PLATFORM_PRIMARY}, ${PLATFORM_SECONDARY})`;

// Accepts a "#RRGGBB"/"#RGB" hex string OR an "rgb(r, g, b)" string —
// the latter because darkenHex()/lightenHex() below return that format
// (not hex), and every other color helper in this file (toRgbTriplet,
// withAlpha, readableFgRgb, ...) routes through parseHex. Without this,
// chaining e.g. toRgbTriplet(darkenHex(hex, 40)) silently fails to
// parse and falls back to a flat mid-gray instead of erroring — that
// exact bug shipped once already (--color-primary-dark/-secondary-soft
// /-accent-soft) before being caught here.
function parseHex(hex: string): [number, number, number] | null {
  const rgbMatch = hex.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Darkens a hex color by a flat amount per channel — used to build a
// two-stop gradient out of a single brand color, so it gets real depth
// instead of a flat fill without hardcoding any specific hue — works the
// same for whatever color a tenant picks.
export function darkenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
}

// Lightens a hex color by a flat amount per channel — the "soft" tint
// variant (secondary.soft/accent.soft) is a lighter version of the base
// color, not a darker one.
export function lightenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
}

// "R G B" (space-separated, no rgb() wrapper) — the format tailwind.config.ts
// needs for its rgb(var(--x) / <alpha-value>) tokens (see --color-primary
// etc. in globals.css). Falls back to a mid-gray if the input isn't a
// parseable hex, so a bad value never breaks the whole page.
export function toRgbTriplet(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '128 128 128';
  return rgb.join(' ');
}

// WCAG-ish relative luminance (0 = black, 1 = white) — used to decide
// whether text sitting on a color needs to be light or dark to stay
// readable, since a tenant's own brand color could be anywhere on that
// spectrum (a pale cream accent needs dark text; a deep navy primary
// needs light text) and a single hardcoded text-white breaks the moment
// a tenant's color is lighter than expected.
function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two colors (1 = identical, 21 = black on
// white). 4.5 is the AA minimum for normal-size text.
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const NEAR_BLACK = '#111815';

// The readable foreground for text/icons sitting directly on `hex` —
// "255 255 255" (white) or a near-black, as an "R G B" triplet ready
// for a CSS var. Picks whichever of the two actually has the higher
// contrast ratio. This used to be a flat "luminance > 0.5" split, which
// put WHITE text on mid-tone brand colors — a magenta like #DF4BE2 got
// 3.5:1 in white where near-black gives 6:1. The real crossover sits
// near luminance 0.2, not 0.5.
export function readableFgRgb(hex: string): string {
  return contrastRatio(hex, NEAR_BLACK) >= contrastRatio(hex, '#FFFFFF') ? '17 24 21' : '255 255 255';
}

// A brand color to use as TEXT (a price, an eyebrow, an icon) on a given
// ground. The tenant's primary is preferred, then its accent; if neither
// reaches 4.5:1 it falls back to the page's ink token. Brand colors were
// used as text unconditionally, so a cream primary made every price
// invisible on a light page, and a brown one did the same on a dark page.
export function legibleBrandText(primaryColor: string, accentColor: string, ground: string): string {
  if (contrastRatio(primaryColor, ground) >= 4.5) return primaryColor;
  if (contrastRatio(accentColor, ground) >= 4.5) return accentColor;
  return 'rgb(var(--color-ink))';
}

// A translucent version of a hex color — the "tint" used for glass
// surfaces (0 = invisible, 1 = fully opaque). Builds a real rgba()
// string instead of the `${hex}NN` string-concat trick, which silently
// produces garbage if the color isn't already a plain 6-digit hex (an
// rgb()/rgba() string, a named color, etc.).
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Blends two colors into one flat, fully opaque color — `weight` is how
// much of `hex` survives (0 = pure `towardHex`, 1 = pure `hex`). Used
// below to build a subtle, opaque tenant tint instead of a translucent
// wash — the redesign away from glassmorphism (2026) moved every card
// surface off blur+transparency entirely, so blending needs to happen
// in the color itself, not at render time via alpha.
function mixHex(hex: string, towardHex: string, weight: number): string {
  const a = parseHex(hex);
  const b = parseHex(towardHex);
  if (!a || !b) return hex;
  const mixed = a.map((c, i) => Math.round(c * weight + b[i] * (1 - weight)));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

// The tenant-branded card background — a flat, fully OPAQUE color: a
// touch of the tenant's own primary+accent blend mixed into a neutral
// base, not a translucent wash over glass. Replaces the old
// glassmorphism version (gradient wash + backdrop-blur) as part of the
// 2026 redesign away from glass toward the soft-shadow/opaque-card
// language in Bruno's reference set — nothing on the public booking
// page is translucent or blurred anymore. `level` mirrors
// .glass-1/2/3's depth ordering: higher levels (modals, the booking
// card) get a slightly stronger tint. `darkBase`, when passed (a hex —
// see tenantDarkBase() above), replaces the default white base so a
// card in dark mode tints from the tenant's own dark anchor color
// instead of white.
export function tenantGlassBackground(
  primaryColor: string,
  accentColor: string,
  level: 1 | 2 | 3 = 2,
  darkBase?: string
): string {
  // Deliberately almost neutral. These values used to be 0.05/0.07/
  // 0.09, which tinted every card on the page with the brand colour —
  // and a surface that is 9% brand everywhere reads as a coloured
  // page, not as a designed one. Colour now belongs to the things a
  // visitor acts on (the CTA, the selected slot, the active step);
  // surfaces are paper, separated by hairlines and one soft shadow.
  // The trace of tint that remains is what keeps a white card from
  // looking clinically detached from the tenant's palette.
  const tint = { 1: 0.012, 2: 0.02, 3: 0.028 }[level];
  const blend = mixHex(primaryColor, accentColor, 0.6);
  return mixHex(blend, darkBase ?? '#FFFFFF', tint);
}

// Same two-stop gradient + colored glow used for primary CTAs, built
// from this tenant's own accent color instead of a fixed platform hue.
export function tenantCtaStyle(primaryColor: string, accentColor: string): { background: string; color: string; boxShadow: string } {
  const end = darkenHex(accentColor, 25);
  // Text sits on a gradient, so check it against the darker end too.
  // The tenant's primary is the preferred ink (it keeps the button
  // on-brand), but only when it's actually legible on BOTH ends — two
  // dark brand colors, or indigo on cyan, used to produce a button whose
  // label you had to squint at. Otherwise fall back to black or white.
  const onBrand = Math.min(contrastRatio(primaryColor, accentColor), contrastRatio(primaryColor, end)) >= 4.5;
  return {
    background: `linear-gradient(135deg, ${accentColor}, ${end})`,
    color: onBrand ? primaryColor : `rgb(${readableFgRgb(mixHex(accentColor, end, 0.5))})`,
    boxShadow: `0 10px 26px ${withAlpha(accentColor, 0.35)}`,
  };
}

// Overrides for every --color-primary/-secondary/-accent(-*) custom
// property tailwind.config.ts's primary/secondary/accent tokens read
// (see globals.css's :root block for the platform defaults these
// replace). Set this as the `style` on a layout's root element — e.g.
// the tenant dashboard — and EVERY existing bg-primary/text-accent/
// shadow-glow-primary/etc. usage anywhere inside it retints to this
// tenant's own colors, including components that were written with no
// idea a tenant could ever override them (MetricCard, StatusBadge,
// EmptyState, Dropdown, ...). This is the "0 fixed colors" answer:
// fix the token, not every place the token gets used.
export function tenantColorCssVars(
  primaryColor: string,
  secondaryColor: string,
  accentColor: string
): Record<string, string> {
  return {
    '--color-primary': toRgbTriplet(primaryColor),
    '--color-primary-dark': toRgbTriplet(darkenHex(primaryColor, 40)),
    '--color-secondary': toRgbTriplet(secondaryColor),
    '--color-secondary-soft': toRgbTriplet(lightenHex(secondaryColor, 40)),
    '--color-accent': toRgbTriplet(accentColor),
    '--color-accent-soft': toRgbTriplet(lightenHex(accentColor, 40)),
    '--color-cta-fg': readableFgRgb(primaryColor),
  };
}

// ── DARK MODE ───────────────────────────────────────────────────────
// Dark mode used to paint the page with the tenant's darkest brand color
// as-is: an olive tenant got a flat olive screen, a purple one a flat
// purple screen. A saturated color at full-page scale reads as a heavy
// solid slab (Bruno: "no me gusta el color sólido"), and it fought every
// piece of content on top of it.
//
// Now the brand gives dark mode its HUE, not its fill. The ground is a
// deep, nearly neutral dark carrying a small amount of that hue (so an
// olive business gets a warm charcoal, a navy one a cool charcoal), and
// the brand color itself returns as a soft glow at the top of the page
// (--tenant-dark-glow, drawn in globals.css). Still built only from the
// tenant's own colors, still never black.

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [r1, g1, b1].map((v) => Math.round((v + m) * 255)) as [number, number, number];
}

function hslOf(color: string): [number, number, number] | null {
  const rgb = parseHex(color);
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb);
  // Near-black, near-white and near-grey carry no usable hue.
  return hsl[2] > 0.06 && hsl[2] < 0.94 && hsl[1] >= 0.1 ? hsl : null;
}

// The hue to build from: the color given as `preferred` when it has one
// (the primary for the ground: it's the brand's identity color), else the
// most saturated of the rest, else a neutral.
function pickHue(preferred: string, others: string[]): [number, number, number] {
  const own = hslOf(preferred);
  if (own) return own;
  const rest = others.map(hslOf).filter((h): h is [number, number, number] => h !== null);
  if (rest.length === 0) return [0, 0, 0.5];
  return rest.reduce((best, c) => (c[1] > best[1] ? c : best));
}

// How much of the brand survives in the ground. Enough to tell a warm
// brand from a cool one side by side; not enough to read as "colored".
const DARK_TINT_SATURATION = 0.14;

type DarkPalette = { paper: string; surface: string; elevated: string; glass: string; glow: string };

function tenantDarkPalette(primaryColor: string, secondaryColor: string, accentColor: string): DarkPalette {
  // Ground from the primary (identity); glow from the accent, the color a
  // brand already uses to highlight, so an olive spa with gold details
  // gets a green-tinted charcoal lit in gold rather than one flat hue.
  const [h, s] = pickHue(primaryColor, [secondaryColor, accentColor]);
  const [gh, gs] = pickHue(accentColor, [primaryColor, secondaryColor]);
  const tint = Math.min(s, DARK_TINT_SATURATION);
  const tone = (l: number) => toRgbTriplet(`rgb(${hslToRgb(h, tint, l).join(', ')})`);
  return {
    paper: tone(0.085),
    // Lists (bg-surface) and Cards (glass) are the same kind of thing, a
    // card on the page, so they share one tone. Modals and dropdowns
    // (elevated) sit a step above both.
    surface: tone(0.13),
    glass: tone(0.13),
    elevated: tone(0.165),
    // The glow keeps real color, capped so a neon brand doesn't blaze.
    glow: toRgbTriplet(`rgb(${hslToRgb(gh, Math.min(gs, 0.62), 0.5).join(', ')})`),
  };
}

// The dark-mode "elevated" tone as a color string, for helpers that build
// a raw color instead of reading a CSS var (tenantGlassBackground's cards
// on the public page). Same palette, so the two can never drift apart.
export function tenantDarkBase(primaryColor: string, secondaryColor: string, accentColor: string): string {
  return `rgb(${tenantDarkPalette(primaryColor, secondaryColor, accentColor).elevated.split(' ').join(', ')})`;
}

// Consumed only under `.dark .tenant-shell` in globals.css, so light mode
// and the admin panel (which never carries that class) are untouched.
// paper < surface = glass < elevated: cards lift off the ground by
// lightness alone, with no saturated fill doing the work.
export function tenantDarkModeCssVars(
  primaryColor: string,
  secondaryColor: string,
  accentColor: string
): Record<string, string> {
  const p = tenantDarkPalette(primaryColor, secondaryColor, accentColor);
  return {
    '--tenant-dark-paper': p.paper,
    '--tenant-dark-surface': p.surface,
    '--tenant-dark-elevated': p.elevated,
    '--tenant-dark-glass': p.glass,
    '--tenant-dark-glow': p.glow,
  };
}

// The tenant dashboard's own sidebar gradient — a plain, fully OPAQUE
// two-stop gradient (primary at top, secondary at bottom), same shape
// as the platform's own fixed SIDEBAR_GRADIENT once that's redesigned
// alongside this. No more alpha-blending over the page behind it or a
// translucent white base — part of the 2026 move away from
// glassmorphism, the sidebar is now a solid brand-colored panel (depth
// comes from the shadow already on its className, not from blur).
export function tenantSidebarGradient(primaryColor: string, secondaryColor: string): string {
  return `linear-gradient(to bottom, ${primaryColor}, ${secondaryColor})`;
}

// The readable foreground for text sitting on tenantSidebarGradient().
// Reads luminance off a 50/50 blend of primary+secondary rather than
// either color alone — the gradient spans both, and text has to work
// reasonably well against the whole panel, not just one end of it.
export function tenantSidebarFg(primaryColor: string, secondaryColor: string): string {
  return readableFgRgb(mixHex(primaryColor, secondaryColor, 0.5));
}
