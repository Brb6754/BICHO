import { CircleStamp, Sparkle } from '@/components/marketing/Flourishes';
import { Reveal } from '@/components/marketing/Reveal';
import { BotonContorno, BotonPieza, Destello } from './Collage';

// La última palabra, de vuelta en el papel morado del hero: la página
// abre y cierra con el mismo suelo, y en medio pasa por blanco, lima,
// berenjena y lila sin repetir dos seguidos. Es la vibra de la campaña
// en el orden de la página, no solo en su primera pantalla.
export function CentralFinalCta() {
  return (
    <section
      className="relative isolate overflow-hidden bg-[#5A31E6] bg-cover bg-center px-5 py-20 text-center sm:px-6 sm:py-28"
      style={{ backgroundImage: 'url(/campana/fondo-morado.webp)' }}
    >
      <CircleStamp className="absolute -right-10 top-10 hidden h-36 w-36 lg:block" />
      <Sparkle className="anim-destellar absolute left-[8%] top-[22%] hidden h-10 w-10 text-[#D4F23A] lg:block" />

      <Reveal className="relative mx-auto max-w-2xl" variant="golpe">
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,7vw,4.6rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.02em] text-white">
          ¿Tienes algo
          <br />
          <span className="relative inline-block text-[#D4F23A]">
            en mente?
            <Destello
              voltear
              className="anim-destellar absolute -right-[0.55em] -top-[0.15em] w-[0.42em] text-[#D4F23A]"
            />
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-[#ECE6FF]">
          Cuéntanos qué necesita tu negocio — agendar, dar seguimiento a tus clientes, cotizar,
          facturar, o algo que todavía no existe — y de ahí partimos.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <BotonPieza href="/demo">Agenda una demo</BotonPieza>
          <BotonContorno href="mailto:nonameynk@gmail.com" sobre="oscuro">
            Escríbenos
          </BotonContorno>
        </div>
      </Reveal>
    </section>
  );
}
