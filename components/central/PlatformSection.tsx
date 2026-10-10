import { SectionOpener, PillLink } from '@/components/marketing/Primitives';
import { Reveal } from '@/components/marketing/Reveal';
import { MODULOS } from './platform';

// La plataforma: tres módulos que se contratan por separado.
//
// Va en la primera hoja blanca, antes de los servicios a la medida, por
// una razón de venta: esto es lo único que alguien puede ver funcionando
// hoy mismo. El trabajo a la medida se explica después, cuando ya creyó.
//
// Cada tarjeta dice lo que el módulo HACE, no lo que promete. El claim
// de arriba es la frase que un dueño reconocería como su propio problema
// —"tu agenda deja de vivir en WhatsApp"— y debajo va lo que hay.
export function PlatformSection() {
  return (
    <section id="plataforma" className="bg-white px-5 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionOpener
          eyebrow="La plataforma"
          title={
            <>
              Tres módulos.
              <br />
              Contratas los que usas.
            </>
          }
          intro="Un salón quizá solo quiere la agenda. Un taller, cotizar y facturar. Cada módulo se prende por separado y el panel se arma con lo que tengas."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map(({ id, Icon, name, claim, blurb, bullets }, i) => (
            <Reveal key={id} delay={i * 80}>
              <article className="flex h-full flex-col rounded-3xl bg-[#F5F3FC] p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5B34E8]">
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} aria-hidden="true" />
                </span>

                <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#5B34E8]">
                  {name}
                </p>
                <h3 className="mt-2 text-[20px] font-bold leading-snug text-[#140F2E]">{claim}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#6A6488]">{blurb}</p>

                <ul className="mt-6 flex flex-col gap-2 border-t border-[#140F2E]/10 pt-5">
                  {bullets.map((b) => (
                    <li key={b} className="text-[14px] text-[#140F2E]">
                      {b}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <PillLink href="/reservas" tone="violet">
            Ver la plataforma por dentro
          </PillLink>
          <PillLink href="/demo" tone="outlineOnLight">
            Agenda una demo
          </PillLink>
        </div>
      </div>
    </section>
  );
}
