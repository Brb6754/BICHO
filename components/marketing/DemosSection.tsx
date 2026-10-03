import { ArrowUpRight, LayoutDashboard } from 'lucide-react';
import { SectionOpener } from './Primitives';
import { Reveal } from './Reveal';

// Ocho negocios de verdad, abiertos.
//
// Es la sección que la landing no tenía y más falta hacía: todo lo que
// la página promete —"con tu marca", "lista en menos de 24 horas"— se
// podía afirmar pero no comprobar. Aquí se comprueba en un clic.
//
// LA PRIMERA VERSIÓN ERAN DOS BOTONES POR TARJETA y a Bruno no le
// gustaron, con razón: dieciséis pastillas apiladas en una rejilla son
// dieciséis decisiones para quien mira, y el relleno sólido con el
// color de cada negocio salía casi negro en la mitad de ellos. Además
// gastaba la tarjeta entera en cromo cuando teníamos algo mucho mejor
// que enseñar: la foto del local.
//
// Ahora la tarjeta ES el enlace a la página del negocio, con su foto y
// su nombre encima, y el panel queda como un enlace discreto DEBAJO —
// fuera del ancla, nunca dentro: un <a> dentro de otro <a> es HTML
// inválido y en este proyecto ya provocó un error de hidratación real.
const DEMOS = [
  { slug: 'don-ramon', nombre: 'Barbería Don Ramón', giro: 'Barbería', acento: '#C8793C' },
  { slug: 'casa-luma', nombre: 'Casa Luma', giro: 'Salón de belleza', acento: '#C0714B' },
  { slug: 'agua-serena', nombre: 'Agua Serena', giro: 'Spa', acento: '#8FB184' },
  { slug: 'dental-nova', nombre: 'Dental Nova', giro: 'Dentista', acento: '#2FB2C6' },
  { slug: 'clinica-alameda', nombre: 'Clínica Alameda', giro: 'Consultorio médico', acento: '#79B58C' },
  { slug: 'hierro-monte', nombre: 'Hierro & Monte', giro: 'Gimnasio', acento: '#FF5C2B' },
  { slug: 'alto-padel', nombre: 'Alto Pádel Club', giro: 'Club de pádel', acento: '#8CC63F' },
  { slug: 'mesa-doce', nombre: 'Mesa Doce', giro: 'Restaurante', acento: '#C8891F' },
];

const DOMINIO = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'bichomx.com';
// En local el dominio raíz es `localhost:3000`, que no habla https — y
// un enlace https a localhost no abre nada.
const ESQUEMA = DOMINIO.startsWith('localhost') ? 'http' : 'https';

export function DemosSection() {
  return (
    <section id="demos" className="bg-white px-6 py-14 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionOpener
            eyebrow="Míralo funcionando"
            title="Ocho negocios, ocho páginas distintas."
            intro="Están abiertos, sin contraseña. Entra a cualquiera: reserva una cita como lo haría tu cliente, y luego abre el panel para ver cómo le llega al dueño."
          />
        </Reveal>

        <div className="mt-12 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {DEMOS.map(({ slug, nombre, giro, acento }, i) => (
            <Reveal key={slug} delay={i * 60}>
              <a
                href={`${ESQUEMA}://${slug}.${DOMINIO}`}
                className="group block overflow-hidden rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8] focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#F5F3FC]">
                  {/* La foto del local, la misma que usa su propia
                      página. Es lo que convierte una rejilla de nombres
                      en ocho negocios que se ven distintos. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/demo/${slug}.webp`}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  {/* El velo sube de la base: sin él, el nombre cae
                      sobre una ventana o un reflejo y desaparece. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(10,6,28,0.88) 0%, rgba(10,6,28,0.45) 42%, rgba(10,6,28,0.05) 75%)',
                    }}
                  />

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: acento }}>
                      {giro}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[15px] font-bold leading-snug text-white">
                      {nombre}
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </p>
                  </div>
                </div>
              </a>

              {/* Fuera del ancla de arriba, a propósito. */}
              <a
                href={`${ESQUEMA}://${slug}.${DOMINIO}/panel`}
                className="mt-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-medium text-[#6A6488] transition-colors hover:text-[#5B34E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8]"
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                Ver su panel
              </a>
            </Reveal>
          ))}
        </div>

        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-[#6A6488]">
          Son negocios de ejemplo: las citas del panel están inventadas, pero los servicios, los
          precios y los horarios son reales y es lo mismo que recibe un negocio nuevo el primer día.
        </p>
      </div>
    </section>
  );
}
