import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

// Studio-level primitives — bicho central's own button/chip language,
// parallel to (never importing from) components/marketing/Primitives.tsx.
// Accent is #3B00FF, the exact indigo inside the real logo file; white
// on it measures 7.98:1, so a filled button carries white text safely.
// The accent is never used AS text on the dark ground (2.48:1) — that's
// what #A99BFF is for.

type PillTone = 'core' | 'white' | 'outlineOnDark' | 'outlineOnLight';

const PILL_TONES: Record<PillTone, string> = {
  core: 'bg-[#3B00FF] text-white hover:bg-[#5B2BFF] shadow-[0_12px_30px_-10px_rgba(59,0,255,0.9)]',
  white: 'bg-white text-[#05091C] hover:bg-[#E8EAF6]',
  outlineOnDark: 'border border-white/20 text-white hover:bg-white/[0.07]',
  outlineOnLight: 'border border-[#05091C]/15 text-[#05091C] hover:bg-[#05091C]/[0.04]',
};

const FOCUS_TONES: Record<PillTone, string> = {
  core: 'focus-visible:ring-[#A99BFF]',
  white: 'focus-visible:ring-white',
  outlineOnDark: 'focus-visible:ring-white',
  outlineOnLight: 'focus-visible:ring-[#3B00FF]',
};

export function PillLink({
  href,
  children,
  tone = 'core',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  const Anchor = href.startsWith('/') ? Link : 'a';
  return (
    <Anchor
      href={href}
      // `active:scale` is the one bit of motion every button gets: a
      // press that doesn't acknowledge itself feels broken on touch,
      // where there's no hover state to fall back on. 150ms, 2% — below
      // the threshold where it reads as an animation rather than as the
      // button physically giving.
      className={`group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${PILL_TONES[tone]} ${FOCUS_TONES[tone]} ${className}`}
    >
      {children}
      <ArrowUpRight
        className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={2.5}
        aria-hidden="true"
      />
    </Anchor>
  );
}

export const focusRingOnDark =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
export const focusRingOnLight =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        onDark
          ? 'border-white/15 bg-white/[0.05] text-[#A99BFF]'
          : 'border-[#05091C]/12 bg-white text-[#05091C]'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${onDark ? 'bg-[#A99BFF]' : 'bg-[#3B00FF]'}`}
      />
      {children}
    </span>
  );
}
