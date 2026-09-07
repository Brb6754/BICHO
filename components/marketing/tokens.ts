// Bicho brand tokens — scoped ONLY to the marketing homepage
// (app/page.tsx + everything under components/marketing/).
//
// Deliberately NOT wired into tailwind.config.ts / globals.css: those
// drive the admin panel + tenant dashboards (indigo/violet CSS-var
// system, plus each tenant's own branding colors). Repointing
// --color-primary/--color-accent to black/lime would retint every
// tenant's dashboard and the admin panel along with it — see CLAUDE.md
// and the task brief for why that's off-limits.
//
// Components in this folder mostly consume these as literal Tailwind
// arbitrary-value classes (e.g. `bg-[#000000]`, `text-[#D4F23A]`) since
// Tailwind can't resolve a JS variable inside an arbitrary value — the
// hex below exists as the single documented source of truth, and as a
// real value for the handful of spots (inline SVG fill/stroke, `style`
// attrs) that aren't Tailwind classes.
export const BICHO = {
  black: '#000000', // page canvas — the brand's actual near-#000 background
  raised: '#0E0E0E', // one step up from black, for alternating section bands
  white: '#FFFFFF',
  lime: '#D4F23A', // the one accent — "bicho lime"
  gray: '#8C8C8C', // secondary/body text on black (pure white for everything is too heavy)
  line: '#1F1F1F', // hairline dividers / borders on black
} as const;
