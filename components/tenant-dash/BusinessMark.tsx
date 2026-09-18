import { readableFgRgb } from '@/lib/branding/colors';

// The business's own mark: its logo when it has one, otherwise a
// monogram tile in its primary color. Replaces a generic Sparkles icon
// that made every business's panel open with the same clip-art.
export function BusinessMark({
  name,
  logoUrl,
  color,
  size = 'md',
}: {
  name: string;
  logoUrl?: string | null;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl text-lg' : size === 'md' ? 'h-9 w-9 rounded-xl text-sm' : 'h-8 w-8 rounded-lg text-xs';

  if (logoUrl && size === 'lg') {
    // At the large size (sign-in pages) the logo stands on the page by
    // itself, at a height where a wordmark is actually legible.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" aria-hidden="true" className="h-14 w-auto max-w-[200px] object-contain object-left" />
    );
  }

  if (logoUrl) {
    return (
      // A logo keeps its own proportions on a plain white plate: most
      // real logos are wordmarks or have their own background, and
      // cropping them into a square tile mangles them.
      <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-white p-1 ring-1 ring-black/[0.06] ${box}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </span>
    );
  }

  const initials = name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || name.slice(0, 1).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-semibold tracking-tight ring-1 ring-inset ring-ink/10 ${box}`}
      style={{ backgroundColor: color, color: 'rgb(' + readableFgRgb(color) + ')' }}
    >
      {initials}
    </span>
  );
}
