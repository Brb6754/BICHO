// bicho central — studio brand tokens, scoped to app/page.tsx and
// components/central/ only.
//
// The accent is NOT a guess: #3B00FF is the exact colour inside Bruno's
// own logo file (public/logo-central.png), pulled by scanning the PNG's
// pixels — the mark is white letters plus that one electric indigo on
// the "i" slash and the "o" bug. Everything else on this page is built
// around it.
//
// Contrast, measured (WCAG relative luminance, not eyeballed):
//   white on accent .......... 7.98:1  ✓ buttons
//   white on page ............ 19.8:1  ✓
//   accentText on page ....... 8.30:1  ✓ labels, eyebrows, second lines
//   muted on page ............ 6.01:1  ✓ body
//   mutedOnCard on card ...... 6.76:1  ✓
//   accent AS TEXT on page ... 2.48:1  ✗ never — that's what accentText is for
export const CENTRAL = {
  // Grounds
  page: '#05091C', // near-black navy, the page
  card: '#0B1030', // raised surface for cards
  cardHi: '#101641', // hover / elevated card
  // Brand
  accent: '#3B00FF', // from the logo file — fills only
  accentLift: '#5B2BFF', // gradient partner / hover
  accentText: '#A99BFF', // the accent as TEXT on dark (accent itself fails)
  // Text
  onDark: '#FFFFFF',
  muted: '#7E8DB8',
  mutedOnCard: '#8C9BC9',
  // Hairlines — alpha over the ground, so cards keep depth without a
  // hard grey line
  line: 'rgba(255,255,255,0.09)',
} as const;

export const RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-2xl',
  lg: 'rounded-3xl',
  pill: 'rounded-full',
} as const;
