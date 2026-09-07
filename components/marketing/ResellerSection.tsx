// Hand-drawn, low-poly approximation of Mexico's outline (not traced
// from any licensed dataset — a simplified/faceted silhouette fits the
// dot-matrix treatment anyway, and precision doesn't matter for a
// decorative background shape). Filled with a repeating dot pattern
// instead of a solid color: "a map of Mexico with lots of dots", per
// Bruno's own ask, and it keeps the section's existing texture
// language (the abstract dot field below) rather than introducing a
// flat icon.
const MEXICO_PATH =
  'M60,20 L140,15 L220,20 L280,30 L330,45 L345,90 L325,140 L290,175 L300,165 L330,155 L365,160 L385,175 L375,200 L340,210 L300,205 L270,195 L230,205 L180,200 L140,190 L100,165 L75,130 L65,95 L55,70 L45,85 L35,120 L25,160 L30,170 L40,155 L35,110 L40,65 L50,35 Z';

// Individual points, not a uniform tiled pattern — each dot is meant to
// read as a vendedor out in the field, not as wallpaper texture. Fixed
// [x, y, radius] triples (a seeded scatter generated once, filtered to
// land inside MEXICO_PATH, then hardcoded here) rather than computed
// with Math.random() at render time — that would draw different dots
// on the server vs. the client and fail hydration. The varying radii
// are the only thing standing in for "size" here; there's no real
// per-rep data behind any single dot; this is illustrative coverage,
// not a literal claim about exactly 58 reps in these exact spots.
const VENDOR_DOTS: [number, number, number][] = [
  [88.2, 48.9, 3.7], [258.2, 98.3, 2.6], [214.8, 122.5, 3], [221.1, 145.4, 2.1],
  [188.4, 91, 2.1], [315.3, 125.9, 4], [253.5, 27.5, 2.1], [97.3, 102.7, 2.4],
  [172.4, 160, 3.5], [90.7, 35.1, 3.4], [181.3, 89.3, 2.3], [113.4, 76.7, 3.1],
  [128.3, 127.1, 2.8], [194.5, 186.2, 4.1], [79.1, 63.1, 1.9], [68.2, 63.2, 2.5],
  [104.7, 42.1, 2], [291.4, 120.4, 3], [241.5, 126.9, 1.7], [85.4, 64.3, 3.8],
  [103, 67.9, 3], [243.8, 132.8, 3.5], [136.1, 91.1, 3.6], [329.1, 208.4, 3.3],
  [235.6, 109.5, 2.5], [254.7, 194.6, 2.5], [247.3, 48.1, 2.1], [201.8, 178, 4],
  [199.7, 145.6, 3], [273.5, 85.5, 3.4], [191.7, 94, 3.4], [174.4, 151.2, 3.2],
  [235.8, 43.4, 3.4], [192.6, 168.4, 2.3], [170.7, 97.1, 3.9], [61.6, 54.3, 2.8],
  [277.8, 193.1, 2.6], [334.3, 84.4, 2.6], [353.2, 175.4, 2.6], [61.3, 69.8, 3.4],
  [261.5, 111, 1.8], [237.1, 74.4, 1.7], [305.1, 70.1, 3.8], [58.8, 55.1, 2.2],
  [256.1, 82, 3.8], [126.2, 180.5, 3.8], [107, 36.3, 3.6], [250, 113.4, 3.3],
  [198.4, 22.7, 3.3], [156.3, 123.2, 1.7], [185.7, 83.9, 3.4], [41.8, 67, 2.1],
  [140.5, 145.2, 4.1], [181.4, 57.4, 2.5], [325.7, 109.2, 3.9], [103.2, 94.5, 3.4],
  [123.8, 117.3, 3], [330.1, 84.9, 2.5],
];

// Distribution/trust section grounded in the real go-to-market model
// (an independent sales rep network), not a fabricated logo wall or
// review count. A raised band (#123321) sets this section apart from
// the pure-black sections around it — the one section-level contrast
// this page uses, kept to a single instance.
export function ResellerSection() {
  return (
    <section id="vendedores" className="relative overflow-hidden bg-[#123321] px-6 py-24">
      {/* quiet decorative texture — an abstract dot field, not a literal
          map with pins on cities we haven't actually verified */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(#D4F23A 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
        }}
        aria-hidden
      />

      {/* The empty right half of this section (text stays inside
          max-w-2xl on the left) is where the "presente en todo México"
          claim gets a visual — individual dots, each standing in for a
          vendedor out in the field, arranged in the shape of the
          country instead of a uniform pattern fill. A faint outline of
          the country keeps it legible as a map even where the dots
          thin out; not a literal map with pins on specific unverified
          cities or an exact headcount. */}
      <svg
        viewBox="0 0 400 300"
        className="pointer-events-none absolute -right-10 top-1/2 hidden h-[420px] w-[560px] -translate-y-1/2 lg:block"
        aria-hidden="true"
      >
        <path d={MEXICO_PATH} fill="none" stroke="#D4F23A" strokeWidth="1" strokeOpacity="0.25" />
        {VENDOR_DOTS.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#D4F23A" opacity="0.85" />
        ))}
      </svg>

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            Presente en todo México a través de nuestra red de vendedores.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#9CA99A] sm:text-lg">
            bicho no se vende solo desde una página web: una red de
            vendedores independientes recorre negocios en su propia ciudad,
            los conoce en persona y los ayuda a arrancar. Así llegamos a
            negocios que jamás encontrarían el producto solos.
          </p>
        </div>

        <div className="mt-10">
          <a
            href="mailto:nonameynk@gmail.com?subject=Quiero%20ser%20vendedor%20bicho"
            className="inline-flex items-center justify-center rounded-full border border-[#D4F23A]/40 bg-transparent px-6 py-3 text-sm font-medium text-[#D4F23A] transition hover:bg-[#D4F23A]/10"
          >
            Quiero vender bicho en mi zona
          </a>
        </div>
      </div>
    </section>
  );
}
