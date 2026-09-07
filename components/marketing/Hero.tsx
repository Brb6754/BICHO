import { BichoLogo, BichoTagline } from './BichoLogo';

// The one orchestrated motion moment on the page (per the frontend-design
// skill: one page-load sequence beats fade-ups scattered on every
// section). Plain CSS, reuses the app's existing .animate-fade-in
// keyframe (globals.css) — that class is pure opacity/transform, no
// color, so it's safe to reuse without touching the shared file. Each
// element's `animationDelay` staggers the reveal without any JS.
export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#000000] px-6 pb-24 pt-20 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
          <BichoLogo className="h-16 sm:h-20" />
        </div>
        <BichoTagline
          className="animate-fade-in mt-3 text-[11px] sm:text-xs"
        />

        <h1
          className="animate-fade-in mt-10 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
          style={{ animationDelay: '80ms' }}
        >
          El agendado de tu negocio no debería vivir en un chat de WhatsApp.
        </h1>

        <p
          className="animate-fade-in mt-6 max-w-xl text-base leading-relaxed text-[#8C8C8C] sm:text-lg"
          style={{ animationDelay: '140ms' }}
        >
          bicho le da a tu peluquería, spa, consultorio o gimnasio una página
          de reservas con tu propia marca, disponibilidad real y confirmación
          automática — para que dejes de agendar citas a mano.
        </p>

        <div
          className="animate-fade-in mt-10 flex flex-wrap items-center gap-4"
          style={{ animationDelay: '200ms' }}
        >
          <a
            href="mailto:nonameynk@gmail.com?subject=Quiero%20una%20demo%20de%20bicho"
            className="inline-flex items-center justify-center rounded-full bg-[#D4F23A] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-95"
          >
            Agenda una demo
          </a>
          <a
            href="#funciones"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/15"
          >
            Ver qué incluye
          </a>
        </div>
      </div>
    </section>
  );
}
