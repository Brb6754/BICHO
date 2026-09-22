// The reference's signature heading: two centred lines, the second one
// in a lighter blue, with a small rounded icon badge sitting INSIDE the
// line of text rather than floating above it as an eyebrow. It's the
// one device on that page that couldn't be mistaken for a default
// Tailwind section header, which is exactly why it's worth borrowing —
// and why it's a component, so every section gets the same one instead
// of three near-misses.
export function SectionHeading({
  line1,
  line2,
  icon,
  sub,
  className = '',
}: {
  line1: string;
  line2: string;
  // The badge sits between line2's words, so line2 is split on this
  // marker: "Say · About Us?" style. Pass the index to split at via a
  // literal "|" in line2.
  icon: React.ReactNode;
  sub?: string;
  className?: string;
}) {
  const [before, after] = line2.split('|');
  return (
    <div className={`text-center ${className}`}>
      <h2 className="font-[family-name:var(--font-central)] text-[clamp(1.75rem,4vw,2.6rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-white">
        {line1}
        <br />
        <span className="text-[#A99BFF]">
          {before}
          <span className="mx-2 inline-flex h-[0.85em] w-[0.85em] translate-y-[0.06em] items-center justify-center rounded-[0.22em] bg-gradient-to-br from-[#5B2BFF] to-[#3B00FF] align-middle text-white shadow-[0_4px_14px_-2px_rgba(59,0,255,0.7)]">
            {icon}
          </span>
          {after}
        </span>
      </h2>
      {sub && (
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#8C9BC9]">{sub}</p>
      )}
    </div>
  );
}
