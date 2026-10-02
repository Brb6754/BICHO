import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import { CentralLogo } from '@/components/central/CentralLogo';
import { SubscribeBox } from '@/components/ia/SubscribeBox';
import { POSTS } from '@/components/ia/posts';
import { HeroThread, PostScene } from '@/components/ia/Scenes';
import { Masthead, NotiLockup } from '@/components/ia/Masthead';
import { Grain, NotiWordmark } from '@/components/ia/Texture';
import { NOTI, RULE } from '@/components/ia/tokens';
import { SERVICES } from '@/components/central/services';

export const metadata: Metadata = {
  title: 'IA para tu negocio — bicho',
  description:
    'Cómo usar inteligencia artificial en tu negocio, explicado sin tecnicismos: qué sirve, qué no, y por dónde empezar. Un caso real por entrega.',
  openGraph: {
    title: 'IA para tu negocio — bicho',
    description:
      'Qué sirve, qué no, y por dónde empezar. Sin tecnicismos y con el caso de un negocio real en cada entrega.',
    type: 'website',
  },
};

// LA LANDING DE LA CAMPAÑA — a donde mandan los posts.
//
// UN SOLO CAMPO DE COLOR, y es la portada. Esta página pasó por los dos
// extremos el mismo día: primero crema de arriba abajo (correcta y sin
// identidad), después cuatro planchas saturadas seguidas —violeta,
// crema, lima, tinta—, que es de donde sale la nota de Bruno: "le sobra
// color y le falta diseño". Tenía razón, y la causa es la misma en los
// dos extremos: cuando cada sección es un campo de color, el color deja
// de significar nada y no queda composición debajo que sostenga la
// página.
//
// Así que el violeta se gasta UNA vez, en la apertura, y de ahí en
// adelante el trabajo lo hace la estructura: una entrada principal
// grande contra cuatro en dos columnas, una sola medida, reglas finas, y
// el lima reducido a dos apariciones del tamaño que les toca — una
// palabra del titular y el trazo del logotipo.
//
// Lo que NO cambió es el orden, que sigue el del lector y no el nuestro:
// el contenido primero, el formulario dentro de la portada donde no
// cuesta nada ignorarlo, y la oferta de servicios al final, cuando la
// página ya se la ganó. Sigue sin haber popup de salida, modal por
// scroll ni contador de suscriptores inventado.

const AREA_LABEL: Record<string, string> = {
  operación: 'Operación',
  ventas: 'Ventas',
  marketing: 'Marketing',
  datos: 'Datos',
};

export default function IaCampaignPage() {
  // La jerarquía del índice se decide aquí, no en el CSS: la primera
  // entrada ocupa el ancho y las otras cuatro van en dos columnas.
  const [lead, ...rest] = POSTS;

  return (
    <div className="min-h-screen" style={{ backgroundColor: NOTI.paper, color: NOTI.ink }}>
      <main>
        {/* PORTADA. El único campo de color de la página.

            El grano no es decoración: las piezas de la campaña están
            hechas con papel recortado y fotografiado, y un campo plano
            sin textura se ve como un div. */}
        <section
          className="relative isolate overflow-hidden"
          style={{ backgroundColor: NOTI.violet }}
        >
          <Grain id="grain-portada" />

          <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-6 sm:pb-20 sm:pt-8">
            <Masthead section="IA para tu negocio" meta="Cada jueves" tone="paper" />

            <div
              className="mt-12 grid items-end gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14"
              style={{ color: NOTI.paper }}
            >
              <div>
                <h1 className="font-[family-name:var(--font-noti)] text-[clamp(2.6rem,7.2vw,4.6rem)] font-black leading-[0.95] tracking-[-0.025em]">
                  Por la pregunta que te hacen{' '}
                  {/* El lima funciona aquí y solo aquí: sobre este
                      violeta da 5.3:1, sobre el papel crema 1.3:1. La
                      misma asimetría que gobierna el lima en toda la
                      marca. */}
                  <span style={{ color: NOTI.lime }}>diez veces al día</span>.
                </h1>

                <p className="mt-6 font-[family-name:var(--font-ia)] text-[clamp(1.25rem,3vw,1.9rem)] font-bold leading-tight tracking-[-0.02em]">
                  ¿Por dónde empiezo con la IA en mi negocio?
                </p>

                <p className="mt-5 max-w-xl text-[16px] leading-[1.7] opacity-80">
                  Cada semana contamos una cosa que de verdad funcionó —y una que no— con el
                  problema, lo que hicimos y lo que costó. Sin tecnicismos y sin humo.
                </p>
              </div>

              <HeroThread />
            </div>

            <div
              className="mt-12 border-t pt-8 sm:mt-14"
              style={{ borderColor: 'rgba(251, 249, 245, 0.28)', color: NOTI.paper }}
            >
              <div className="grid gap-6 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] sm:items-center sm:gap-10">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                    El jueves, en tu correo
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed opacity-80">
                    Gratis, en español, cinco minutos. Te das de baja con un clic.
                  </p>
                </div>
                <SubscribeBox source="hero" tone="ink" />
              </div>
            </div>
          </div>
        </section>

        {/* EL CONTENIDO — la razón por la que alguien está en esta
            página, y donde vive el diseño ahora.

            Una entrada principal grande contra cuatro en columnas. Un
            índice donde las cinco pesan igual no es un índice: es un
            archivo, y deja al lector eligiendo sin ninguna pista. La
            jerarquía la hace el TAMAÑO, que es justo lo que el color
            estaba tapando.

            Y no van numeradas: estos cinco textos se leen en cualquier
            orden, así que un 01/02/03 afirmaría una secuencia que no
            existe. */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <div
            className="flex items-baseline justify-between gap-4 border-b pb-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ borderColor: RULE }}
          >
            <span>Lo que llevamos escrito</span>
            <span className="opacity-55">{POSTS.length} entradas</span>
          </div>

          <Link
            href={`/ia/${lead.slug}`}
            className="group mt-10 grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-14"
          >
            <div className="overflow-hidden" style={{ backgroundColor: NOTI.lavenderSoft }}>
              <PostScene
                scene={lead.scene}
                className="aspect-[16/10] w-full rounded-none transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <span>{AREA_LABEL[lead.area]}</span>
                <span className="flex items-center gap-1 opacity-50">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  {lead.minutes} min
                </span>
              </div>

              <h3 className="mt-4 font-[family-name:var(--font-noti)] text-[clamp(2rem,4.6vw,3.1rem)] font-bold leading-[1.04] tracking-[-0.025em] underline-offset-[8px] group-hover:underline">
                {lead.answer}
              </h3>
              <p className="mt-3 text-[15px] leading-snug opacity-55">{lead.question}</p>
              <p className="mt-4 max-w-md text-[16px] leading-[1.7] opacity-80">{lead.standfirst}</p>

              <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.14em]">
                Leer
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>

          {/* Las demás, sin ilustración: a este tamaño el dibujo se
              vuelve un sello decorativo, y lo que de verdad ayuda a
              elegir es la pregunta. */}
          <ul className="mt-14 grid gap-x-14 sm:grid-cols-2">
            {rest.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/ia/${post.slug}`}
                  className="group block border-t py-7"
                  style={{ borderColor: RULE }}
                >
                  <div className="flex flex-wrap items-center gap-x-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    <span>{AREA_LABEL[post.area]}</span>
                    <span className="flex items-center gap-1 opacity-50">
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      {post.minutes} min
                    </span>
                  </div>

                  <h3 className="mt-3 font-[family-name:var(--font-noti)] text-[clamp(1.35rem,2.4vw,1.7rem)] font-bold leading-[1.15] tracking-[-0.02em] underline-offset-[6px] group-hover:underline">
                    {post.answer}
                  </h3>
                  <p className="mt-2 text-[14px] leading-snug opacity-55">{post.question}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* LA SUSCRIPCIÓN. También en papel: el color ya lo gastó la
            portada, y una segunda plancha saturada no añade jerarquía,
            la reparte. Lo que distingue a esta banda es la escala
            tipográfica y el trazo de lima del logotipo — el mismo
            recurso de las piezas, del tamaño que le toca. */}
        <section className="border-y" style={{ backgroundColor: NOTI.paperDeep, borderColor: RULE }}>
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-end lg:gap-20">
              <div>
                <NotiWordmark className="text-[clamp(2.2rem,5.5vw,3.4rem)]" />
                <h2 className="mt-6 font-[family-name:var(--font-noti)] text-[clamp(1.9rem,4.6vw,3rem)] font-black leading-[1.02] tracking-[-0.025em]">
                  El jueves, en tu correo.
                </h2>
                <p className="mt-5 max-w-md text-[16px] leading-[1.7] opacity-75">
                  Las noticias de IA de la semana con un «¿y a mí qué?» debajo de cada una: qué
                  significa para un negocio como el tuyo. Gratis, en español, cinco minutos.
                </p>
              </div>

              <div>
                <SubscribeBox source="banda-noti" />
                <p className="mt-3 text-[13px] opacity-55">
                  Te das de baja con un clic. No compartimos tu correo con nadie.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Y DESPUÉS LA OFERTA. Al final a propósito: quien llegó hasta
            aquí leyó algo útil, que es lo único que da derecho a decir
            "esto también lo construimos nosotros". */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-20">
            <div>
              <div
                className="border-b pb-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ borderColor: RULE }}
              >
                Si prefieres que lo hagamos nosotros
              </div>
              <p className="mt-6 text-[16px] leading-[1.7] opacity-80">
                Todo lo que está aquí arriba lo aprendimos construyéndolo para negocios reales. Si
                lo tuyo es atender tu negocio y no configurar herramientas, nosotros lo armamos.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-85"
                  style={{ backgroundColor: NOTI.ink, color: NOTI.paper }}
                >
                  Cuéntanos qué necesitas
                </Link>
                <Link
                  href="/#portafolio"
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.14em] underline-offset-[6px] hover:underline"
                >
                  Ver lo que hemos hecho
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <ul className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {SERVICES.map((service) => (
                <li key={service.id} className="border-t pt-4" style={{ borderColor: RULE }}>
                  <h3 className="font-[family-name:var(--font-ia)] text-[16px] font-bold leading-snug">
                    {service.name}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed opacity-70">{service.proof}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: RULE }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6 px-6 py-8">
          <NotiLockup />
          <Link
            href="/"
            className="flex items-center gap-2 text-[13px] opacity-60 transition-opacity hover:opacity-100"
          >
            <CentralLogo className="h-4" tone="ink" />
            bichomx.com
          </Link>
        </div>
      </footer>
    </div>
  );
}
