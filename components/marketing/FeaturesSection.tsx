import { ArrowUpRight, Palette, CalendarClock, LayoutDashboard } from 'lucide-react';
import { BookingPageMock, CalendarMock, DashboardMock } from './ProductMocks';
import { Reveal } from './Reveal';

// 2026 reference redesign: photo-style cards (mockups of the real
// product standing in for stock photography — see ProductMocks.tsx)
// with a small circular icon badge overlapping the top-left corner and
// a circular arrow button bottom-right, on a light mint background —
// matches the reference's service-card treatment. The original 5-item
// feature list is grouped into these 3 cards (not dropped — the
// reschedule/cancel-by-link detail lives inside the availability card's
// copy, the automatic-email detail inside the dashboard card's copy) so
// the card count matches the reference without losing real content.
const FEATURES = [
  {
    title: 'Tu propia página de reservas',
    description:
      'Colores, logo y tema claro u oscuro de tu negocio — no una plantilla genérica con tu nombre pegado encima.',
    Mock: BookingPageMock,
    Icon: Palette,
  },
  {
    title: 'Disponibilidad real y autoservicio',
    description:
      'El cliente ve los horarios que de verdad están libres, y puede reagendar o cancelar solo desde el link de su cita — sin cuenta ni llamadas.',
    Mock: CalendarMock,
    Icon: CalendarClock,
  },
  {
    title: 'Confirmaciones automáticas y tu panel',
    description:
      'Cada reserva y cada cambio de horario avisan solos por correo. Tú administras calendario, recursos, servicios y clientes desde un solo panel.',
    Mock: DashboardMock,
    Icon: LayoutDashboard,
  },
];

export function FeaturesSection() {
  return (
    <section id="funciones" className="bg-[#F3F4EC] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl text-center sm:mx-auto">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7A9A3E]">
            Funciones
          </span>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-[#0B1A10] sm:text-4xl">
            Todo lo que tu negocio necesita para dejar de agendar a mano.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map(({ title, description, Mock, Icon }, i) => (
            <Reveal key={title} delay={i * 100}>
              <div className="h-full rounded-3xl bg-[#E8F0E0] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-44 overflow-hidden rounded-2xl">
                  <Mock />
                  <span className="absolute -left-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#0D2B1B] shadow-md">
                    <Icon className="h-5 w-5 text-[#D4F23A]" strokeWidth={1.75} />
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#0B1A10]">{title}</h3>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="text-sm leading-relaxed text-[#5B6B5A]">{description}</p>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4F23A]">
                    <ArrowUpRight className="h-4 w-4 text-black" strokeWidth={2.25} />
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
