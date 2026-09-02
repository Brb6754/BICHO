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

// The readable foreground for text/icons sitting directly on `hex` —
// "255 255 255" (white) or a near-black, as an "R G B" triplet ready
// for a CSS var. 0.5 is a deliberately simple threshold (not full WCAG
// contrast-ratio math against every possible background) — good enough
// to pick the right side for any real brand color without needing to
// know the exact alpha/blur it'll be composited through.
export function readableFgRgb(hex: string): string {
  return relativeLuminance(hex) > 0.5 ? '17 24 21' : '255 255 255';
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
  const tint = { 1: 0.05, 2: 0.07, 3: 0.09 }[level];
  const blend = mixHex(primaryColor, accentColor, 0.6);
  return mixHex(blend, darkBase ?? '#FFFFFF', tint);
}

// Same two-stop gradient + colored glow used for primary CTAs, built
// from this tenant's own accent color instead of a fixed platform hue.
export function tenantCtaStyle(primaryColor: string, accentColor: string): { background: string; color: string; boxShadow: string } {
  return {
    background: `linear-gradient(135deg, ${accentColor}, ${darkenHex(accentColor, 25)})`,
    color: primaryColor,
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

// Whichever of a tenant's colors is visually darkest — used below to
// pick which one anchors the dashboard's dark-mode page background.
// Pure (or near-pure) black is skipped on purpose: a tenant's
// "darkest" color is sometimes literally #000000 (a default/unset
// pick, or just a genuine choice), and anchoring the whole page
// background to flat black throws away the tenant's actual hue —
// black has no identity of its own. Falls back to considering black
// anyway only if it's truly the tenant's only color (all three would
// otherwise be near-black), so this never crashes on an edge case.
function darkestOf(colors: string[]): string {
  const withHue = colors.filter((c) => relativeLuminance(c) > 0.005);
  const pool = withHue.length > 0 ? withHue : colors;
  return pool.reduce((darkest, c) => (relativeLuminance(c) < relativeLuminance(darkest) ? c : darkest));
}

// The tenant's own dark-mode "elevated" tone as a hex color — same
// darkestOf() + lightenHex(24) as tenantDarkModeCssVars' own
// --tenant-dark-elevated, exposed separately (as hex, not a triplet)
// so other helpers that build a raw color string — tenantGlassBackground
// below — can use the exact same anchor color instead of duplicating
// this logic or drifting out of sync with it.
export function tenantDarkBase(primaryColor: string, secondaryColor: string, accentColor: string): string {
  return lightenHex(darkestOf([primaryColor, secondaryColor, accentColor]), 24);
}

// Overrides for --color-paper/-surface/-elevated/-glass-base, but
// ONLY consumed under `.dark .tenant-shell` in globals.css — never in
// light mode. Dark mode's paper/surface/elevated/glass are otherwise a
// fixed platform navy (see :root/.dark in globals.css), which was
// never meant to be tenant-aware. That's fine for the platform's own
// indigo/violet, but once a tenant's own darkest color is, say, a deep
// forest green, the fixed navy reads as an unrelated "off-brand" grey
// dropped on top of their glass panels instead of a shade of their own
// identity. Anchoring the page AND card backgrounds to the tenant's
// own darkest assigned color (primary/secondary/accent, skipping pure
// black — see darkestOf()) instead fixes that — same idea as
// tenantColorCssVars, one more layer down. Each step lightens a bit
// more than the last, preserving the same layered-depth feel `.dark`
// already had (paper darkest, then surface, elevated, glass — glass is
// the lightest since Card's default "raised" elevation is a translucent
// .glass-2 panel that needs to visibly lift off the page behind it).
export function tenantDarkModeCssVars(
  primaryColor: string,
  secondaryColor: string,
  accentColor: string
): Record<string, string> {
  const base = darkestOf([primaryColor, secondaryColor, accentColor]);
  return {
    '--tenant-dark-paper': toRgbTriplet(base),
    '--tenant-dark-surface': toRgbTriplet(lightenHex(base, 14)),
    '--tenant-dark-elevated': toRgbTriplet(lightenHex(base, 24)),
    '--tenant-dark-glass': toRgbTriplet(lightenHex(base, 32)),
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
