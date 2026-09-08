// Shared decorative texture — a quiet dot field, top/bottom-faded so it
// never competes with content. Previously hand-rolled only inside
// ResellerSection; every dark section on this page (Hero, Problem,
// Stats, Pricing, FinalCta) was otherwise a completely flat, textureless
// color rectangle — the single biggest reason the page read as "flat"
// rather than "designed". Pulling this out once and reusing it gives
// every dark section the same quiet depth without repeating the CSS.
export function DotField({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 opacity-[0.15] ${className}`}
      style={{
        backgroundImage: 'radial-gradient(#D4F23A 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
      }}
      aria-hidden
    />
  );
}
