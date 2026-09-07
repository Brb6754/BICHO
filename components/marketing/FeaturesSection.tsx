const FEATURES = [
  {
    title: 'Tu propia página de reservas',
    description:
      'Colores, logo y tema claro u oscuro de tu negocio — no una plantilla genérica con tu nombre pegado encima.',
  },
  {
    title: 'Disponibilidad real, no promesas',
    description:
      'El cliente ve los horarios que de verdad están libres en tu calendario, al momento — nada de "te confirmamos por WhatsApp".',
  },
  {
    title: 'Confirmación automática por correo',
    description:
      'Al reservar y también al reagendar, sin que tú tengas que escribir nada.',
  },
  {
    title: 'Reagendar y cancelar sin llamadas',
    description:
      'Tu cliente lo hace solo desde el link de su cita — no necesita cuenta ni contraseña.',
  },
  {
    title: 'Panel para administrar tu negocio',
    description:
      'Calendario, recursos (sillas, consultorios, canchas), catálogo de servicios y clientes, todo en un solo lugar.',
  },
];

// A divided list of rows, each with a small lime marker — deliberately
// not the identical-card grid this section defaults to. Feature copy
// stays specific to what's actually built (see CLAUDE.md), not generic
// SaaS bullet points.
export function FeaturesSection() {
  return (
    <section id="funciones" className="bg-[#000000] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            Todo lo que tu negocio necesita para dejar de agendar a mano.
          </h2>
        </div>

        <div className="mt-14 divide-y divide-[#1F1F1F] border-t border-[#1F1F1F]">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-5 py-7 sm:grid sm:grid-cols-[16px_320px_1fr] sm:gap-10"
            >
              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-sm bg-[#D4F23A]" aria-hidden />
              {/* sm:contents drops this wrapper from the box tree at the sm
                  breakpoint so title/description become direct grid items
                  in columns 2/3 instead of being squeezed into column 2 alone */}
              <div className="sm:contents">
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[#8C8C8C] sm:mt-0">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
