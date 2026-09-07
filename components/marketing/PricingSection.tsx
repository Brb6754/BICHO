import { Reveal } from '@/components/ui/Reveal';

const TIERS = [
  {
    name: 'Básico',
    price: '$399',
    tagline: 'Para un negocio con un solo recurso.',
    features: ['1 recurso (silla, consultorio o cancha)', 'Página de reservas con tu marca', 'Confirmación automática por correo'],
    featured: false,
  },
  {
    name: 'Profesional',
    price: '$699',
    tagline: 'El más elegido por salones y consultorios.',
    features: [
      'Hasta 5 recursos',
      'Todo lo del plan Básico',
      'Reagendar y cancelar de autoservicio',
      'Catálogo de servicios ilimitado',
    ],
    featured: true,
  },
  {
    name: 'Negocio',
    price: '$1,199',
    tagline: 'Para negocios con varios recursos o sucursales.',
    features: ['Recursos ilimitados', 'Todo lo del plan Profesional', 'Soporte prioritario'],
    featured: false,
  },
];

// PLACEHOLDER PRICING — Bruno must confirm real tiers/prices before this
// goes live. No plans/pricing/subscription schema exists in the DB yet
// (verified: no such table in db/) — these tier names, feature splits
// and MXN/mes figures are a plausible starting structure only, not real
// numbers pulled from anywhere.
export function PricingSection() {
  return (
    <section id="precios" className="bg-[#0D2B1B] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            Un plan para cada tamaño de negocio.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#9CA99A] sm:text-lg">
            Precios estimados en pesos mexicanos, por mes. Sin tarjeta para
            probar.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 90} className="h-full">
              <div
                className={`flex h-full flex-col rounded-2xl border p-8 transition duration-300 hover:-translate-y-1 ${
                  tier.featured
                    ? 'border-[#D4F23A]/50 bg-[#123321] hover:shadow-lg'
                    : 'border-[#1E3A28] bg-transparent hover:border-[#D4F23A]/30'
                }`}
              >
                {tier.featured && (
                  <span className="mb-4 inline-block w-fit rounded-full bg-[#D4F23A] px-3 py-1 text-xs font-semibold text-black">
                    Más elegido
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                <p className="mt-1 text-sm text-[#9CA99A]">{tier.tagline}</p>
                <p className="mt-6 text-4xl font-bold text-white">
                  {tier.price}
                  <span className="text-base font-normal text-[#9CA99A]"> MXN/mes</span>
                </p>

                <ul className="mt-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-[#9CA99A]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-[#D4F23A]" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="mailto:nonameynk@gmail.com?subject=Quiero%20contratar%20bicho"
                  className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    tier.featured
                      ? 'bg-[#D4F23A] text-black hover:brightness-95'
                      : 'border border-white/20 bg-white/5 text-white hover:bg-white/15'
                  }`}
                >
                  Empezar prueba de 15 días
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
