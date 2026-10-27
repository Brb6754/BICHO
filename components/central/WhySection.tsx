import { SectionOpener } from '@/components/marketing/Primitives';
import { Reveal } from '@/components/marketing/Reveal';

// Posicionamiento, no prueba por números. No hay un conteo de clientes
// honesto, ni uptime, ni una fila de logos que enseñar — y la regla
// contra inventar prueba social aplica aquí como en todo este código.
// Por eso esta página no tiene banda de estadísticas aunque todas las
// referencias tengan una.
//
// Nada llama chico a bicho (Bruno: "no menciones la palabra estudio
// chico, somos un estudio"). Lo de abajo es cierto de cualquier tamaño
// y se lee como ventaja, no como disculpa.
//
// SIN TARJETAS, a propósito. Era la tercera sección seguida armada con
// la misma pieza —cuadro morado con ícono, título, párrafo— y esa
// repetición es lo que hace que una página se lea como plantilla. Esto
// es una postura, no un catálogo: va como texto, con una regla gruesa en
// tinta encima de cada punto que hace el trabajo que hacía el ícono.
const POINTS = [
  {
    title: 'Hablas con quien programa',
    body: 'Sin intermediarios. La persona que te contesta es la que escribe el código.',
  },
  {
    title: 'Construimos con lo que usamos',
    body: 'La plataforma no es una demo: es nuestro propio producto en producción. Lo que te entregamos ya pasó por ahí.',
  },
  {
    title: 'Desde Durango, para negocios reales',
    body: 'Negocios de servicios, no corporativos. El objetivo es que dejes de operar a mano, no venderte funciones que nadie pidió.',
  },
];

export function WhySection() {
  return (
    // Suelo LILA, el papel claro de la campaña: después del berenjena del
    // portafolio, una pausa clara que sigue siendo color y no blanco.
    <section id="nosotros" className="bg-[#DDD0F6] px-5 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionOpener
          title={
            <>
              Así es como
              <br />
              trabaja bicho
            </>
          }
          grande
        />

        <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8 lg:gap-12">
          {POINTS.map(({ title, body }, i) => (
            <Reveal key={title} delay={i * 110} variant="pegar">
              <article className="border-t-[3px] border-[#140F2E] pt-6">
                <h3 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-[#140F2E]">
                  {title}
                </h3>
                <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-[#14092E]/80">
                  {body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
