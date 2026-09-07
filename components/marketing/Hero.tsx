import { ArrowRight, CalendarCheck, MailCheck } from 'lucide-react';
import { BichoTagline } from './BichoLogo';
import { CalendarMock, ConfirmationMock, DotGrid } from './ProductMocks';

// The one orchestrated motion moment on the page (per the frontend-design
// skill: one page-load sequence beats fade-ups scattered on every
// section). Plain CSS, reuses the app's existing .animate-fade-in
// keyframe (globals.css) — that class is pure opacity/transform, no
// color, so it's safe to reuse without touching the shared file. Each
// element's `animationDelay` staggers the reveal without any JS.
//
// 2026 reference redesign: deep forest-green canvas (was flat black) +
// two large diagonal lime shapes bleeding off the top-left/bottom-right
// corners, plus two floating "photo" cards on the right — mockups of
// the real product (see ProductMocks.tsx) standing in for the
// reference's stock photography, tilted and overlapping the same way.
export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#0D2B1B] px-6 pb-28 pt-28 sm:pt-32">
      {/* Flat notch at the very top (0 to 22%) keeps this clear of the
          tagline/headline text — the shape used to reach the section's
          top edge at nearly its widest point, putting lime-on-lime
          text behind the (also lime) tagline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[15%] top-0 h-[60vw] w-[55vw] opacity-90"
        style={{ background: '#D4F23A', clipPath: 'polygon(0 34%, 55% 34%, 18% 100%, 0 100%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[35%] -right-[12%] h-[65vw] w-[50vw] opacity-90"
        style={{ background: '#D4F23A', clipPath: 'polygon(100% 0, 100% 100%, 35% 100%, 70% 0)' }}
      />

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
