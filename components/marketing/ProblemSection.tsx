const SCENARIOS = [
  {
    vertical: 'Peluquerías y barberías',
    scenario: 'Dos clientes agendados a la misma hora, y uno se va molesto.',
  },
  {
    vertical: 'Spas y salones',
    scenario: 'El recordatorio nunca llega y el cliente simplemente no aparece.',
  },
  {
    vertical: 'Consultorios',
    scenario: 'El doctor contesta mensajes de pacientes hasta las 11 de la noche.',
  },
  {
    vertical: 'Gimnasios',
    scenario: 'El lugar en la clase es de quien conteste el WhatsApp primero.',
  },
];

// A divided list, not a card grid — the vertical name is a real
// structural label (the content genuinely is organized by business
// type), not a decorative eyebrow. Left-aligned, editorial, deliberately
// plainer than the features section below it so the two don't compete.
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

        <div className="mt-14 divide-y divide-[#1E3A28] border-t border-[#1E3A28]">
          {SCENARIOS.map((row) => (
            <div
              key={row.vertical}
              className="grid grid-cols-1 gap-2 py-6 sm:grid-cols-[220px_1fr] sm:gap-8 sm:py-7"
            >
              <span className="text-sm font-semibold text-white">{row.vertical}</span>
              <span className="text-base text-[#9CA99A]">{row.scenario}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
