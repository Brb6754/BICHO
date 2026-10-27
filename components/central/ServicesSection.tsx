import { Check } from 'lucide-react';
import { SectionOpener } from '@/components/marketing/Primitives';
import { Reveal } from '@/components/marketing/Reveal';
import { Sparkle } from '@/components/marketing/Flourishes';
import { SERVICES } from './services';

// Lo que bicho construye a la medida, cuando la plataforma no alcanza.
//
// Va DESPUÉS de los módulos a propósito: primero lo que alguien puede
// ver funcionando hoy, y recién entonces lo que se construye desde
// cero. Al revés, un negocio chico se siente fuera de lugar antes de
// entender que la plataforma es para él.
//
// La banda es LIMA COMPLETO (2026-10-27, "la vibra en toda la página"):
// es la sección más atrevida de la landing a propósito, justo después de
// la hoja blanca de la plataforma, para que bajar nunca se lea como una
// sola extensión blanca. Las tarjetas son papel blanco puesto encima, con
// la sombra dura de la campaña y un grado de inclinación alternado.
//
// `proof` se queda tal cual. Es lo que cada servicio puede afirmar hoy
// sin inventar un caso de éxito que no existe.
export function ServicesSection() {
  return (
    <section id="servicios" className="bg-[#D4F23A] px-5 py-20 sm:px-6 sm:py-28">
      <div className="relative mx-auto max-w-6xl">
        <Sparkle className="anim-destellar absolute -top-8 right-2 hidden h-12 w-12 text-[#14092E] lg:block" />
        <SectionOpener
          title={
            <>
              ¿Y si lo tuyo
              <br />
              no cabe ahí?
            </>
          }
          intro="No todo negocio necesita lo mismo. Cuando la plataforma no alcanza, se construye: software propio, un sitio, un agente que conteste, o los números puestos en claro."
          sobreColor
          grande
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 sm:gap-7">
          {SERVICES.map(({ id, Icon, name, blurb, bullets, proof }, i) => (
            <Reveal key={id} delay={i * 90} variant="pegar">
              <article
                className="pieza flex h-full flex-col rounded-[1.75rem] bg-white p-7 shadow-[0_7px_0_#1B1040] hover:shadow-[0_14px_0_#1B1040]"
                style={{ ['--r' as string]: `${i % 2 === 0 ? 0.8 : -0.8}deg` }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5B34E8]">
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} aria-hidden="true" />
                </span>

                <h3 className="mt-5 text-[19px] font-bold leading-snug text-[#140F2E]">{name}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-[#6A6488]">{blurb}</p>

                <ul className="mt-5 flex flex-col gap-2">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-[14px] text-[#140F2E]">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#5B34E8]/15 text-[#5B34E8]">
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden="true" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <p className="mt-auto border-t border-[#140F2E]/10 pt-4 text-[13px] font-medium text-[#5B34E8]">
                  {proof}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
