import { BichoLogo } from './BichoLogo';
import { Reveal } from './Reveal';

export function FinalCta() {
  return (
    <section className="bg-[#0D2B1B] px-6 py-24">
      <Reveal className="mx-auto flex max-w-6xl flex-col items-center border-t border-[#1E3A28] pt-24 text-center">
        <BichoLogo className="h-10" />
        <h2 className="mt-8 max-w-xl text-3xl font-bold leading-tight text-white sm:text-4xl">
          Deja de agendar a mano. Empieza hoy.
        </h2>
        <p className="mt-4 max-w-md text-base leading-relaxed text-[#9CA99A]">
          15 días de prueba, sin tarjeta. Configuramos tu página de reservas
          contigo.
        </p>
        <a
          href="mailto:nonameynk@gmail.com?subject=Quiero%20una%20demo%20de%20bicho"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[#D4F23A] px-7 py-3 text-sm font-semibold text-black transition hover:brightness-95"
        >
          Agenda una demo
        </a>
      </Reveal>
    </section>
  );
}
