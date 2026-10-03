import { ArrowUpRight, LayoutDashboard } from 'lucide-react';
import { SectionOpener } from './Primitives';
import { Reveal } from './Reveal';

// Ocho negocios de verdad, abiertos.
//
// Es la sección que la landing no tenía y más falta hacía: todo lo que
// la página promete —"con tu marca", "lista en menos de 24 horas"— se
// podía afirmar pero no comprobar. Aquí se comprueba en un clic, y en
// dos: la página que ve el cliente y el panel que ve el dueño.
//
// Dos enlaces por tarjeta y no uno, porque el producto son los dos
// lados. Una landing de reservas que solo enseña la página pública
// deja fuera justo la mitad por la que alguien paga.
//
// El color de cada tarjeta es el color REAL de ese negocio en la base.
// Son ocho muestras distintas en una fila: la forma más corta de
// demostrar "con tu marca" sin escribir la frase otra vez.
const DEMOS = [
  { slug: 'don-ramon', nombre: 'Barbería Don Ramón', giro: 'Barbería', color: '#1A1A1A', acento: '#C8793C' },
  { slug: 'casa-luma', nombre: 'Casa Luma', giro: 'Salón de belleza', color: '#4A2318', acento: '#C0714B' },
  { slug: 'agua-serena', nombre: 'Agua Serena', giro: 'Spa', color: '#1D4A5F', acento: '#6F8F63' },
  { slug: 'dental-nova', nombre: 'Dental Nova', giro: 'Dentista', color: '#10395C', acento: '#2FB2C6' },
  { slug: 'clinica-alameda', nombre: 'Clínica Alameda', giro: 'Consultorio médico', color: '#1F4D3D', acento: '#79B58C' },
  { slug: 'hierro-monte', nombre: 'Hierro & Monte', giro: 'Gimnasio', color: '#171717', acento: '#FF5C2B' },
  { slug: 'alto-padel', nombre: 'Alto Pádel Club', giro: 'Club de pádel', color: '#15336B', acento: '#8CC63F' },
  { slug: 'mesa-doce', nombre: 'Mesa Doce', giro: 'Restaurante', color: '#3B4A26', acento: '#C8891F' },
];

const DOMINIO = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'bichomx.com';
// En local el dominio raíz es `localhost:3000`, que no habla https — y
// un enlace https a localhost no abre nada. Así los ocho se pueden
// probar en desarrollo tal como se van a comportar en producción.
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

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEMOS.map(({ slug, nombre, giro, color, acento }, i) => (
            <Reveal key={slug} delay={i * 60}>
              <article className="flex h-full flex-col overflow-hidden rounded-[22px] bg-[#F5F3FC] ring-1 ring-inset ring-[#140F2E]/[0.06]">
                {/* La banda es el color real del negocio: ocho muestras
                    distintas, que es lo que "con tu marca" significa. */}
                <div className="h-2" style={{ background: `linear-gradient(90deg, ${color}, ${acento})` }} />

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: acento }}>
                    {giro}
                  </p>
                  <h3 className="mt-1.5 text-[17px] font-bold leading-snug text-[#140F2E]">{nombre}</h3>

                  <div className="mt-5 flex flex-1 flex-col justify-end gap-2">
                    <a
                      href={`${ESQUEMA}://${slug}.${DOMINIO}`}
                      className="inline-flex items-center justify-between gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{ backgroundColor: color }}
                    >
                      Su página de reservas
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                    <a
                      href={`${ESQUEMA}://${slug}.${DOMINIO}/panel`}
                      className="inline-flex items-center justify-between gap-2 rounded-full border border-[#140F2E]/15 px-4 py-2.5 text-[13px] font-medium text-[#140F2E] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8]"
                    >
                      El panel del dueño
                      <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-sm leading-relaxed text-[#6A6488]">
          Son negocios de ejemplo con datos de ejemplo — las citas del panel están inventadas, los
          servicios y horarios son reales y es lo mismo que recibe un negocio nuevo el primer día.
        </p>
      </div>
    </section>
  );
}
