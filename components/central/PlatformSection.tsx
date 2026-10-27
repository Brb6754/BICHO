import { Check, Contact } from 'lucide-react';
import { SectionOpener } from '@/components/marketing/Primitives';
import { Reveal } from '@/components/marketing/Reveal';
import { SECCIONES_DEL_DIRECTORIO } from '@/lib/contacts/categories';
import { BotonContorno, BotonPieza, Destello } from './Collage';
import { MODULOS, PAPEL_DEL_MODULO } from './platform';

// La plataforma: cuatro módulos que se contratan por separado, y la
// ficha del cliente que los une.
//
// Va en la primera hoja blanca, antes de los servicios a la medida, por
// una razón de venta: esto es lo único que alguien puede ver funcionando
// hoy mismo. El trabajo a la medida se explica después, cuando ya creyó.
//
// Cada tarjeta dice lo que el módulo HACE, no lo que promete. El claim
// de arriba es la frase que un dueño reconocería como su propio problema
// —"tu agenda deja de vivir en WhatsApp"— y debajo va lo que hay.
//
// Rejilla de 2×2 y no de cuatro columnas: a 270px por tarjeta, un claim
// de 20px se parte en cuatro renglones y los bullets se amontonan. Con
// cuatro módulos, dos por fila es la medida en la que cada uno se lee.
export function PlatformSection() {
  return (
    <section id="plataforma" className="bg-white px-5 py-20 sm:px-6 sm:py-28">
      <div className="relative mx-auto max-w-6xl">
        <Destello className="absolute -left-2 -top-10 hidden w-10 text-[#5B34E8] lg:block" />
        <SectionOpener
          title={
            <>
              Cuatro módulos.
              <br />
              Contratas los que usas.
            </>
          }
          grande
          intro="Un salón quizá solo quiere la agenda. Un instalador, agendar visitas y cotizar. Un taller, cotizar y facturar. Cada módulo se prende por separado y el panel se arma con lo que tengas."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 sm:gap-7">
          {MODULOS.map(({ id, Icon, name, claim, blurb, bullets }, i) => {
            const p = PAPEL_DEL_MODULO[id];
            return (
              <Reveal key={id} delay={i * 90} variant="pegar">
                {/* Cada módulo en SU papel —el mismo de su pieza en el hero—
                    con la sombra dura de la campaña y una inclinación de un
                    grado: lo justo para que se sienta puesta a mano sin
                    torcer un párrafo que hay que leer. */}
                <article
                  className={`pieza flex h-full flex-col rounded-[1.75rem] p-7 shadow-[0_7px_0_#1B1040] hover:shadow-[0_14px_0_#1B1040] ${p.fondo} ${p.orilla ?? ''}`}
                  style={{ ['--r' as string]: `${i % 2 === 0 ? -0.8 : 0.8}deg` }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-7 w-7 shrink-0 ${p.texto}`} strokeWidth={2.2} aria-hidden="true" />
                    <p
                      className={`font-[family-name:var(--font-display)] text-[19px] font-extrabold uppercase leading-none ${p.texto}`}
                    >
                      {name}
                    </p>
                  </div>

                  <h3 className={`mt-6 text-[21px] font-bold leading-snug ${p.texto}`}>{claim}</h3>
                  {/* `flex-1` en el párrafo: los bullets de las cuatro
                      tarjetas quedan a la misma altura. */}
                  <p className={`mt-3 max-w-[46ch] flex-1 text-[15px] leading-relaxed ${p.sutil}`}>
                    {blurb}
                  </p>

                  <ul
                    className={`mt-6 flex flex-col gap-2 border-t pt-5 ${
                      id === 'facturacion' ? 'border-white/15' : 'border-[#14092E]/15'
                    }`}
                  >
                    {bullets.map((b) => (
                      <li key={b} className={`flex items-center gap-2.5 text-[14px] font-medium ${p.texto}`}>
                        <Check className={`h-4 w-4 shrink-0 ${p.marca}`} strokeWidth={3} aria-hidden="true" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120} variant="pegar">
          <FichaDelCliente />
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <BotonPieza href="/demo">Agenda una demo</BotonPieza>
          <BotonContorno href="/reservas" sobre="claro">
            Ver la plataforma por dentro
          </BotonContorno>
        </div>
      </div>
    </section>
  );
}

// Lo que une a los cuatro módulos. No es un quinto módulo —no se
// contrata, viene con cualquiera— y por eso no va en la rejilla: va
// debajo, a lo ancho y en oscuro, porque es la respuesta a "¿y cómo se
// juntan?".
//
// La lista de la derecha son las secciones REALES del directorio, leídas
// de `lib/contacts/categories.ts`. Si alguien renombra una allá, esta
// página cambia con ella en vez de prometer una pantalla que ya no
// existe. Y respeta la regla del producto: solo lo que pide acción lleva
// color.
function FichaDelCliente() {
  return (
    <div className="mt-8 grid gap-10 rounded-[1.75rem] bg-[#14092E] p-7 shadow-[0_8px_0_#D4F23A] sm:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16">
      <div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D4F23A]">
          <Contact className="h-5 w-5 text-[#14092E]" strokeWidth={2} aria-hidden="true" />
        </span>
        <h3 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(1.6rem,3.2vw,2.3rem)] font-extrabold uppercase leading-[0.98] tracking-[-0.02em] text-white">
          Y todos llenan
          <br />
          la misma ficha
        </h3>
        <p className="mt-5 max-w-[50ch] text-[15px] leading-relaxed text-[#C9C2EE]">
          Cada persona que reserva, agenda una reunión, recibe una cotización o te pide factura
          queda en un solo lugar, con todo su historial y tus notas. Y tu lista de clientes se
          ordena sola por lo que cada quien necesita de ti.
        </p>
        <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#D4F23A]">
          <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          Incluida con cualquier módulo
        </p>
      </div>

      <ul
        aria-label="Cómo se ordena tu lista de clientes"
        className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10"
      >
        {SECCIONES_DEL_DIRECTORIO.map(({ titulo, accionable }, i) => (
          <li
            key={titulo}
            className={`flex items-center gap-3 px-5 py-3.5 text-[15px] ${
              i > 0 ? 'border-t border-white/[0.08]' : ''
            } ${accionable ? 'font-semibold text-white' : 'text-[#A79FD6]'}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${
                accionable ? 'bg-[#D4F23A]' : 'bg-white/25'
              }`}
            />
            {titulo}
          </li>
        ))}
      </ul>
    </div>
  );
}
