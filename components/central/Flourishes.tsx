// Background atmosphere for bicho central.
//
// Rebuilt again (2026-09-18) against the reference Bruno picked as the
// bar: a dev portfolio whose whole page sits in electric-blue bloom —
// big soft light sources BEHIND and BETWEEN the cards, bleeding across
// section boundaries, so the dark never reads as a flat rectangle. The
// earlier version had one polite gradient at the top and nothing else,
// which is most of why the page read as empty.

// A single soft light source. Sized/positioned by the caller so the
// same primitive can be a wide horizon glow, a bloom behind a card, or
// a bleed between two sections.
export function Bloom({
  className = '',
  intensity = 0.5,
  // Slow ambient travel (globals.css `.bloom-drift`). Off by default:
  // a page where every light source moves is a lava lamp. One drifting
  // bloom per section is the dose.
  drift = false,
  duration = '42s',
}: {
  className?: string;
  intensity?: number;
  drift?: boolean;
  duration?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full ${drift ? 'bloom-drift' : ''} ${className}`}
      style={{
        background: `radial-gradient(circle, rgba(59,0,255,${intensity}) 0%, rgba(59,0,255,${intensity * 0.35}) 35%, rgba(59,0,255,0) 70%)`,
        filter: 'blur(60px)',
        ...(drift ? ({ '--bloom-duration': duration } as React.CSSProperties) : {}),
      }}
    />
  );
}

// The hero's own field: a wide horizon of light rising from behind the
// product screenshot, plus two offset blooms so the corners fall away
// into near-black instead of the whole thing being evenly lit.
export function Atmosphere({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        background: `
          radial-gradient(ellipse 85% 50% at 50% 42%, rgba(59,0,255,0.42) 0%, rgba(59,0,255,0) 62%),
          radial-gradient(ellipse 45% 35% at 88% 12%, rgba(110,60,255,0.22) 0%, rgba(110,60,255,0) 65%),
          radial-gradient(ellipse 45% 35% at 10% 20%, rgba(59,0,255,0.2) 0%, rgba(59,0,255,0) 65%),
          linear-gradient(180deg, #070C24 0%, #05091C 100%)
        `,
      }}
    />
  );
}

// Faint grid, kept very quiet now that the blooms carry the atmosphere.
export function GridField({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(140,170,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(140,170,255,0.06) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 25%, transparent 20%, black 95%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 70% 60% at 50% 25%, transparent 20%, black 95%)',
      }}
    />
  );
}
