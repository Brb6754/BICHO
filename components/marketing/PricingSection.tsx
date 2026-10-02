import { Check } from 'lucide-react';
import { SectionOpener } from './Primitives';
import { Reveal } from './Reveal';
import { DotField } from './DotField';

// $300 MXN al mes, un solo plan, decidido por Bruno el 2026-10-02.
//
// Antes eran tres columnas con precios inventados ($399/$699/$1,199) y
// un comentario que pedía confirmarlos antes de publicar. Esto reemplaza
// eso con el número real.
//
// Y por eso el layout cambió de raíz: tres columnas existen para que se
// comparen entre ellas. Con un solo precio no hay nada que comparar, y
// una sola tarjeta angosta en medio de una página ancha se lee como si
// se hubieran caído las otras dos. Un panel: el número a la izquierda,
// lo que incluye a la derecha.
//
// La lista dice solo lo que el producto HACE hoy. WhatsApp no está aquí
// a propósito: es un extra que se prende por negocio y cuesta aparte, y
// todavía le falta la configuración en Meta.
const INCLUDED = [
  'Tu página de reservas lista en menos de 24 horas',
  'Con tu marca: tu logo, tus colores, tus servicios',
  'Recursos y servicios sin límite',
  'Confirmación automática por correo',
  'Tus clientes reagendan o cancelan solos, sin escribirte',
  'Panel para tu equipo: agenda del día, clientes y bloqueos',
];

export function PricingSection() {
  return (
    <section id="precios" className="relative overflow-hidden bg-[#F5F3FC] px-6 py-24 sm:py-28">
      <DotField />
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <SectionOpener
            eyebrow="Precios"
            title="Un precio, todo incluido."
            intro="Sin planes que comparar ni funciones apagadas esperando a que pagues más. Los 15 días de prueba no piden tarjeta: decides con tu página ya montada y recibiendo citas."
          />
        </Reveal>

        <Reveal delay={90}>
          <div className="mt-16 grid gap-10 rounded-[28px] bg-white p-8 ring-1 ring-inset ring-[#140F2E]/[0.06] sm:p-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-display)] text-[clamp(3.5rem,9vw,5rem)] font-bold leading-none text-[#140F2E]">
                  $300
                </span>
                <span className="text-lg font-semibold text-[#6A6488]">MXN</span>
              </div>
              <p className="mt-2 text-sm text-[#6A6488]">al mes, por negocio</p>

              {/* El lima nunca es texto sobre blanco (1.4:1): aquí es
                  relleno con tinta encima, que es la única forma en que
                  este color funciona fuera del campo violeta. */}
              <p className="mt-6 inline-flex rounded-full bg-[#D4F23A] px-4 py-2 text-sm font-semibold text-[#140F2E]">
                15 días gratis, sin tarjeta
              </p>

              <a
                href="/demo"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-[#140F2E] px-6 py-3.5 text-sm font-semibold text-[#D4F23A] transition-colors duration-200 hover:bg-[#2A1B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#140F2E] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Empezar prueba de 15 días
              </a>
              <p className="mt-3 text-[13px] leading-snug text-[#6A6488]">
                Cancela cuando quieras. Si cancelas, tu página deja de recibir citas nuevas y
                tus datos siguen siendo tuyos.
              </p>
            </div>

            <ul className="space-y-4 border-t border-[#140F2E]/[0.08] pt-8 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-snug text-[#3A3170]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5B34E8]" strokeWidth={2.5} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
