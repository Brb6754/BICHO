import { Scissors, Sparkles, Stethoscope, Dumbbell } from 'lucide-react';

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

// 2x2 grid of raised cards (was a plain divided list — Bruno wanted
// this section more eye-catching). Same icons TrustSection uses for
// these verticals, for visual consistency between the two. The
// scenario text is the loud part (large, bold, quote-shaped) since
// that's the actual pain point — the vertical name is now a small
// label underneath instead of leading.
export function ProblemSection() {
  return (
    <section className="bg-[#0D2B1B] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            Un chat no es un sistema de citas.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#9CA99A] sm:text-lg">
            Si tu negocio agenda por WhatsApp o en una libreta, ya conoces
            estas escenas. No son casos raros — son el día a día de un
            negocio que crece más rápido que su forma de agendar.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {SCENARIOS.map(({ vertical, scenario, Icon }) => (
            <div
              key={vertical}
              className="relative overflow-hidden rounded-3xl bg-[#123321] p-8"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#D4F23A]/10"
              />
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4F23A]">
                <Icon className="h-6 w-6 text-black" strokeWidth={1.75} />
              </span>
              <p className="relative mt-6 text-xl font-semibold leading-snug text-white">
                {scenario}
              </p>
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.15em] text-[#D4F23A]">
                {vertical}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
