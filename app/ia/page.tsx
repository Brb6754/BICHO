import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import { CentralLogo } from '@/components/central/CentralLogo';
import { SubscribeBox } from '@/components/ia/SubscribeBox';
import { POSTS } from '@/components/ia/posts';
import { HeroThread, PostScene } from '@/components/ia/Scenes';
import { Masthead, NotiLockup, Highlight } from '@/components/ia/Masthead';
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
// Reestilizada el 2026-10-02 con el lenguaje de las piezas de Instagram:
// papel crema, tinta berenjena, titular en didona, grotesca pesada para
// el subtítulo y las etiquetas, resaltadores de lima y lavanda, y la
// retícula de reglas finas con la sección a la izquierda y la fecha a la
// derecha.
//
// El violeta eléctrico de la plataforma salió de esta página. Es el
// color de bicho como estudio, y esto es NOTI: una publicación con su
// propia voz. Quien llega desde un post no debería sentir que cambió de
// medio al entrar.
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
  return (
    <div className="min-h-screen" style={{ backgroundColor: NOTI.paper, color: NOTI.ink }}>
      <main>
        {/* PORTADA. Campo violeta a sangre, como los posts de la
            campaña.

            La primera versión de esta página era crema de arriba abajo:
            correcta de composición y sin identidad — el feed abre con un
            bloque de color saturado y la página abría con un documento.
            El color es lo que hace que alguien que viene de un post
            reconozca dónde cayó antes de leer una palabra.

            El grano no es decoración: las piezas están hechas con papel
            recortado, y un campo plano sin textura se ve como un div. */}
        <section className="relative isolate overflow-hidden" style={{ backgroundColor: NOTI.violet }}>
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
                  <Highlight>El jueves, en tu correo</Highlight>
                  <p className="mt-3 text-[15px] leading-relaxed opacity-80">
                    Gratis, en español, cinco minutos. Te das de baja con un clic.
                  </p>
                </div>
                <SubscribeBox source="hero" tone="ink" />
              </div>
            </div>
          </div>
        </section>

        {/* EL CONTENIDO. La razón por la que alguien está en esta página. */}
        <section className="border-y" style={{ backgroundColor: NOTI.paperDeep, borderColor: RULE }}>
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <div
              className="flex items-baseline justify-between gap-4 border-b pb-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ borderColor: RULE }}
            >
              <span>Lo que llevamos escrito</span>
              <span className="opacity-55">{POSTS.length} entradas</span>
            </div>

            {/* Lista editorial, no rejilla de tarjetas: cada entrada es
                una fila con su ilustración al lado y una regla fina
                debajo. Las tarjetas con sombra venían del sistema de la
                plataforma; una publicación se compone con reglas. */}
            <ul>
              {POSTS.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/ia/${post.slug}`}
                    className="group grid gap-5 border-b py-7 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8"
                    style={{ borderColor: RULE }}
                  >
                    <div
                      className="aspect-[16/10] overflow-hidden"
                      style={{ backgroundColor: NOTI.lavenderSoft }}
                    >
                      <PostScene
                        scene={post.scene}
                        className="h-full w-full rounded-none transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        <span>{AREA_LABEL[post.area]}</span>
                        <span className="flex items-center gap-1 opacity-50">
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          {post.minutes} min
                        </span>
                      </div>

                      <h3 className="mt-2.5 font-[family-name:var(--font-noti)] text-[clamp(1.5rem,3.2vw,2.1rem)] font-bold leading-[1.1] tracking-[-0.02em] underline-offset-[6px] group-hover:underline">
                        {post.answer}
                      </h3>
                      <p className="mt-2 text-[14px] leading-snug opacity-55">{post.question}</p>
                      <p className="mt-3 max-w-xl text-[15px] leading-relaxed opacity-80">
                        {post.standfirst}
                      </p>

                      <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.14em]">
                        Leer
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* LA SUSCRIPCIÓN, EN LIMA. El segundo golpe de color de la
            página, y cae sobre la única cosa que la página pide.

            Lima y no otra banda oscura: en el feed el lima es el color
            de los posts que celebran algo ("QUE TE RESERVEN", "CONFIRMADO"),
            y aquí celebra lo mismo. Sobre este campo el texto es tinta
            —13:1—, que es la única forma en que este color se usa. */}
        <section className="relative isolate overflow-hidden" style={{ backgroundColor: NOTI.lime }}>
          <Grain id="grain-noti" opacity={0.2} />
          <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-20" style={{ color: NOTI.ink }}>
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
              <div>
                <NotiWordmark className="text-[clamp(2.6rem,7vw,4.2rem)]" />
                <h2 className="mt-5 font-[family-name:var(--font-noti)] text-[clamp(2rem,5vw,3.2rem)] font-black leading-[1.02] tracking-[-0.025em]">
                  El jueves, en tu correo.
                </h2>
                <p className="mt-5 max-w-lg text-[16px] leading-[1.7] opacity-80">
                  Las noticias de IA de la semana con un{' '}
                  <span className="px-1.5" style={{ backgroundColor: NOTI.ink, color: NOTI.lime }}>
                    ¿y a mí qué?
                  </span>{' '}
                  debajo de cada una: qué significa para un negocio como el tuyo. Gratis, en
                  español, y se lee en cinco minutos.
                </p>
              </div>
              <SubscribeBox source="banda-noti" />
            </div>
          </div>
        </section>

        {/* Y DESPUÉS LA OFERTA. Al final a propósito: quien llegó hasta
            aquí leyó algo útil, que es lo único que da derecho a decir
            "esto también lo construimos nosotros". */}
        <section className="relative isolate overflow-hidden" style={{ backgroundColor: NOTI.ink }}>
          <Grain id="grain-estudio" opacity={0.12} />
          <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-20" style={{ color: NOTI.paper }}>
            <div
              className="flex items-baseline justify-between gap-4 border-b pb-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ borderColor: 'rgba(251, 249, 245, 0.28)' }}
            >
              <span>Si prefieres que lo hagamos nosotros</span>
              <span className="opacity-55">bicho</span>
            </div>

            <p className="mt-8 max-w-xl text-[16px] leading-[1.7] opacity-80">
              Todo lo que está aquí arriba lo aprendimos construyéndolo para negocios reales. Si lo
              tuyo es atender tu negocio y no configurar herramientas, nosotros lo armamos.
            </p>

            <ul className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {SERVICES.map((service) => (
                <li
                  key={service.id}
                  className="border-t pt-4"
                  style={{ borderColor: 'rgba(251, 249, 245, 0.2)' }}
                >
                  <h3 className="font-[family-name:var(--font-ia)] text-[17px] font-bold leading-snug">
                    {service.name}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed opacity-70">{service.proof}</p>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-[14px] font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-85"
                style={{ backgroundColor: NOTI.lime, color: NOTI.ink }}
              >
                Cuéntanos qué necesitas
              </Link>
              <Link
                href="/#portafolio"
                className="inline-flex items-center gap-1.5 border px-6 py-3.5 text-[14px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-white/10"
                style={{ borderColor: 'rgba(251, 249, 245, 0.3)' }}
              >
                Ver lo que hemos hecho
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
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
