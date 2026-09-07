import { ArrowRight, CalendarCheck, MailCheck } from 'lucide-react';
import { BichoTagline } from './BichoLogo';
import { CalendarMock, ConfirmationMock, DotGrid } from './ProductMocks';

// The two diagonal lime shapes behind the hero — pulled into their own
// component and rendered by app/page.tsx OUTSIDE both MarketingNav and
// this section (see the wrapper there), not inside Hero's own
// `<section>`: the nav takes real flow height above the section, so a
// shape confined to the section (clipped by ITS OWN overflow-hidden)
// could never reach the section's own top edge, since the section
// itself starts below the nav. The reference bleeds this diagonal
// behind the nav all the way to the literal top corner of the page —
// matching that needs a wrapper that starts at the page's own top,
// spanning both the nav and the hero.
export function HeroBackdrop() {
  return (
    <>
      {/* Fixed px size, not vw-relative — measured against the real
          hero text (tagline starts at y=174-190px depending on
          breakpoint, same everywhere since Hero's own top padding is a
          fixed rem value, not fluid) so this stays entirely above it
          at every viewport width instead of scaling up into the text
          column. The previous vw-sized version grew wide/tall enough
          to sit behind the tagline, headline AND paragraph at once —
          Bruno flagged all three as unreadable. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[20px] top-0 h-[150px] w-[340px] opacity-90"
        style={{ background: '#D4F23A', clipPath: 'polygon(0 0, 75% 0, 20% 100%, 0 100%)' }}
      />
      {/* Pulled down/shrunk enough to stay clear of the top edge
          entirely (the reference has no lime bleeding into the
          top-right corner, only the bottom-right). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[45%] -right-[12%] h-[55vw] w-[50vw] opacity-90"
        style={{ background: '#D4F23A', clipPath: 'polygon(100% 0, 100% 100%, 35% 100%, 70% 0)' }}
      />
    </>
  );
}

// The one orchestrated motion moment on the page (per the frontend-design
// skill: one page-load sequence beats fade-ups scattered on every
// section). Plain CSS, reuses the app's existing .animate-fade-in
// keyframe (globals.css) — that class is pure opacity/transform, no
// color, so it's safe to reuse without touching the shared file. Each
// element's `animationDelay` staggers the reveal without any JS.
//
// 2026 reference redesign: deep forest-green canvas (was flat black,
// now painted by the wrapper in app/page.tsx alongside HeroBackdrop
// above — this section itself stays transparent so that bg/backdrop
// show through) + two floating "photo" cards on the right — mockups of
// the real product (see ProductMocks.tsx) standing in for the
// reference's stock photography, tilted and overlapping the same way.
export function Hero() {
  return (
    <section id="top" className="relative px-6 pb-28 pt-28 sm:pt-32">
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <div>
          <BichoTagline className="animate-fade-in text-[11px] sm:text-xs" />

          <h1
            className="animate-fade-in mt-5 max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl"
            style={{ animationDelay: '80ms' }}
          >
            Deja de agendar citas por WhatsApp.
          </h1>

          <p
            className="animate-fade-in mt-6 max-w-md text-base leading-relaxed text-[#9CA99A] sm:text-lg"
            style={{ animationDelay: '140ms' }}
          >
            bicho le da a tu peluquería, spa, consultorio o gimnasio una
            página de reservas con tu propia marca, disponibilidad real y
            confirmación automática — para que dejes de agendar citas a mano.
          </p>

          <div
            className="animate-fade-in mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: '200ms' }}
          >
            <a
              href="mailto:nonameynk@gmail.com?subject=Quiero%20una%20demo%20de%20bicho"
              className="inline-flex items-center gap-2 rounded-full bg-[#D4F23A] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-95"
            >
              Agenda una demo
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#funciones"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Ver qué incluye
            </a>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="absolute -top-6 left-4 -rotate-6">
            <div className="h-64 w-52 overflow-hidden rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
              <CalendarMock />
            </div>
            <span className="absolute -right-5 -top-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#D4F23A] shadow-lg">
              <CalendarCheck className="h-5 w-5 text-black" />
            </span>
          </div>
          <div className="absolute -bottom-10 right-2 rotate-6">
            <div className="h-60 w-44 overflow-hidden rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
              <ConfirmationMock />
            </div>
            <span className="absolute -left-5 -top-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#D4F23A] shadow-lg">
              <MailCheck className="h-5 w-5 text-black" />
            </span>
          </div>
          <DotGrid className="absolute -bottom-24 left-10" />
        </div>
      </div>
    </section>
  );
}
