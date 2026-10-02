import { Palette, CalendarClock, LayoutDashboard, ArrowUpRight } from 'lucide-react';
import { BookingPageMock, CalendarMock, DashboardMock } from './ProductMocks';
import { SectionOpener } from './Primitives';
import { Reveal } from './Reveal';

// The reference separates its three service cards BY COLOUR, not by a
// shadow under three identical white boxes — one cream, one solid lime,
// one solid dark. That single decision is most of why its feature row
// doesn't read as the generic SaaS card kit, so it's the thing worth
// taking. Each card therefore carries a full self-contained palette
// (surface / heading / body / icon chip / arrow button) rather than
// className overrides on a shared card, which in this codebase is also
// the rule that keeps Tailwind from silently dropping the override
// (see CLAUDE.md — a later utility in the string does not reliably win).
//
// Heights are deliberately unequal (`lg:mt-*`): the middle card sits
// lower than its neighbours so the row reads as a composition instead
// of a table row. `items-start` on the grid is what allows that.
type Skin = {
  surface: string;
  heading: string;
  body: string;
  chip: string;
  chipIcon: string;
  arrow: string;
  // The badge inside the CTA pill needs the opposite tint depending on
  // whether that pill is dark or light — a white veil on a lime pill is
  // invisible, and a black veil on a near-black pill is too.
  arrowBadge: string;
  frame: string;
  focus: string;
};

const PAPER: Skin = {
  surface: 'bg-white',
  heading: 'text-[#140F2E]',
  body: 'text-[#6A6488]',
  chip: 'bg-[#5B34E8]',
  chipIcon: 'text-white',
  arrow: 'bg-[#5B34E8] text-white group-hover:bg-[#4423C4]',
  arrowBadge: 'bg-white/20',
  frame: 'ring-1 ring-[#140F2E]/[0.06]',
  focus: 'focus-visible:ring-[#5B34E8]',
};

const LIME: Skin = {
  surface: 'bg-[#D4F23A]',
  heading: 'text-[#140F2E]',
  body: 'text-[#3A3170]',
  chip: 'bg-[#140F2E]',
  chipIcon: 'text-[#D4F23A]',
  arrow: 'bg-[#140F2E] text-[#D4F23A] group-hover:bg-[#2A1B5E]',
  arrowBadge: 'bg-white/15',
  frame: 'ring-1 ring-black/[0.08]',
  focus: 'focus-visible:ring-[#140F2E]',
};

// Body copy on the vivid violet card is a LIGHTER muted than the one
// used on the deep violet blocks: #B9B1E6 only clears 3.5:1 against
// #5B34E8, which is under AA for body text. Checked, not eyeballed.
const VIOLET: Skin = {
  surface: 'bg-[#5B34E8]',
  heading: 'text-white',
  body: 'text-[#E3DEFA]',
  chip: 'bg-[#D4F23A]',
  chipIcon: 'text-[#140F2E]',
  arrow: 'bg-[#D4F23A] text-[#140F2E] group-hover:bg-[#B5D42B]',
  arrowBadge: 'bg-black/10',
  frame: 'ring-1 ring-white/15',
  focus: 'focus-visible:ring-[#D4F23A]',
};

// The original five-item feature list is grouped into three (nothing
// dropped — reschedule/cancel-by-link lives inside the availability
// card's copy, the automatic email inside the panel card's copy).
const FEATURES = [
  {
    title: 'Tu propia página de reservas',
    description:
      'Colores, logo y tema claro u oscuro de tu negocio — no una plantilla genérica con tu nombre pegado encima.',
    Mock: BookingPageMock,
    Icon: Palette,
    skin: PAPER,
    offset: '',
  },
  {
    title: 'Disponibilidad real, sin ida y vuelta',
    description:
      'El cliente ve los horarios que de verdad están libres, y puede reagendar o cancelar solo desde el link de su cita — sin cuenta ni llamadas.',
    Mock: CalendarMock,
    Icon: CalendarClock,
    skin: LIME,
    offset: 'lg:mt-10',
  },
  {
    title: 'Confirmaciones y panel en un lugar',
    description:
      'Cada reserva y cada cambio avisan solos por correo. Tú administras calendario, recursos, servicios y clientes desde un solo panel.',
    Mock: DashboardMock,
    Icon: LayoutDashboard,
    skin: VIOLET,
    offset: 'lg:mt-4',
  },
];

export function FeaturesSection() {
  return (
    <section id="funciones" className="bg-[#F5F3FC] px-6 py-14 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionOpener
            eyebrow="Qué incluye"
            title="Tres piezas que hacen el trabajo que hoy haces tú."
            intro="No es un chat con recordatorios ni una agenda compartida. Es el sistema completo: la página que reserva, la disponibilidad que no se equivoca, y el panel donde vive todo."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 items-start gap-5 sm:mt-16 sm:gap-6 lg:grid-cols-3">
          {FEATURES.map(({ title, description, Mock, Icon, skin, offset }, i) => (
            <Reveal key={title} delay={i * 100} className={offset}>
              <article
                className={`group flex h-full flex-col rounded-[28px] p-5 transition-transform sm:p-6 duration-300 hover:-translate-y-1 ${skin.surface} ${skin.frame}`}
              >
                <div className="relative overflow-hidden rounded-2xl">
                  <div className="h-36 sm:h-44">
                    <Mock />
                  </div>
                  <span
                    className={`absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full ${skin.chip}`}
                  >
                    <Icon className={`h-5 w-5 ${skin.chipIcon}`} strokeWidth={1.75} />
                  </span>
                </div>

                <h3
                  className={`mt-6 font-[family-name:var(--font-display)] text-[1.3rem] font-extrabold uppercase leading-[1.05] tracking-[-0.01em] ${skin.heading}`}
                >
                  {title}
                </h3>
                <p className={`mt-3 flex-1 text-sm leading-relaxed ${skin.body}`}>{description}</p>

                <a
                  href="/demo"
                  className={`mt-6 inline-flex w-fit items-center gap-2 rounded-full py-1.5 pl-5 pr-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${skin.arrow} ${skin.focus}`}
                >
                  Verlo funcionando
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5 ${skin.arrowBadge}`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
