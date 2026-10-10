import { MarketingNav } from '@/components/marketing/MarketingNav';
import { PillLink } from '@/components/marketing/Primitives';
import { GridField, Sparkle } from '@/components/marketing/Flourishes';
import { MODULOS } from './platform';

// La apertura del estudio.
//
// Comparte el sistema con la landing del producto —misma tipografía,
// mismo lima, mismos botones— pero NO su hero, a propósito: el de
// /reservas es un campo morado vivo con el titular centrado, y repetirlo
// aquí hacía que las dos páginas abrieran igual.
//
// Las dos diferencias son de composición, no de tono, porque recolorear
// el mismo bloque habría sido el mismo hero en otra pintura:
//
//   · FONDO CASI NEGRO con tinte violeta en vez del morado vivo. El
//     producto grita; la casa del estudio tiene otra voz, y el lima
//     resalta mucho más sobre este fondo.
//   · ALINEADO A LA IZQUIERDA y no centrado, con los tres módulos
//     listados al pie del bloque: se lee como una portada de estudio,
//     no como la cabecera de un producto.
export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden bg-[#14092E]">
      <GridField />
      {/* Un resplandor morado detrás del titular: le da profundidad al
          casi-negro sin meter un segundo color. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-0 h-[34rem] w-[34rem] rounded-full opacity-60 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #5B34E8 0%, transparent 70%)' }}
      />

      <MarketingNav tone="onViolet" />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <Sparkle className="mb-6 h-7 w-7" />

        <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.3rem,8.5vw,6rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.03em] text-white">
          Tecnología
          <br />
          para <span className="text-[#D4F23A]">pymes</span>
        </h1>

        <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-[#B9B1E6] sm:text-lg">
          Accesible y muy funcional. El software que los negocios grandes dan por hecho, al precio
          de uno pequeño.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <PillLink href="/demo" tone="lime">
            Agenda una demo
          </PillLink>
          <PillLink href="#plataforma" tone="outlineOnDark">
            Ver la plataforma
          </PillLink>
        </div>

        {/* Los tres módulos, dichos de una línea. No es un menú: es la
            respuesta a "¿y qué hacen?" antes de que haya que bajar. */}
        <ul className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/12 pt-6 text-sm">
          {MODULOS.map(({ id, name, Icon }) => (
            <li key={id} className="flex items-center gap-2 text-[#B9B1E6]">
              <Icon className="h-4 w-4 text-[#D4F23A]" strokeWidth={2} aria-hidden="true" />
              {name}
            </li>
          ))}
          {/* Mas apagado que los modulos, pero medido: #6F64A8 daba 3.67:1
              sobre este fondo y no llega al minimo para texto chico.
              Este da 4.54:1 y sigue leyendose como lo secundario. */}
          <li className="text-[#7E73B8]">y lo que construimos a la medida</li>
        </ul>
      </div>
    </section>
  );
}
