// The hero's signature devices, pulled out of Hero.tsx so each one is a
// named thing rather than forty lines of inline SVG inside a layout.
//
// Taken from the reference Bruno picked (a bold editorial crypto site):
// hand-drawn lime arrows used as annotations over huge type, a rotating
// circular stamp, and a faint grid holding the colour field together.
// What is NOT taken from it: its palette, its typeface, and its habit of
// annotating things that need no annotation. An arrow here points at the
// two things a visitor actually needs to notice.

// Chunky, slightly wobbly arrow. Two paths rather than one so the head
// keeps its weight when the whole thing is scaled down on a phone —
// a single stroked path with a polyline head thins out unevenly.
export function LimeArrow({
  className = '',
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={`${flip ? '-scale-x-100' : ''} ${className}`}
    >
      <path
        d="M10 16C54 6 100 32 95 84"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M72 74L95 90L106 64"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Rotating stamp. The ring spins, the arrow inside does not — a spinning
// arrow would read as a loading spinner, which is the one thing this
// must not look like. `.badge-spin` (globals.css) carries the keyframes
// and drops the animation under prefers-reduced-motion.
export function CircleStamp({ className = '' }: { className?: string }) {
  const label = 'PRUEBA 15 DÍAS · SIN TARJETA · ';
  return (
    <span className={`relative inline-flex h-32 w-32 items-center justify-center ${className}`}>
      <span className="absolute inset-0 rounded-full bg-[#D4F23A]" aria-hidden="true" />
      <svg viewBox="0 0 120 120" className="badge-spin absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <path
            id="stamp-ring"
            d="M60,60 m-43,0 a43,43 0 1,1 86,0 a43,43 0 1,1 -86,0"
            fill="none"
          />
        </defs>
        <text className="fill-[#140F2E] text-[10.5px] font-bold uppercase tracking-[0.18em]">
          <textPath href="#stamp-ring">{label}</textPath>
        </text>
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="relative h-8 w-8 text-[#140F2E]"
      >
        <path
          d="M7 17L17 7M17 7H9M17 7V15"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// Faint grid over the violet field. Two gradients rather than an image,
// masked so it fades out before it reaches the headline — a grid that
// runs edge to edge at full strength competes with the type.
export function GridField({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, black 100%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, black 100%)',
      }}
    />
  );
}

// Two small glyphs that ride beside the headline. They are the one piece
// of pure decoration on the page, which is why there are two shapes and
// not six: the reference scatters these around its type, and past two or
// three they stop reading as sparkle and start reading as clip art.
//
// The sparkle is a four-point star with concave sides (the classic
// shape — a plain four-pointed polygon reads as a plus sign at small
// size). The asterisk is three crossed strokes with round caps, which is
// the glyph already used on this page's section eyebrows, blown up.
export function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M50 2c4 28 20 44 48 48-28 4-44 20-48 48-4-28-20-44-48-48 28-4 44-20 48-48Z" />
    </svg>
  );
}

export function AsteriskMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="13"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M50 10v80M17 29l66 42M17 71l66-42" />
    </svg>
  );
}

// The bug from the wordmark, on its own. It is the only decoration in
// this hero that is actually bicho's — the asterisk, the sparkle and the
// ring are shapes anyone could use — so it earns being repeated while
// they don't. Each instance is rotated differently: three copies of the
// same mark at the same angle read as a repeated asset, at different
// angles as scattered objects.
//
// Plain <img> like BichoLogo: one static file, no next/image domain
// config, and it is decorative, hence alt="" and aria-hidden.
export function BichoBug({ className = '' }: { className?: string }) {
  return <img src="/o-bicho.png" alt="" aria-hidden="true" className={className} />;
}
