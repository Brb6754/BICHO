import { Link2, MailCheck } from 'lucide-react';
import { BookingPageMock, ConfirmationMock } from './ProductMocks';
import { Eyebrow, PillLink } from './Primitives';
import { Reveal } from './Reveal';

// The nav has always linked to #como-funciona; this is the section that
// link was pointing at. It's built as an asymmetric mosaic rather than
// the "heading + three cards" rhythm every other section on this page
// used to have: a two-column split where the LEFT is a composition of
// unequal blocks (a large product frame, a lime statement block, a
// narrow confirmation frame) and the RIGHT is the reading column.
//
// Cream ground, not teal: this is the last beat of the page's light
// middle (see the order comment in app/page.tsx). The dark product
// frames inside it are what carry the contrast — same move as the
// feature cards, where dark mockups sit inside light surfaces.
//
// Numbered markers are used here and nowhere else on the page, because
// this is the one piece of content that genuinely is a sequence — the
// order of the three steps is the information.
const STEPS = [
  {
    title: 'Configuramos tu página',
    body: 'Colores, logo, servicios, duración, horarios y quién atiende. La dejamos lista contigo, no te mandamos un editor en blanco.',
  },
  {
    title: 'Compartes una sola liga',
    body: 'En tu bio de Instagram, en tu estado de WhatsApp, en tu tarjeta. La misma liga sirve para todo.',
  },
  {
    title: 'Las citas llegan solas',
    body: 'Aparecen en tu panel, el cliente recibe su confirmación por correo, y si necesita moverla la mueve él sin escribirte.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="bg-white px-6 py-24 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-20">
        {/* Left: the mosaic. Unequal blocks on purpose — a tall frame
            beside a stacked pair, so the eye moves through it instead
            of scanning a row.

            Single column below sm: at 375px the 3/5 + 2/5 split leaves
            the narrow card about 120px wide, which its own padding
            would eat entirely. Stacking keeps every block readable. */}
        <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="space-y-4 sm:col-span-3">
            <div className="overflow-hidden rounded-[28px] bg-[#1B1040] p-4">
              <div className="h-[260px]">
                <BookingPageMock />
              </div>
            </div>
            <div className="rounded-[28px] bg-[#D4F23A] p-6">
              <Link2 className="h-6 w-6 text-[#140F2E]" strokeWidth={2} aria-hidden="true" />
              <p className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[#140F2E]">
                Una liga
              </p>
              <p className="mt-1 text-sm leading-snug text-[#3A3170]">
                Eso es todo lo que tienes que compartir.
              </p>
            </div>
          </div>

          <div className="space-y-4 sm:col-span-2">
            {/* White, not mist: this card sits ON the mist band, so it
                needs to be a step lighter than its ground to read as
                a surface at all. */}
            <div className="rounded-[28px] bg-white p-6 ring-1 ring-[#140F2E]/[0.06]">
              <MailCheck className="h-6 w-6 text-[#5B34E8]" strokeWidth={2} aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold leading-snug text-[#140F2E]">
                Confirmación automática
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#6A6488]">
                Se manda sola en cuanto alguien reserva.
              </p>
            </div>
            <div className="overflow-hidden rounded-[28px] bg-[#1B1040] p-4">
              <div className="h-[200px]">
                <ConfirmationMock />
              </div>
            </div>
          </div>
        </Reveal>

        {/* Right: the reading column. */}
        <Reveal delay={120}>
          <Eyebrow>Cómo funciona</Eyebrow>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(1.9rem,4.4vw,3.1rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-[#140F2E]">
            Tres pasos, y dejas de contestar &ldquo;¿tienes lugar el jueves?&rdquo;
          </h2>

          <ol className="mt-10 space-y-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5B34E8] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#140F2E]">{step.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[#6A6488]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10">
            <PillLink
              href="/demo"
              tone="violet"
            >
              Empieza tus 15 días
            </PillLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
