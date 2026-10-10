import { UserCheck, Wrench, MapPin } from 'lucide-react';
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
const POINTS = [
  {
    Icon: UserCheck,
    title: 'Hablas con quien programa',
    body: 'Sin intermediarios. La persona que te contesta es la que escribe el código.',
  },
  {
    Icon: Wrench,
    title: 'Construimos con lo que usamos',
    body: 'La plataforma no es una demo: es nuestro propio producto en producción. Lo que te entregamos ya pasó por ahí.',
  },
  {
    Icon: MapPin,
    title: 'Desde Durango, para negocios reales',
    body: 'Negocios de servicios, no corporativos. El objetivo es que dejes de operar a mano, no venderte funciones que nadie pidió.',
  },
];

export function WhySection() {
  return (
    <section id="nosotros" className="bg-[#F5F3FC] px-5 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionOpener
          eyebrow="Cómo trabajamos"
          title={
            <>
              Así es como
              <br />
              trabaja bicho
            </>
          }
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {POINTS.map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 90}>
              <article className="h-full rounded-3xl bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5B34E8]/15 text-[#5B34E8]">
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[16px] font-bold text-[#140F2E]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#6A6488]">{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
