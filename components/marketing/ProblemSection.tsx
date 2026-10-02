import { Scissors, Sparkles, Stethoscope, Dumbbell } from 'lucide-react';
import { Eyebrow } from './Primitives';
import { Reveal } from './Reveal';
import { DotField } from './DotField';

const SCENARIOS = [
  {
    vertical: 'Peluquerías y barberías',
    scenario: 'Dos clientes agendados a la misma hora, y uno se va molesto.',
    Icon: Scissors,
  },
  {
    vertical: 'Spas y salones',
    scenario: 'El recordatorio nunca llega y el cliente simplemente no aparece.',
    Icon: Sparkles,
  },
  {
    vertical: 'Consultorios',
    scenario: 'El doctor contesta mensajes de pacientes hasta las 11 de la noche.',
    Icon: Stethoscope,
  },
  {
    vertical: 'Gimnasios',
    scenario: 'El lugar en la clase es de quien conteste el WhatsApp primero.',
    Icon: Dumbbell,
  },
];

// Was a 2×2 grid of four identical cards. Rebuilt as an editorial
// split: the argument stays put on the left, the evidence runs down
// the right as a divided list. Two reasons, both from the brief —
// not every group of things should be a card grid, and four equal
// boxes give the reader no order to read them in, while a ruled list
// does. The scenario line is the loud element; the vertical it
// belongs to is a quiet tag beneath it (previously a tracked-out
// ALL-CAPS label, which is the genericest possible treatment).
export function ProblemSection() {
  return (
    // The sheet that laps over the hero: negative margin + rounded top
    // corners + its own z-index, so the violet field reads as something
    // the page is sliding over rather than a band stacked above it.
    <section className="relative z-10 -mt-8 overflow-hidden rounded-t-[36px] bg-white px-6 py-14 sm:-mt-10 sm:rounded-t-[48px] sm:py-28">
      <DotField />
      <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <Reveal>
          <Eyebrow>El problema</Eyebrow>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(1.9rem,4.4vw,3.1rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-[#140F2E]">
            Un chat no es un sistema de citas.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[#6A6488]">
            Si tu negocio agenda por WhatsApp o en una libreta, ya conoces estas
            escenas. No son casos raros — son el día a día de un negocio que
            crece más rápido que su forma de agendar.
          </p>

          {/* Quiet violet rule that anchors the left column so it isn't
              just text floating beside a long list. */}
          <p className="mt-10 max-w-xs border-l-2 border-[#5B34E8] pl-5 text-[15px] font-semibold leading-snug text-[#140F2E]">
            Ninguna de estas se arregla escribiendo más rápido.
          </p>
        </Reveal>

        <div>
          {SCENARIOS.map(({ vertical, scenario, Icon }, i) => (
            <Reveal key={vertical} delay={i * 80}>
              <div
                className={`group flex gap-5 border-t border-[#140F2E]/10 py-7 ${
                  i === SCENARIOS.length - 1 ? 'border-b' : ''
                }`}
              >
                <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-inset ring-[#140F2E]/[0.08] transition-colors duration-300 group-hover:bg-[#5B34E8]">
                  <Icon
                    className="h-5 w-5 text-[#5B34E8] transition-colors duration-300 group-hover:text-white"
                    strokeWidth={1.75}
                  />
                </span>
                <div>
                  <p className="text-lg font-semibold leading-snug text-[#140F2E] sm:text-xl">
                    {scenario}
                  </p>
                  <p className="mt-1.5 text-sm text-[#6A6488]">{vertical}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
