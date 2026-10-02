import { MapPin, HandCoins, GraduationCap } from 'lucide-react';
import { Eyebrow, PillLink } from './Primitives';
import { Reveal } from './Reveal';
import { DotField } from './DotField';

// Distribution section grounded in the real go-to-market model (an
// independent sales-rep network), not a fabricated logo wall or review
// count. The deep violet band (#1B1040) is the one full-width dark
// section on this white page and is deliberately used only here — the
// other dark surface is StatsBar's floating panel.
//
// Nothing here claims how many reps exist or where they are — bicho is
// recruiting them, so this reads as the invitation it actually is.
const WHAT_REPS_GET = [
  { Icon: MapPin, text: 'Tu zona, tus negocios: tú los conoces, tú los visitas.' },
  { Icon: HandCoins, text: 'Comisión por cada negocio que arranca contigo.' },
  { Icon: GraduationCap, text: 'Te entrenamos en el producto y te damos con qué venderlo.' },
];

export function ResellerSection() {
  return (
    <section id="vendedores" className="relative overflow-hidden bg-[#1B1040] px-6 py-14 sm:py-24 lg:py-28">
      <DotField tone="onDark" />

      <div className="relative mx-auto grid max-w-6xl gap-8 sm:gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-20">
        <Reveal>
          <Eyebrow onDark>Red de vendedores</Eyebrow>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(1.9rem,4.4vw,3.1rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-white">
            bicho llega a donde llega su gente.
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#B9B1E6]">
            No se vende solo desde una página web. Vendedores independientes
            recorren los negocios de su propia ciudad, los conocen en persona y
            los ayudan a arrancar — así llegamos a los negocios que nunca
            encontrarían el producto solos.
          </p>
          <div className="mt-9">
            <PillLink
              href="mailto:nonameynk@gmail.com?subject=Quiero%20ser%20vendedor%20bicho"
              tone="lime"
            >
              Vender bicho en mi zona
            </PillLink>
          </div>
        </Reveal>

        {/* Cream plaque: the one light surface inside the darkest band on
            the page, so the offer to reps reads as its own thing rather
            than more body copy. */}
        <Reveal delay={120} className="rounded-[28px] bg-white p-6 sm:p-8">
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[#140F2E]">
            Lo que recibes como vendedor
          </p>
          <ul className="mt-6 space-y-5">
            {WHAT_REPS_GET.map(({ Icon, text }) => (
              <li key={text} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5B34E8]">
                  <Icon className="h-4 w-4 text-white" strokeWidth={2} aria-hidden="true" />
                </span>
                <p className="text-sm leading-relaxed text-[#6A6488]">{text}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
