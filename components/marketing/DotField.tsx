// Shared decorative texture — a quiet dot field, top/bottom-faded so it
// never competes with content. Previously hand-rolled only inside
// ResellerSection; every flat section on this page was otherwise a
// completely textureless colour rectangle — the single biggest reason
// the page read as "flat" rather than "designed".
//
// The tone exists because the page inverted to a white ground: lime
// dots are all but invisible on white (~1.4:1 against it), so light
// sections get violet dots instead. Same texture, same opacity budget,
// readable on both.
export function DotField({
  tone = 'onLight',
  className = '',
}: {
  tone?: 'onLight' | 'onDark';
  className?: string;
}) {
  const onDark = tone === 'onDark';
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${
        onDark ? 'opacity-[0.15]' : 'opacity-[0.13]'
      } ${className}`}
      style={{
        backgroundImage: `radial-gradient(${onDark ? '#D4F23A' : '#5B34E8'} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        maskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
      }}
      aria-hidden
    />
  );
}
