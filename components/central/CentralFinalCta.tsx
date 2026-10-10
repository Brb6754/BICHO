import { PillLink } from '@/components/marketing/Primitives';
import { CircleStamp } from '@/components/marketing/Flourishes';
import { Reveal } from '@/components/marketing/Reveal';

// La última palabra. Un bloque oscuro de puntuación, no un segundo hero:
// después de dos hojas blancas, el cierre tiene que pesar.
export function CentralFinalCta() {
  return (
    <section className="relative overflow-hidden bg-[#1B1040] px-5 py-20 text-center sm:px-6 sm:py-28">
      <CircleStamp className="absolute -right-10 top-10 hidden h-36 w-36 opacity-70 lg:block" />

      <Reveal className="relative mx-auto max-w-xl">
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.9rem,4.4vw,3.1rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-white">
          ¿Tienes algo en mente?
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[#B9B1E6]">
          Cuéntanos qué necesita tu negocio — agendar, cotizar, facturar, o algo que todavía no
          existe — y de ahí partimos.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <PillLink href="/demo" tone="lime">
            Agenda una demo
          </PillLink>
          <PillLink href="mailto:nonameynk@gmail.com" tone="outlineOnDark">
            Escríbenos
          </PillLink>
        </div>
      </Reveal>
    </section>
  );
}
