import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Masthead, NotiLockup, Highlight } from '@/components/ia/Masthead';
import { NOTI, RULE } from '@/components/ia/tokens';
import { SubscribeBox } from '@/components/ia/SubscribeBox';
import { POSTS, postBySlug } from '@/components/ia/posts';
import { PostScene } from '@/components/ia/Scenes';

// Each post gets its own URL because that is what a link in an Instagram
// caption or a LinkedIn post needs to point at. Sending every post to
// /ia and hoping the reader scrolls to the right one is how a campaign
// loses the traffic it paid for.
export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return { title: 'No encontramos esa entrada — bicho' };

  return {
    // The QUESTION is the title, not the answer: it is what someone types
    // into Google, word for word.
    title: `${post.question} — bicho`,
    description: post.standfirst,
    openGraph: {
      title: post.question,
      description: post.standfirst,
      type: 'article',
    },
  };
}

// La sección que encabeza cada pieza, igual que en los posts: "NOTI /
// QUÉ PASÓ", "NOTI / A LA CHAMBA". El área del post es la que la decide,
// así que una entrada nueva la hereda sin tocar este archivo.
const AREA_SECTION: Record<string, string> = {
  operación: 'A la chamba',
  ventas: 'A la chamba',
  marketing: 'Qué pasó',
  datos: 'Sin humo',
};

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();

  // "Qué leer después" es el siguiente post, dando la vuelta al final.
  // Quien terminó uno es la persona del sitio con más probabilidad de
  // leer otro, y un artículo que termina en nada lo devuelve a donde
  // venía.
  const index = POSTS.findIndex((p) => p.slug === post.slug);
  const next = POSTS[(index + 1) % POSTS.length];

  return (
    <div className="min-h-screen" style={{ backgroundColor: NOTI.paper, color: NOTI.ink }}>
      <div className="mx-auto max-w-3xl px-6 pt-6 sm:pt-8">
        <Masthead section={AREA_SECTION[post.area]} meta={`${post.minutes} min de lectura`} />
      </div>

      <main>
        {/* La medida es max-w-2xl y no 3xl: esto es prosa corrida y la
            línea cae cerca de 70 caracteres, que es donde deja de cansar.
            El índice es más ancho porque es una lista, no un texto. */}
        <article className="mx-auto max-w-2xl px-6 pb-16 pt-8 sm:pt-12">
          {/* La pregunta es el h1 — es el título real de la pieza, en la
              didona de los posts, y la respuesta se lee como su
              resolución justo debajo, en la grotesca pesada. Esa tensión
              entre las dos caras es la identidad de NOTI; con una sola
              se deshace. */}
          <h1 className="font-[family-name:var(--font-noti)] text-[clamp(2.2rem,6.4vw,3.6rem)] font-black leading-[0.98] tracking-[-0.025em]">
            {post.question}
          </h1>
          <p className="mt-5 font-[family-name:var(--font-ia)] text-[clamp(1.2rem,3vw,1.7rem)] font-bold leading-tight tracking-[-0.02em]">
            {post.answer}
          </p>
          <p className="mt-5 text-[17px] leading-[1.7] opacity-70">{post.standfirst}</p>

          {/* La misma ilustración que el lector tocó en el índice. Es
              continuidad, no adorno: aterrizar en el dibujo que tocaste
              confirma que abriste lo que querías. */}
          <div
            className="mt-9 aspect-[16/9] overflow-hidden sm:aspect-[2/1]"
            style={{ backgroundColor: NOTI.lavenderSoft }}
          >
            <PostScene scene={post.scene} className="h-full w-full rounded-none" />
          </div>

          <div className="mt-10 flex flex-col gap-6">
            {post.body.map((block, i) => {
              if (block.kind === 'p') {
                return (
                  <p key={i} className="text-[17px] leading-[1.75]">
                    {block.text}
                  </p>
                );
              }

              if (block.kind === 'steps') {
                // Numerados porque esto SÍ es una secuencia: se hacen en
                // este orden. La lista del índice no lo está por la razón
                // inversa — esos posts se leen en cualquier orden.
                return (
                  <ol key={i} className="flex flex-col gap-4 border-y py-7" style={{ borderColor: RULE }}>
                    {block.items.map((item, j) => (
                      <li key={j} className="flex gap-4">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-[13px] font-bold tabular-nums"
                          style={{ backgroundColor: NOTI.lavender, color: NOTI.ink }}
                        >
                          {j + 1}
                        </span>
                        <span className="text-[17px] leading-[1.7]">{item}</span>
                      </li>
                    ))}
                  </ol>
                );
              }

              // La advertencia honesta. Es el único bloque con fondo
              // lleno en toda la pieza, porque es lo que separa a esta
              // serie de las que están vendiendo un curso.
              return (
                <aside key={i} className="px-6 py-6" style={{ backgroundColor: NOTI.ink, color: NOTI.paper }}>
                  <Highlight tone="lime">{block.title}</Highlight>
                  <p className="mt-3 text-[16px] leading-[1.7] opacity-90">{block.text}</p>
                </aside>
              );
            })}
          </div>
        </article>

        <section className="border-y" style={{ backgroundColor: NOTI.paperDeep, borderColor: RULE }}>
          <div className="mx-auto max-w-2xl px-6 py-14">
            <Highlight>Una de estas cada jueves</Highlight>
            <p className="mt-4 text-[15px] leading-relaxed opacity-70">
              Gratis, en español, cinco minutos. Te puedes dar de baja con un clic.
            </p>
            <div className="mt-6">
              <SubscribeBox source={`post:${post.slug}`} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-6 py-14">
          <div
            className="border-b pb-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ borderColor: RULE }}
          >
            Sigue con esta
          </div>
          <Link href={`/ia/${next.slug}`} className="group mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              className="aspect-[16/10] w-full shrink-0 overflow-hidden sm:w-48"
              style={{ backgroundColor: NOTI.lavenderSoft }}
            >
              <PostScene scene={next.scene} className="h-full w-full rounded-none" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] opacity-55">{next.question}</p>
              <p className="mt-1.5 font-[family-name:var(--font-noti)] text-[clamp(1.3rem,3vw,1.8rem)] font-bold leading-[1.1] tracking-[-0.02em] underline-offset-[6px] group-hover:underline">
                {next.answer}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.14em]">
                Leer
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: RULE }}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-6 px-6 py-8">
          <NotiLockup />
          <Link href="/ia" className="text-[13px] font-semibold uppercase tracking-[0.14em] opacity-60 transition-opacity hover:opacity-100">
            Todas las entradas
          </Link>
        </div>
      </footer>
    </div>
  );
}
