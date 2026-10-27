import Link from 'next/link';
import { ChevronsRight, Asterisk } from 'lucide-react';
import { Reveal } from './Reveal';

// Shared marketing primitives. These exist so the landing stops being a
// pile of one-off Tailwind strings: the reference's identity lives in a
// handful of repeated signature details (the pill CTA with a chevron
// badge fused into its right end, the small eyebrow chip with a glyph),
// and those need to be one component each, not copy-pasted per section.

type PillTone = 'lime' | 'violet' | 'white' | 'outlineOnDark' | 'outlineOnLight';

// Colour is the hierarchy here: exactly one lime CTA per viewport-ish,
// violet for the second-tier action, outline for tertiary. Never all
// three as lime. On a white page the two filled tones swap weight
// depending on the ground — lime pops hardest on white and on violet,
// violet pops hardest on white and on lime — so the rule is simply
// "never the same tone as the surface it sits on".
const PILL_TONES: Record<PillTone, string> = {
  lime: 'bg-[#D4F23A] text-[#140F2E] hover:bg-[#B5D42B]',
  violet: 'bg-[#5B34E8] text-white hover:bg-[#4423C4]',
  white: 'bg-white text-[#5B34E8] hover:bg-[#EFEBFB]',
  outlineOnDark: 'border border-white/25 text-white hover:bg-white/10',
  outlineOnLight: 'border border-[#140F2E]/20 text-[#140F2E] hover:bg-[#140F2E]/[0.04]',
};

// The chevron badge riding inside the pill's right end is the single
// most recognisable detail in the reference's button. Only the two
// filled tones carry it — on an outline pill it would read as noise.
const BADGE_TONES: Record<PillTone, string> = {
  lime: 'bg-[#140F2E] text-[#D4F23A]',
  violet: 'bg-white text-[#5B34E8]',
  white: 'bg-[#5B34E8] text-white',
  outlineOnDark: '',
  outlineOnLight: '',
};

// Focus ring colour is per-tone, and the offset is transparent rather
// than a fixed colour: these pills sit on white, mist, violet AND lime
// grounds, and a hard-coded offset colour would paint a white gap
// around a pill that's actually on violet. Transparent lets whatever is
// behind show through the gap, so the ring reads correctly everywhere.
const FOCUS_TONES: Record<PillTone, string> = {
  lime: 'focus-visible:ring-[#140F2E]',
  violet: 'focus-visible:ring-[#5B34E8]',
  white: 'focus-visible:ring-white',
  outlineOnDark: 'focus-visible:ring-[#D4F23A]',
  outlineOnLight: 'focus-visible:ring-[#5B34E8]',
};

// Keyboard focus treatment for the plain text links on this site (nav,
// footer, the top strip). Every interactive element needs a visible
// focus state, and these links are the ones that don't go through
// PillLink. Transparent ring-offset for the same reason as above: the
// same links appear on teal and on lime.
export const focusRingOnDark =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F23A] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
// Same, for the links that now sit on the white ground (the nav): a lime
// ring on white is invisible, so these get the violet one.
export const focusRingOnLight =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

export function PillLink({
  href,
  children,
  tone = 'lime',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  const hasBadge = tone === 'lime' || tone === 'violet' || tone === 'white';
  // An in-app route gets <Link> so the CTA navigates client-side; a
  // mailto: or an external URL still needs a plain anchor.
  const Anchor = href.startsWith('/') ? Link : 'a';
  return (
    <Anchor
      href={href}
      className={`group inline-flex items-center gap-3 rounded-full text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        hasBadge ? 'py-1.5 pl-6 pr-1.5' : 'px-6 py-3'
      } ${PILL_TONES[tone]} ${FOCUS_TONES[tone]} ${className}`}
    >
      {children}
      {hasBadge && (
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5 ${BADGE_TONES[tone]}`}
        >
          <ChevronsRight className="h-4 w-4" strokeWidth={2.5} />
        </span>
      )}
    </Anchor>
  );
}

// Small labelled chip that replaces the tracked-out ALL-CAPS eyebrow.
// The reference marks every section opener with one of these — a real
// bordered chip with a glyph, which reads as a deliberate structural
// device instead of the generic uppercase label.
export function Eyebrow({
  children,
  onDark = false,
  className = '',
}: {
  children: React.ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
        onDark
          ? 'border-white/20 bg-white/[0.06] text-[#D4F23A]'
          : 'border-[#140F2E]/12 bg-white text-[#140F2E]'
      } ${className}`}
    >
      <Asterisk className="h-3.5 w-3.5 text-[#5B34E8]" strokeWidth={2.5} aria-hidden="true" />
      {children}
    </span>
  );
}

// Section heading + supporting paragraph placed side by side (heading
// left, intro right) instead of stacked and centred — the reference
// does this on every section opener and it's a large part of why its
// sections don't read as the generic "title / text / three cards"
// rhythm. Falls back to stacked on small screens.
export function SectionOpener({
  eyebrow,
  title,
  intro,
  onDark = false,
  sobreColor = false,
  grande = false,
}: {
  /** Opcional. La landing del estudio no la usa: un título en mayúsculas
   *  de 3rem no necesita una etiqueta encima que diga de qué trata. La
   *  de /reservas la conserva — es otra página y otra decisión. */
  eyebrow?: string;
  title: React.ReactNode;
  intro?: string;
  onDark?: boolean;
  /** Sobre lima o lila. El gris de siempre ahí da 4.1:1, debajo del
   *  mínimo para texto chico; la tinta al 80% da más de 9:1. */
  sobreColor?: boolean;
  /** Título de póster (landing del estudio): a lo ancho, casi el doble de
   *  grande, y entra con un golpe al hacer scroll. La introducción baja
   *  debajo, porque junto a un título de 5rem quedaba como nota al pie. */
  grande?: boolean;
}) {
  const h2 = (
    <h2
      className={`${eyebrow ? 'mt-5 ' : ''}font-[family-name:var(--font-display)] font-extrabold uppercase tracking-[-0.02em] ${
        grande
          ? 'text-balance text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.88]'
          : 'text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[0.95]'
      } ${onDark ? 'text-white' : 'text-[#140F2E]'}`}
    >
      {title}
    </h2>
  );
  return (
    <div
      className={
        grande
          ? 'grid gap-6'
          : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-end lg:gap-16'
      }
    >
      <div>
        {eyebrow && <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>}
        {grande ? <Reveal variant="golpe">{h2}</Reveal> : h2}
      </div>
      {intro && (
        <p
          className={`${grande ? 'max-w-2xl text-[17px]' : 'text-[15px]'} leading-relaxed ${
            onDark ? 'text-[#B9B1E6]' : sobreColor ? 'text-[#14092E]/80' : 'text-[#6A6488]'
          }`}
        >
          {intro}
        </p>
      )}
    </div>
  );
}
