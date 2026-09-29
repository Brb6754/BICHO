import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { CentralLogo } from '@/components/central/CentralLogo';
import { CentralFooter } from '@/components/central/CentralFooter';
import { SubscribeBox } from '@/components/ia/SubscribeBox';
import { POSTS } from '@/components/ia/posts';
import { HeroThread, PostScene } from '@/components/ia/Scenes';
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

// THE CAMPAIGN LANDING — where Bruno's posts about using AI in a small
// business send their traffic.
//
// It is deliberately NOT a third variation of bicho central. That page is
// dark because it is a portfolio: screenshots need a dark room to sit in,
// and its job is to be looked at. This page's job is to be READ, so the
// ground flips to paper and the type gets a real measure. The violet
// stays, and it is the only accent on the page — same brand, different
// room.
//
// Order of the page follows what the visitor does, not what we want:
// they arrived from a post, so the writing comes FIRST and the subscribe
// box sits inside the hero where it costs nothing to ignore. The pitch
// for bicho's services is last, after the page has earned it. A visitor
// who never scrolls that far read five useful things and left — that is
// a good outcome, not a failed conversion.
//
// What is deliberately absent: an exit-intent popup, a scroll-triggered
// modal, a countdown, a fake subscriber count. The premise of the page is
// that the writing earns the address.

const AREA_LABEL: Record<string, string> = {
  operación: 'Operación',
  ventas: 'Ventas',
  marketing: 'Marketing',
  datos: 'Datos',
};

export default function IaCampaignPage() {
  return (
    <div className="min-h-screen bg-[#F3F3F8] text-[#141024]">
      {/* A campaign landing gets a deliberately thin header: the visitor
          arrived to read one thing, and a full navigation is five ways to
          leave before they start. One way back to the studio, no more. */}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF]">
          <CentralLogo className="h-6" tone="ink" />
          <span className="sr-only">bicho — inicio</span>
        </Link>
        <Link
          href="/#servicios"
          className="rounded-full px-3 py-1.5 text-sm font-medium text-[#141024]/60 transition-colors hover:bg-[#141024]/[0.05] hover:text-[#141024] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF]"
        >
          Qué hacemos
        </Link>
      </header>

      <main>
        {/* HERO — opens with the format of the series itself, not with a
            promise about it. The most characteristic thing in this
            subject's world is the question a business owner actually
            asks, so the page opens with one and answers it. */}
        {/* Two columns from lg, and the picture is not an illustration
            OF the headline — it is the headline's evidence. The sentence
            says "la pregunta que te hacen diez veces al día"; the thread
            beside it is that Tuesday. On a phone the type comes first and
            the thread follows, because the headline still has to be the
            first thing read. */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:pb-20 sm:pt-12">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
            <div>
              <p className="font-[family-name:var(--font-ia)] text-[clamp(1.7rem,4.4vw,2.5rem)] font-medium leading-[1.15] tracking-[-0.02em] text-[#141024]/45">
                ¿Por dónde empiezo con la inteligencia artificial en mi negocio?
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-ia)] text-[clamp(2.1rem,5.4vw,3.2rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[#141024]">
                Por la pregunta que te hacen{' '}
                <span className="text-[#3B00FF]">diez veces al día</span>.
              </h1>

              <p className="mt-6 max-w-xl text-[17px] leading-[1.7] text-[#141024]/70">
                Cada semana contamos una cosa que de verdad funcionó —y una que no— con el
                problema, lo que hicimos y lo que costó. Sin tecnicismos y sin humo.
              </p>

              <div className="mt-8 max-w-xl">
                <SubscribeBox source="hero" />
              </div>
            </div>

            <HeroThread />
          </div>
        </section>

        {/* THE CONTENT. The reason someone is on this page. */}
        <section className="border-t border-[#141024]/10 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <h2 className="font-[family-name:var(--font-ia)] text-[clamp(1.5rem,3.4vw,2rem)] font-bold leading-tight tracking-[-0.02em]">
              Lo que llevamos escrito
            </h2>
            <p className="mt-2 text-[15px] text-[#141024]/60">
              Cada entrada responde una pregunta y dice dónde el consejo deja de servir.
            </p>

            {/* Cards, and each one earns the format by carrying its own
                drawing. As a bare text list this section was five
                paragraphs stacked — nothing for the eye to land on, and
                on a phone you could not tell one entry from the next
                while scrolling. The scene is what makes them scannable;
                without it a grid would just be a list in boxes. */}
            <ul className="mt-10 grid gap-5 sm:grid-cols-2">
              {POSTS.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/ia/${post.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl bg-[#F7F7FB] ring-1 ring-[#141024]/[0.07] transition-shadow duration-300 hover:shadow-[0_2px_4px_rgba(20,16,36,0.04),0_20px_44px_-24px_rgba(20,16,36,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF]"
                  >
                    <PostScene
                      scene={post.scene}
                      className="aspect-[16/10] rounded-none transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />

                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                        <span className="font-medium text-[#3B00FF]">{AREA_LABEL[post.area]}</span>
                        <span className="flex items-center gap-1 text-[#141024]/45">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {post.minutes} min
                        </span>
                      </div>

                      <p className="mt-3 text-[14px] leading-snug text-[#141024]/55">
                        {post.question}
                      </p>
                      <h3 className="mt-1 font-[family-name:var(--font-ia)] text-[1.2rem] font-bold leading-[1.25] tracking-[-0.02em] text-[#141024] underline-offset-[6px] group-hover:underline">
                        {post.answer}
                      </h3>
                      <p className="mt-2.5 text-[14px] leading-relaxed text-[#141024]/65">
                        {post.standfirst}
                      </p>

                      <span className="mt-auto flex items-center gap-1.5 pt-5 text-[14px] font-semibold text-[#3B00FF]">
                        Leer
                        <ArrowUpRight
                          className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
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

        {/* THE NEWSLETTER. One dark band on a paper page — the single
            place the page raises its voice, and it lands on the one ask
            it makes. */}
        <section className="bg-[#141024] text-white">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <h2 className="font-[family-name:var(--font-ia)] text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-[1.15] tracking-[-0.02em]">
              El jueves, en tu correo
            </h2>
            <p className="mt-4 max-w-xl text-[16px] leading-[1.7] text-white/70">
              Se llama NOTI. Son las noticias de IA de la semana con un{' '}
              <span className="text-white">«¿y a mí qué?»</span> debajo de cada una: qué
              significa para un negocio como el tuyo. Gratis, en español, y se lee en cinco
              minutos.
            </p>
            <div className="mt-8 max-w-xl">
              <SubscribeBox source="banda-noti" tone="ink" />
            </div>
          </div>
        </section>

        {/* AND THEN THE PITCH. Last on purpose: a reader who got this far
            has read something useful, which is the only thing that earns
            the right to say "we also build this". */}
        <section className="border-t border-[#141024]/10 bg-[#F3F3F8]">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <h2 className="font-[family-name:var(--font-ia)] text-[clamp(1.5rem,3.4vw,2rem)] font-bold leading-tight tracking-[-0.02em]">
              Y si prefieres que lo hagamos nosotros
            </h2>
            <p className="mt-3 max-w-xl text-[16px] leading-[1.7] text-[#141024]/70">
              Todo lo que está aquí arriba lo aprendimos construyéndolo para negocios
              reales. Si lo tuyo es atender tu negocio y no configurar herramientas,
              nosotros lo armamos.
            </p>

            <ul className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {SERVICES.map((service) => (
                <li key={service.id}>
                  <h3 className="font-[family-name:var(--font-ia)] text-[17px] font-bold leading-snug">
                    {service.name}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[#141024]/65">
                    {service.proof}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-full bg-[#3B00FF] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#5B2BFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF] focus-visible:ring-offset-2"
              >
                Cuéntanos qué necesitas
              </Link>
              <Link
                href="/#portafolio"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#141024]/15 px-6 py-3 text-[15px] font-medium text-[#141024]/75 transition-colors hover:bg-[#141024]/[0.04] hover:text-[#141024] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF]"
              >
                Ver lo que hemos hecho
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <CentralFooter />
    </div>
  );
}
