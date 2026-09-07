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
          claim gets a visual — a dot-matrix silhouette of the country,
          not a literal map with pins on specific unverified cities. */}
      <svg
        viewBox="0 0 400 300"
        className="pointer-events-none absolute -right-10 top-1/2 hidden h-[420px] w-[560px] -translate-y-1/2 lg:block"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="reseller-mx-clip">
            <path d={MEXICO_PATH} />
          </clipPath>
          <pattern id="reseller-mx-dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="1.6" fill="#D4F23A" />
          </pattern>
        </defs>
        <rect
          x="0"
          y="0"
          width="400"
          height="300"
          fill="url(#reseller-mx-dots)"
          clipPath="url(#reseller-mx-clip)"
          opacity="0.55"
        />
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
