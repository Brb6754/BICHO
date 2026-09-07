import type { Config } from 'tailwindcss';

// Design tokens — single source of truth for the "liquid glass" premium
// SaaS look (deep indigo/violet/cyan, glassmorphism, ambient gradients).
// Superseded the earlier dark-green + lime "fintech" identity — see
// CLAUDE.md for why. Chosen with the ui-ux-pro-max skill's `style`
// (glassmorphism), `color` (indigo/violet SaaS palettes), and
// `typography` (kept Inter — already fits the "premium sans" brief)
// searches as grounding, then adapted rather than pasted verbatim.
//
// Surface-hierarchy tokens (paper/surface/elevated/ink/muted/border) are
// backed by CSS variables defined in globals.css (:root for light,
// .dark for dark) so every component that already uses bg-surface,
// text-ink, etc. gets real dark mode for free — no per-component dark:
// classes needed for these. success/warning/error/info -soft variants
// use an alpha overlay of their own DEFAULT color, which reads correctly
// on either a light or dark surface without a separate override.
//
// `glass` is a dedicated translucent token (also CSS-var-backed) used
// only by glass surfaces (cards, sidebar, modals, dropdowns) via the
// .glass-1/.glass-2/.glass-3 utility classes in globals.css — kept
// separate from `surface`/`elevated` so anything that still needs a
// fully opaque, maximally legible background still has one.
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // CSS-var-backed, same pattern as paper/surface/ink below — the
        // platform's own indigo/violet/cyan are the :root/.dark defaults,
        // so admin (which never overrides these) looks exactly as
        // before. A tenant-scoped wrapper (dashboard layout, public
        // booking page) overrides them with that tenant's own
        // primary/secondary/accent color, and every existing bg-primary/
        // text-accent/etc. usage anywhere in the tree — including
        // components this file's authors have never heard of — retints
        // itself for free. See lib/branding/colors.ts's
        // tenantColorCssVars() for what sets the overrides.
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          soft: 'rgb(var(--color-secondary-soft) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          soft: 'rgb(var(--color-accent-soft) / <alpha-value>)',
        },
        glass: 'rgb(var(--color-glass-base) / <alpha-value>)',
        // Fixed, theme-independent bold surface (2026 reference-driven
        // redesign) — a deliberate near-black forest tone used for ONE
        // dramatic section per page (a hero, a stats band), never the
        // whole page. Unlike paper/surface below, this does NOT flip
        // with the light/dark toggle: it's a bold graphic choice, not a
        // "dark mode" state. See --color-canvas in globals.css — only
        // declared in :root, never overridden in .dark, so it stays
        // constant regardless of the toggle.
        canvas: {
          DEFAULT: 'rgb(var(--color-canvas) / <alpha-value>)',
          fg: 'rgb(var(--color-canvas-fg) / <alpha-value>)',
        },
        paper: 'rgb(var(--color-paper) / <alpha-value>)', // page background
        surface: 'rgb(var(--color-surface) / <alpha-value>)', // card/base surface
        elevated: 'rgb(var(--color-elevated) / <alpha-value>)', // modal/overlay surface — one step up from surface
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        border: {
          DEFAULT: 'rgb(var(--color-border-base) / 0.1)',
          strong: 'rgb(var(--color-border-base) / 0.2)',
        },
        success: { DEFAULT: '#15803D', soft: 'rgb(21 128 61 / 0.12)' },
        warning: { DEFAULT: '#B45309', soft: 'rgb(180 83 9 / 0.12)' },
        error: { DEFAULT: '#DC2626', soft: 'rgb(220 38 38 / 0.12)' },
        info: { DEFAULT: '#2563EB', soft: 'rgb(37 99 235 / 0.12)' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      // Semantic type scale — size + line-height + tracking bundled per
      // level. Weight isn't set here (Tailwind's fontSize plugin doesn't
      // carry it) — components/ui/Text.tsx pairs each level with its
      // intended weight so usage doesn't depend on remembering it.
      fontSize: {
        // display/h1/h2 pushed bigger + tighter this pass (2026
        // reference redesign wants real typographic confidence, not
        // just a slightly-larger body size) — h3 and below untouched on
        // purpose, so the scale still has real contrast between "this
        // is the headline" and "this is a section title".
        display: ['clamp(2.75rem, 6vw, 4.25rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        h1: ['clamp(1.875rem, 4vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        h2: ['1.625rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        h3: ['1.125rem', { lineHeight: '1.3' }],
        body: ['0.9375rem', { lineHeight: '1.6' }],
        small: ['0.8125rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
        label: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.04em' }],
      },
      boxShadow: {
        // Graduated elevation system — deliberately soft, no hard drop
        // shadows. xs/sm/md/lg map to Card's `elevation` prop.
        xs: '0 1px 2px rgba(30, 27, 75, 0.04)',
        sm: '0 2px 10px rgba(30, 27, 75, 0.06)',
        card: '0 8px 30px rgba(49, 46, 129, 0.10)',
        md: '0 8px 30px rgba(49, 46, 129, 0.10)',
        lg: '0 20px 60px rgba(49, 46, 129, 0.18)',
        // Colored glows — used sparingly, on primary CTAs and the active
        // sidebar/nav item, never as a default card shadow. Same
        // CSS-var pattern as the colors above, so a tenant's glow is
        // tinted with their own color instead of a fixed indigo/cyan.
        'glow-primary': '0 0 0 1px rgb(var(--color-primary) / 0.25), 0 8px 24px rgb(var(--color-primary) / 0.35)',
        'glow-accent': '0 0 24px rgb(var(--color-accent) / 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
