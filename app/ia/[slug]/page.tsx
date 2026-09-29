import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { CentralLogo } from '@/components/central/CentralLogo';
import { CentralFooter } from '@/components/central/CentralFooter';
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

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();

  // "What to read next" is the post after this one, wrapping around at
  // the end. A reader who finished one is the likeliest person on the
  // site to read another, and an article that ends in nothing sends them
  // back to wherever they came from.
  const index = POSTS.findIndex((p) => p.slug === post.slug);
  const next = POSTS[(index + 1) % POSTS.length];

  return (
    <div className="min-h-screen bg-[#F3F3F8] text-[#141024]">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Link href="/ia" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF]">
          <CentralLogo className="h-6" tone="ink" />
          <span className="sr-only">bicho — todas las entradas</span>
        </Link>
        <Link
          href="/ia"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#141024]/60 transition-colors hover:bg-[#141024]/[0.05] hover:text-[#141024] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Todas
        </Link>
      </header>

      <main>
        {/* max-w-2xl and not 3xl: this is running prose, and the measure
            lands near 70 characters, which is where a line stops being
            tiring to read. The index page is wider because it is a list,
            not a text. */}
        <article className="mx-auto max-w-2xl px-6 pb-16 pt-6 sm:pt-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            <span className="font-medium uppercase tracking-wide text-[#3B00FF]">
              {post.area}
            </span>
            <span className="flex items-center gap-1 text-[#141024]/45">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {post.minutes} min
            </span>
          </div>

          {/* The question is the h1 — it is the real title of the piece,
              and the answer reads as its resolution right underneath. */}
          <h1 className="mt-4 font-[family-name:var(--font-ia)] text-[clamp(1.9rem,5vw,2.8rem)] font-bold leading-[1.12] tracking-[-0.03em]">
            {post.question}
          </h1>
          <p className="mt-3 font-[family-name:var(--font-ia)] text-[clamp(1.15rem,2.8vw,1.5rem)] font-medium leading-snug text-[#3B00FF]">
            {post.answer}
          </p>
          <p className="mt-5 border-l-2 border-[#141024]/15 pl-4 text-[17px] leading-[1.7] text-[#141024]/70">
            {post.standfirst}
          </p>

          {/* The same scene the reader just clicked on the index. It is
              continuity, not decoration: landing on the drawing you
              tapped confirms you opened the right thing. */}
          <PostScene scene={post.scene} className="mt-8 aspect-[16/9] sm:aspect-[2/1]" />

          <div className="mt-10 flex flex-col gap-6">
            {post.body.map((block, i) => {
              if (block.kind === 'p') {
                return (
                  <p key={i} className="text-[17px] leading-[1.75] text-[#141024]/85">
                    {block.text}
                  </p>
                );
              }

              if (block.kind === 'steps') {
                // Numbered because these ARE a sequence — you do them in
                // this order. The index page's list is not numbered for
                // exactly the same reason inverted: those posts can be
                // read in any order.
                return (
                  <ol key={i} className="flex flex-col gap-4">
                    {block.items.map((item, j) => (
                      <li key={j} className="flex gap-4">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3B00FF]/10 text-[13px] font-bold tabular-nums text-[#3B00FF]"
                        >
                          {j + 1}
                        </span>
                        <span className="text-[17px] leading-[1.7] text-[#141024]/85">{item}</span>
                      </li>
                    ))}
                  </ol>
                );
              }

              // The honest caveat. It gets the page's only filled box
              // because it is the thing that separates this series from
              // the ones selling a course.
              return (
                <aside key={i} className="rounded-2xl bg-[#141024] px-6 py-5 text-white">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-white/55">
                    {block.title}
                  </p>
                  <p className="mt-2 text-[16px] leading-[1.7] text-white/90">{block.text}</p>
                </aside>
              );
            })}
          </div>
        </article>

        <section className="border-t border-[#141024]/10 bg-white">
          <div className="mx-auto max-w-2xl px-6 py-14">
            <p className="font-[family-name:var(--font-ia)] text-[clamp(1.3rem,3vw,1.7rem)] font-bold leading-tight tracking-[-0.02em]">
              Una de estas cada jueves
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-[#141024]/65">
              Gratis, en español, cinco minutos. Te puedes dar de baja con un clic.
            </p>
            <div className="mt-6">
              <SubscribeBox source={`post:${post.slug}`} />
            </div>
          </div>
        </section>

        <section className="bg-[#F3F3F8]">
          <div className="mx-auto max-w-2xl px-6 py-14">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-[#141024]/45">
              Sigue con esta
            </p>
            <Link
              href={`/ia/${next.slug}`}
              className="group mt-3 flex flex-col gap-4 rounded-3xl bg-white p-4 ring-1 ring-[#141024]/[0.07] transition-shadow hover:shadow-[0_2px_4px_rgba(20,16,36,0.04),0_18px_40px_-24px_rgba(20,16,36,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF] sm:flex-row sm:items-center"
            >
              <PostScene scene={next.scene} className="aspect-[16/10] w-full shrink-0 sm:w-44" />
              <div className="min-w-0">
                <p className="text-[15px] text-[#141024]/55">{next.question}</p>
                <p className="mt-1 font-[family-name:var(--font-ia)] text-[clamp(1.15rem,2.6vw,1.4rem)] font-bold leading-snug tracking-[-0.02em] underline-offset-[6px] group-hover:underline">
                  {next.answer}
                </p>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <CentralFooter />
    </div>
  );
}
