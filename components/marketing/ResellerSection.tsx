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
