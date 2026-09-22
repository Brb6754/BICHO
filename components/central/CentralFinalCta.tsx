import { PillLink } from './Primitives';
import { Bloom } from './Flourishes';
import { Reveal } from '@/components/marketing/Reveal';

// The page's last word. Marked off by a top hairline and its own bloom
// rather than a colour change — the whole page is dark, so a slab here
// would just be a second hero.
export function CentralFinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.08] px-6 py-24 text-center sm:py-28">
      <Bloom
        className="left-1/2 top-full h-[30rem] w-[46rem] -translate-x-1/2 -translate-y-2/3"
        intensity={0.4}
      />

      <Reveal className="relative mx-auto max-w-xl">
        <h2 className="font-[family-name:var(--font-central)] text-[clamp(1.75rem,4vw,2.6rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-white">
          ¿Tienes un proyecto en mente?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#8C9BC9]">
          Cuéntanos qué necesita tu negocio — un sistema, un sitio, un agente
          o entender tus números — y de ahí partimos.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <PillLink href="mailto:nonameynk@gmail.com" tone="core">
            Escríbenos
          </PillLink>
          <PillLink href="/reservas" tone="outlineOnDark">
            Ver bicho reservas
          </PillLink>
        </div>
      </Reveal>
    </section>
  );
}
