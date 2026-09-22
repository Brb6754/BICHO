import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, MessageSquare, Sparkles } from 'lucide-react';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { BichoBug, GridField } from '@/components/marketing/Flourishes';
import { DemoForm } from './DemoForm';

export const metadata: Metadata = {
  title: 'Agenda una demo — bicho',
  description:
    'Déjanos tus datos y te mostramos bicho con tu propio negocio montado: tus servicios, tus horarios y tu página de reservas funcionando.',
};

// What the landing's main CTA used to be was a `mailto:` link. That asks
// a phone visitor to have a mail app configured, gives them a blank
// message to compose, and leaves Bruno's inbox as the CRM. This page is
// the actual form: it writes to `demo_requests` (db/019) and emails him.
//
// The three steps are what genuinely happens next, not a funnel diagram:
// nothing here claims a customer count, a response-time SLA beyond what
// one person can honour, or anything else that isn't true yet.
const STEPS = [
  {
    Icon: MessageSquare,
    title: 'Nos cuentas de tu negocio',
    body: 'Qué servicios das, cuánto dura cada uno y quién atiende. Una llamada de 15 minutos.',
  },
  {
    Icon: Sparkles,
    title: 'Te montamos tu página',
    body: 'Con tus colores, tu logo y tus horarios reales. No te mandamos un editor en blanco.',
  },
  {
    Icon: CalendarClock,
    title: 'La usas 15 días gratis',
    body: 'Sin tarjeta. Si al final no te sirve, no pagas nada y no hay que cancelar nada.',
  },
];

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  // Only honour a plan name that actually exists. Anything else arriving
  // in the query string is ignored rather than echoed back into the page
  // and into the lead record.
  const validPlans = ['Básico', 'Profesional', 'Negocio'];
  const selectedPlan = plan && validPlans.includes(plan) ? plan : undefined;

  return (
    <div className="bg-white text-[#140F2E]">
      <section className="relative isolate overflow-hidden bg-[#5B34E8]">
        <GridField />
        <MarketingNav tone="onViolet" />

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-4 sm:pb-28">
          <Link
            href="/reservas"
            className="inline-flex items-center gap-2 rounded-full text-sm font-medium text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F23A] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Link>

          <div className="relative mt-8 max-w-3xl">
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,7.5vw,4.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-white">
              Te la mostramos con <span className="text-[#D4F23A]">tu negocio</span> adentro
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-[#E3DEFA] sm:text-base">
              Nada de una demo genérica con datos de mentira. Montamos tus servicios,
              tus horarios y tu marca, y te enseñamos cómo se ve para tus clientes.
            </p>
          </div>

          {/* Anchored to the padded container, not to the headline block:
              inside max-w-3xl it landed on the word CON, since that line
              runs to the block's own right edge. Out here it sits in the
              empty violet to the right of the text. */}
          <BichoBug className="absolute right-6 top-20 hidden h-20 w-20 rotate-[14deg] lg:block xl:right-10 xl:h-24 xl:w-24" />
        </div>
      </section>

      {/* Same sheet treatment as the homepage: the white laps over the
          violet so the page reads as one surface sliding up, not as two
          stacked bands. */}
      <section className="relative z-10 -mt-8 rounded-t-[36px] bg-white px-6 pb-24 pt-14 sm:-mt-10 sm:rounded-t-[48px] sm:pb-28 sm:pt-16">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
          {/* The form goes first on a phone: it is what this page is for,
              and the three steps below it are context, not a gate. */}
          <div className="order-1 lg:order-2">
            <DemoForm plan={selectedPlan} />
          </div>

          <div className="order-2 lg:order-1">
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,3.6vw,2.2rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.02em] text-[#140F2E]">
              Qué pasa después
            </h2>
            <ol className="mt-8 space-y-7">
              {STEPS.map(({ Icon, title, body }, i) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5B34E8]">
                    <Icon className="h-4 w-4 text-white" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-[#140F2E]">
                      {i + 1}. {title}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[#6A6488]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-10 border-l-2 border-[#5B34E8] pl-5 text-[15px] font-semibold leading-snug text-[#140F2E]">
              Te contesta Bruno, no un bot. Si prefieres escribir directo:{' '}
              <a
                href="mailto:nonameynk@gmail.com"
                className="text-[#5B34E8] underline-offset-4 hover:underline"
              >
                nonameynk@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
