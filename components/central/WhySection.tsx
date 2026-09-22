import { UserCheck, Wrench, MapPin, Sparkles } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { Bloom } from './Flourishes';
import { SpotlightCard } from './SpotlightCard';
import { Reveal } from '@/components/marketing/Reveal';

// Positioning, not proof-by-numbers. There's no honest client count,
// uptime stat or "trusted by" logo row to show yet — the standing rule
// against fabricated social proof applies here as much as anywhere else
// in this codebase, which is why there's no stats band on this page
// even though every reference has one.
//
// Nothing here calls bicho small (Bruno: "no menciones la palabra
// estudio chico, somos un estudio"). The differentiators below are true
// either way — direct access to whoever writes the code, a product of
// our own in production — and they read as strengths instead of as an
// apology for size.
const POINTS = [
  {
    Icon: UserCheck,
    title: 'Hablas con quien programa',
    body: 'Sin account managers ni intermediarios. La persona que te contesta es la que escribe el código.',
  },
  {
    Icon: Wrench,
    title: 'Construimos con lo que usamos',
    body: 'bicho reservas no es una demo: es nuestro propio producto en producción. Lo que te entregamos ya pasó por ahí.',
  },
  {
    Icon: MapPin,
    title: 'Desde Durango, para negocios reales',
    body: 'Negocios de servicios, no corporativos. El objetivo es que dejes de operar a mano, no venderte funciones que nadie pidió.',
  },
];

export function WhySection() {
  return (
    <section id="nosotros" className="relative overflow-hidden px-6 py-24 sm:py-28">
      <Bloom
        className="left-1/2 top-1/2 h-[26rem] w-[42rem] -translate-x-1/2 -translate-y-1/2"
        intensity={0.18}
        drift
        duration="64s"
      />

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading
          line1="Así es como"
          line2="trabaja | bicho"
          icon={<Sparkles className="h-[0.5em] w-[0.5em]" strokeWidth={2.5} />}
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {POINTS.map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 90}>
              <SpotlightCard className="block h-full rounded-3xl border border-white/[0.09] bg-[#0B1030] p-6">
                <div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B00FF]/20 text-[#A99BFF]">
                    <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#8C9BC9]">{body}</p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
