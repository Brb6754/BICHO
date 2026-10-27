import Link from 'next/link';
import { Plus } from 'lucide-react';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { AsteriskMark, Sparkle } from '@/components/marketing/Flourishes';
import { BotonContorno, BotonPieza, Destello } from './Collage';
import { MODULOS, PAPEL_DEL_MODULO } from './platform';

// La apertura del estudio.
//
// CAMBIO DE RUMBO, 2026-10-27 (Bruno: "más disruptiva", con el anuncio de
// la campaña "Desenreda" como referencia de VIBRA — no de contenido). Una
// primera versión copió el anuncio: su nudo, su calendario, su titular.
// Bruno lo corrigió en una línea, "sigue la vibra, no la repliques", y
// tenía razón: el anuncio es de reservas y esta es la casa del estudio.
//
// Lo que se toma del anuncio es la ACTITUD, no las piezas:
//   · el morado como suelo, con su textura de papel;
//   · la letra gorda y redonda en blanco y lima;
//   · cosas que se sienten pegadas a mano: rotadas, con volumen, nada
//     alineado a la perfección;
//   · el lima como energía (trazos, chispas), nunca como relleno.
//
// La idea es propia del estudio: LOS MÓDULOS SON PIEZAS QUE ELIGES. Cada
// uno es una pieza suelta de un color, y la última es una pieza punteada
// que todavía no existe —lo que se construye a la medida—. Es "contratas
// los que usas" dicho con un dibujo en vez de con una frase.
//
// El titular es el de Bruno, "Tecnología para pymes", y no se toca.

// La inclinación de cada pieza sobre la mesa. El color NO vive aquí: es
// de cada módulo (`PAPEL_DEL_MODULO`) y lo comparte su tarjeta de abajo.
const GIRO: Record<string, number> = { reservas: -5, reuniones: 4, cotizaciones: -3, facturacion: 6 };

// Dónde cae cada pieza sobre la mesa en pantallas anchas. En porcentajes
// del área del dibujo, para que la composición escale entera.
const SITIO: Record<string, string> = {
  reservas: 'lg:left-[4%] lg:top-[4%]',
  reuniones: 'lg:left-[50%] lg:top-[0%]',
  cotizaciones: 'lg:left-[0%] lg:top-[47%]',
  facturacion: 'lg:left-[46%] lg:top-[40%]',
};

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-[#5A31E6] bg-cover bg-center"
      style={{ backgroundImage: 'url(/campana/fondo-morado.webp)' }}
    >
      <MarketingNav tone="onViolet" variant="estudio" />

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-6 sm:pb-28 lg:pt-10">
        {/* EL TITULAR A LO ANCHO. Antes vivía en media columna a 7rem; un
            póster no encierra su titular. "TECNOLOGÍA" mide ~5.8em en
            Baloo 800, así que 14.8vw es lo que la deja llenar el ancho de
            un teléfono (335px) y 11.5rem el de escritorio (1104px) sin
            pasarse. Cada línea cae de golpe, una tras otra: el único
            momento de la página que no espera al scroll. */}
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(3.2rem,14.8vw,11.5rem)] font-extrabold uppercase leading-[0.84] tracking-[-0.03em] text-white">
          <span className="anim-golpe-visible block" style={{ ['--d' as string]: '60ms' }}>
            Tecnología
          </span>
          <span className="anim-golpe-visible block" style={{ ['--d' as string]: '220ms' }}>
            para{' '}
            <span className="relative inline-block text-[#D4F23A]">
              pymes
              <Destello
                voltear
                className="anim-destellar absolute -right-[0.42em] -top-[0.12em] w-[0.34em] text-[#D4F23A]"
              />
            </span>
          </span>
        </h1>

        <div className="mt-10 grid gap-12 lg:mt-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-10">
        <div>
          <p className="max-w-md text-[17px] leading-relaxed text-[#ECE6FF] sm:text-[19px]">
            <span className="font-bold text-white">Accesible y muy funcional.</span> El software que
            los negocios grandes dan por hecho, al precio de uno pequeño.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <BotonPieza href="/demo">Agenda una demo</BotonPieza>
            <BotonContorno href="#plataforma" sobre="oscuro">
              Ver la plataforma
            </BotonContorno>
          </div>
        </div>

        {/* LA MESA. En teléfono las piezas van en una rejilla de dos, cada
            una ladeada un poco: se siguen leyendo, y se siguen sintiendo
            sueltas. Desde lg se riegan en un área con posiciones fijas. */}
        <div className="relative">
          {/* El retraso viaja en una variable CSS, que se hereda: así las
              dos chispas no laten al mismo tiempo. */}
          <span style={{ ['--d' as string]: '1400ms' }}>
            <Sparkle className="anim-destellar absolute -right-1 -top-6 hidden h-10 w-10 text-[#D4F23A] lg:block" />
          </span>
          <AsteriskMark className="anim-destellar absolute -bottom-8 left-[44%] hidden h-9 w-9 text-[#D4F23A] lg:block" />

          <ul
            aria-label="Los módulos de la plataforma"
            className="grid grid-cols-2 gap-x-3 gap-y-5 lg:block lg:aspect-[600/430]"
          >
            {MODULOS.map(({ id, Icon, name, claim }, i) => {
              const p = PAPEL_DEL_MODULO[id];
              return (
                <li
                  key={id}
                  className={`collage-pegar lg:absolute lg:w-[52%] ${SITIO[id]}`}
                  style={{ ['--r' as string]: `${GIRO[id]}deg`, ['--d' as string]: `${120 + i * 110}ms` }}
                >
                  {/* La cara de la pieza: al pasar el cursor se levanta,
                      deshace el giro de su `li` y su sombra crece. */}
                  <div
                    className={`pieza-cara flex h-full cursor-default flex-col rounded-[1.6rem] p-4 shadow-[0_6px_0_#1B1040] hover:shadow-[0_12px_0_#1B1040] sm:p-5 ${p.fondo}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-6 w-6 shrink-0 ${p.texto}`} strokeWidth={2.2} aria-hidden="true" />
                      <span
                        className={`font-[family-name:var(--font-display)] text-[17px] font-extrabold uppercase leading-none sm:text-[20px] ${p.texto}`}
                      >
                        {name}
                      </span>
                    </span>
                    <span className={`mt-3 text-[13px] font-medium leading-snug sm:text-[15px] ${p.sutil}`}>
                      {claim}
                    </span>
                  </div>
                </li>
              );
            })}

            {/* La pieza que todavía no existe: punteada y transparente. Es
                lo que se construye a la medida, y por eso va al final y
                sin color propio. */}
            <li
              className="collage-pegar col-span-2 lg:absolute lg:left-[22%] lg:top-[80%] lg:w-[56%]"
              style={{ ['--r' as string]: '-2deg', ['--d' as string]: '580ms' }}
            >
              <Link
                href="#servicios"
                className="flex items-center gap-3 rounded-[1.6rem] border-2 border-dashed border-white/60 px-5 py-4 text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Plus className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-[family-name:var(--font-display)] text-[17px] font-extrabold uppercase leading-none sm:text-[19px]">
                    Lo tuyo
                  </span>
                  <span className="mt-1 block text-[13px] text-[#ECE6FF] sm:text-[14px]">
                    Lo que todavía no existe, lo construimos
                  </span>
                </span>
              </Link>
            </li>
          </ul>
        </div>
        </div>
      </div>
    </section>
  );
}
