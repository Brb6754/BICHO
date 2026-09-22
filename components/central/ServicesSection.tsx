import { Layers, Check } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { Bloom } from './Flourishes';
import { SpotlightCard } from './SpotlightCard';
import { SERVICES } from './services';
import { Reveal } from '@/components/marketing/Reveal';

// The suite. Four areas in one grid so they read as one offer rather
// than four unrelated services side by side — which is the whole point
// of this page existing separately from the reservas product page.
//
// Each card is a SpotlightCard: it lights up from wherever the cursor
// is. That replaced a fixed corner glow that brightened on hover — the
// fixed one told you the card noticed you, this one tells you WHERE.
export function ServicesSection() {
  return (
    <section id="servicios" className="relative overflow-hidden px-6 py-24 sm:py-28">
      <Bloom
        className="left-1/2 top-0 h-[30rem] w-[46rem] -translate-x-1/2 -translate-y-1/2"
        intensity={0.26}
        drift
      />

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading
          line1="Un solo estudio"
          line2="para todo lo | digital"
          icon={<Layers className="h-[0.5em] w-[0.5em]" strokeWidth={2.5} />}
          sub="Software, sitios, automatización con IA y análisis de datos. Las cuatro piezas que un negocio necesita para dejar de operar a mano."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {SERVICES.map(({ id, Icon, name, blurb, bullets, proof }, i) => (
            <Reveal key={id} delay={i * 80}>
              <SpotlightCard className="block h-full rounded-3xl border border-white/[0.09] bg-[#0B1030] p-7 transition-colors duration-300">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B2BFF] to-[#3B00FF] text-white shadow-[0_10px_26px_-8px_rgba(59,0,255,0.9)]">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </span>

                  <h3 className="mt-5 font-[family-name:var(--font-central)] text-lg font-semibold leading-snug text-white">
                    {name}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#8C9BC9]">{blurb}</p>

                  <ul className="mt-5 flex flex-col gap-2">
                    {bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2.5 text-[13px] text-[#B9C3E4]">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#3B00FF]/25 text-[#A99BFF]">
                          <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden="true" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 border-t border-white/[0.07] pt-4 text-[11px] font-medium uppercase tracking-wide text-[#A99BFF]">
                    {proof}
                  </p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
