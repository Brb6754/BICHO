// The wordmark — the one place this page spends its "boldness" (per the
// frontend-design skill: spend it in one place, keep everything else
// quiet). Renders Bruno's real logo file (public/logo.png), cropped to
// just the "bicho" mark via CSS (the file itself is a square 1563x1563
// canvas with a lot of black padding + the tagline baked in below the
// mark — both invisible/unwanted here since this page's background is
// the same solid black and the tagline is rendered separately by
// BichoTagline as real text).
//
// The crop is exact pixel math, not eyeballed: measured the mark's
// bounding box in the real file via a canvas pixel scan (x 190-1472,
// y 498-899 of 1563x1563) and solved for the <img>'s
// width/height/position as percentages of this container so that exact
// box fills it edge-to-edge. If the logo file is ever replaced, these
// four numbers need re-measuring against the new file.
const CROP = {
  // container aspect-ratio = crop width / crop height
  aspect: (1472 - 190) / (899 - 498),
  widthPct: (1563 / (1472 - 190)) * 100,
  heightPct: (1563 / (899 - 498)) * 100,
  leftPct: -(190 / (1472 - 190)) * 100,
  topPct: -(498 / (899 - 498)) * 100,
};

// Sized purely by the `className` the caller passes (e.g. `h-9` in the
// nav, `h-20 sm:h-28` in the hero) — width follows from the fixed
// aspect-ratio, no separate asset per size.
export function BichoLogo({ className = 'h-10' }: { className?: string }) {
  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={{ aspectRatio: CROP.aspect }}
      role="img"
      aria-label="bicho"
    >
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: `${CROP.widthPct}%`,
          height: `${CROP.heightPct}%`,
          left: `${CROP.leftPct}%`,
          top: `${CROP.topPct}%`,
          maxWidth: 'none',
        }}
      />
    </span>
  );
}

// "SOFTWARE & AI SOLUTIONS" — small caps, tracked out, lime. This is the
// one ALL-CAPS/tracked-out label on the whole page, and it's not a
// generic "eyebrow" tell: it's the literal tagline from the client's own
// logo file, always paired with the mark, never used as a section label
// elsewhere.
export function BichoTagline({ className = '' }: { className?: string }) {
  return (
    <span
      className={`block font-semibold uppercase tracking-[0.3em] text-[#D4F23A] ${className}`}
    >
      Software &amp; AI Solutions
    </span>
  );
}
