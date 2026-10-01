import { CentralNav } from './CentralNav';
import { Atmosphere, GridField, Bloom } from './Flourishes';
import { PillLink } from './Primitives';
import { ServicesTicker } from './ServicesTicker';

// The studio's opening, cut down hard (2026-09-18): the previous
// version ran a three-line headline, a three-line paragraph and four
// wrapped service chips, and Bruno's note was the right one — it didn't
// fit on one screen. Now the headline is one idea, the paragraph is one
// line, and the four service areas moved into the ticker band at the
// bottom of the section, where they cost one line instead of three
// rows and keep moving so the fold has something alive in it.
export function Hero() {
  return (
    <section id="top" className="relative isolate flex min-h-[86vh] flex-col overflow-hidden bg-[#05091C]">
      <Atmosphere />
      <GridField />
      <Bloom
        className="left-1/2 top-[55%] h-[26rem] w-[44rem] -translate-x-1/2"
        intensity={0.34}
        drift
        duration="38s"
      />
      <CentralNav tone="onDeep" />

      {/* One orchestrated entrance, staggered — the page's single
          non-interactive animation. Deliberately NOT a fade-up per
          section as you scroll: that's the pattern that reads as
          template. Each delay is 110ms after the last, which is long
          enough to be a sequence and short enough that the whole thing
          is done before anyone has finished looking at the headline. */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-14 text-center sm:py-20">
        <h1
          className="hero-rise mx-auto max-w-2xl font-[family-name:var(--font-central)] text-[clamp(2.2rem,5.6vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-white"
          style={{ '--rise-delay': '60ms' } as React.CSSProperties}
        >
          Software, IA y datos para tu negocio
        </h1>
        <p
          className="hero-rise mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[#8C9BC9] sm:text-base"
          style={{ '--rise-delay': '170ms' } as React.CSSProperties}
        >
          Diseñamos, programamos y medimos. Todo en producción, nada en
          maqueta.
        </p>

        <div
          className="hero-rise mt-9 flex flex-wrap items-center justify-center gap-3"
          style={{ '--rise-delay': '280ms' } as React.CSSProperties}
        >
          {/* One action, not two. The platform demo lost its button here
              (2026-10-01, Bruno's call) and lives on in the nav and in
              the portfolio section; what the hero asks for now is the
              conversation, so it gets the whole fold to itself. */}
          <PillLink href="mailto:nonameynk@gmail.com" tone="core">
            Cuéntanos tu proyecto
          </PillLink>
        </div>
      </div>

      <ServicesTicker
        className="hero-rise relative"
        style={{ '--rise-delay': '390ms' } as React.CSSProperties}
      />
    </section>
  );
}
