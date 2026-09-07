// Bicho brand tokens — scoped ONLY to the marketing homepage
// (app/page.tsx + everything under components/marketing/).
//
// Deliberately NOT wired into tailwind.config.ts / globals.css: those
// drive the admin panel + tenant dashboards (indigo/violet CSS-var
// system, plus each tenant's own branding colors). Repointing
// --color-primary/--color-accent to this palette would retint every
// tenant's dashboard and the admin panel along with it — see CLAUDE.md
// and the task brief for why that's off-limits.
//
// 2nd pass (2026): Bruno asked to replicate a specific reference
// (a French marketing-agency template — deep forest green instead of
// flat black, alternating cream/mint light sections, rounded photo
// cards) almost exactly, judging the earlier all-black version "not
// friendly enough". Kept the real lime brand accent unchanged; every
// other value below is new.
//
// Components in this folder mostly consume these as literal Tailwind
// arbitrary-value classes (e.g. `bg-[#0D2B1B]`, `text-[#D4F23A]`) since
// Tailwind can't resolve a JS variable inside an arbitrary value — the
// hex below exists as the single documented source of truth, and as a
// real value for the handful of spots (inline SVG fill/stroke, `style`
// attrs) that aren't Tailwind classes.
export const BICHO = {
  canvas: '#0D2B1B', // deep forest green — replaces the old flat #000000 canvas
  canvasRaised: '#123321', // one step up from canvas, for the floating nav + alternating bands
  cream: '#F3F4EC', // light section background (trust row, final CTA)
  mint: '#E8F0E0', // pale mint card background on cream sections
  white: '#FFFFFF',
  lime: '#D4F23A', // the one accent — "bicho lime", unchanged from the real logo
  ink: '#0B1A10', // near-black text on cream/mint sections
  gray: '#9CA99A', // secondary/body text on the dark canvas
  grayOnLight: '#5B6B5A', // secondary/body text on cream/mint sections
  line: '#1E3A28', // hairline dividers/borders on the dark canvas
  lineOnLight: '#DCE3D6', // hairline dividers/borders on cream/mint sections
} as const;
