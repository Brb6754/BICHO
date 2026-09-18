import { Mail } from 'lucide-react';
import { PillLink } from './Primitives';
import { Reveal } from './Reveal';

// The page's loudest surface, used exactly once, at the end: a full
// violet slab. It's the only place the brand colour becomes the ground
// at full width, and it closes the page against the lime utility strip
// at the very top — which is what makes it read as the closing beat rather
// than one more teal section with a button in it.
export function FinalCta() {
  return (
    <section className="bg-white px-6 pb-24 sm:pb-28">
      <Reveal className="mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[#5B34E8] px-8 py-14 sm:px-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
          <h2 className="font-[family-name:var(--font-display)] text-[2.25rem] font-bold uppercase leading-[1.02] tracking-[-0.01em] text-white sm:text-[3rem]">
            Deja de agendar
            <br />
            a mano. Empieza hoy.
          </h2>

          <div className="lg:pb-2">
            <p className="max-w-sm text-[15px] leading-relaxed text-[#E3DEFA]">
              15 días de prueba, sin tarjeta. Montamos tu página de reservas
              contigo — colores, servicios y horarios — antes de que la
              compartas con nadie.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <PillLink
                href="/demo"
                tone="lime"
              >
                Agenda una demo
              </PillLink>

              <a
                href="mailto:nonameynk@gmail.com"
                className="group inline-flex items-center gap-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-75"
              >
                <Mail className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                nonameynk@gmail.com
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
