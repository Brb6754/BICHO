// Bicho brand tokens — scoped ONLY to the marketing site
// (app/page.tsx, /privacidad, /terminos, the apex 404, and everything
// under components/marketing/).
//
// Deliberately NOT wired into tailwind.config.ts / globals.css: those
// drive the admin panel + tenant dashboards (the CSS-var system where
// each tenant's own brand colors take over). Repointing --color-primary
// here would retint every tenant's dashboard — see CLAUDE.md.
//
// 4th pass (2026-09-17): Bruno asked for purple tones with WHITE as the
// primary color. That inverted the page rather than recoloring it: the
// old palette was deep-teal-dominant (7 of 11 sections were a dark
// slab), so simply swapping teal for purple would have produced a
// purple-dominant page — the opposite of the brief. Now white is the
// ground almost everywhere, violet is the structural color (CTAs,
// chips, the hero visual, the two dark punctuation blocks), and lime
// stays exactly as it was: the literal logo color, spent as a spark and
// never as a field. Lime is NEVER text on white — it fails contrast
// (~1.4:1); on white it only ever appears as a fill under dark text.
export const BICHO = {
  // Light grounds — white is the page
  white: '#FFFFFF', // primary ground
  mist: '#F5F3FC', // lavender-tinted banding ground, separates sections
  mistDeep: '#EFEBFB', // card surface on a white section
  // Violet — the structural color
  violet: '#5B34E8', // vivid: CTAs, chips, icon fills, the hero visual
  violetDeep: '#4423C4', // pressed/hover state for violet surfaces
  violetInk: '#1B1040', // deep violet-black: the dark punctuation blocks
  violetRaised: '#2A1B5E', // raised panel inside a violetInk block
  // Accent — the real logo lime, unchanged
  lime: '#D4F23A',
  limeDeep: '#B5D42B', // pressed/hover state for lime surfaces
  // Text
  ink: '#140F2E', // near-black with a violet cast, on light grounds
  inkMuted: '#6A6488', // secondary text on light grounds
  onDark: '#FFFFFF',
  onDarkMuted: '#B9B1E6', // secondary text on violetInk
  onVioletMuted: '#E3DEFA', // secondary text on VIVID violet — a darker
  // muted tone only clears 3.5:1 there, which is why this is separate.
  // Hairlines
  line: '#332A63', // divider on violetInk
  lineOnLight: '#E6E2F4', // divider on white/mist
} as const;

// Radius scale — deliberate hierarchy, not one value everywhere.
// The reference rounds photos and cards moderately and pills fully;
// nothing is uniformly "rounded-3xl".
export const RADIUS = {
  sm: 'rounded-lg', // chips, small controls
  md: 'rounded-2xl', // cards, photos
  lg: 'rounded-[28px]', // large feature blocks
  pill: 'rounded-full', // buttons, badges
} as const;
