import { Check } from 'lucide-react';
import { SectionOpener } from './Primitives';
import { Reveal } from './Reveal';
import { DotField } from './DotField';

const TIERS = [
  {
    name: 'Básico',
    price: '$399',
    tagline: 'Para un negocio con un solo recurso.',
    features: [
      '1 recurso (silla, consultorio o cancha)',
      'Página de reservas con tu marca',
      'Confirmación automática por correo',
    ],
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
//
// This is the one section on the page that SHOULD be three parallel
// columns: the content genuinely is a comparison, and breaking the
// symmetry would make the tiers harder to read against each other.
// What changed instead is how the recommended tier is marked — a solid
// lime surface rather than a slightly brighter border plus a badge, so
// the hierarchy is carried by colour (as everywhere else on this page)
// and readable at a glance instead of needing to be labelled.
export function PricingSection() {
  return (
    <section id="precios" className="relative overflow-hidden bg-[#F5F3FC] px-6 py-24 sm:py-28">
      <DotField />
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <SectionOpener
            eyebrow="Precios"
            title="Un plan para cada tamaño de negocio."
            intro="Precios estimados en pesos mexicanos, por mes. Los 15 días de prueba no piden tarjeta, así que puedes decidir con el producto ya montado y funcionando."
          />
        </Reveal>

        <div className="mt-16 grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 90} className={tier.featured ? 'md:-mt-6' : ''}>
              <div
                className={`flex h-full flex-col rounded-[28px] p-8 ${
                  tier.featured
                    ? 'bg-[#D4F23A] md:pb-12 md:pt-12'
                    : 'bg-white ring-1 ring-inset ring-[#140F2E]/[0.06]'
                }`}
              >
                <h3
                  className={`text-sm font-semibold ${
                    tier.featured ? 'text-[#140F2E]' : 'text-[#5B34E8]'
                  }`}
                >
                  {tier.name}
                </h3>
                <p
                  className={`mt-1 text-sm ${tier.featured ? 'text-[#3A3170]' : 'text-[#6A6488]'}`}
                >
                  {tier.tagline}
                </p>

                <p
                  className={`mt-7 font-[family-name:var(--font-display)] text-[2.75rem] font-bold leading-none ${
                    tier.featured ? 'text-[#140F2E]' : 'text-[#140F2E]'
                  }`}
                >
                  {tier.price}
                </p>
                <p className={`mt-2 text-sm ${tier.featured ? 'text-[#3A3170]' : 'text-[#6A6488]'}`}>
                  MXN al mes
                </p>

                <ul className="mt-8 flex-1 space-y-3.5">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex gap-3 text-sm leading-snug ${
                        tier.featured ? 'text-[#140F2E]' : 'text-[#6A6488]'
                      }`}
                    >
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          tier.featured ? 'text-[#140F2E]' : 'text-[#5B34E8]'
                        }`}
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href={`/demo?plan=${encodeURIComponent(tier.name)}`}
                  className={`mt-9 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    tier.featured
                      ? 'bg-[#140F2E] text-[#D4F23A] hover:bg-[#2A1B5E] focus-visible:ring-[#140F2E]'
                      : 'border border-[#140F2E]/15 text-[#140F2E] hover:bg-[#5B34E8]/[0.06] focus-visible:ring-[#5B34E8]'
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
