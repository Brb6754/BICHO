import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import { GIROS, giroPorSlug } from '@/lib/seo/giros';
import { funcionPorSlug } from '@/lib/seo/funciones';
import { guiaPorSlug } from '@/lib/seo/guias';
import { ldFaq, ldMigas, ldSoftware, metaPagina, urlDemo } from '@/lib/seo/sitio';
import { Cabecera, Cierre, DemoTarjeta, FaqLista, JsonLd, Marco, Prosa, Relacionados } from '@/components/marketing/seo/Piezas';
import { PricingSection } from '@/components/marketing/PricingSection';

type Params = Promise<{ giro: string }>;

export const dynamicParams = false;
export function generateStaticParams() {
  return GIROS.map((g) => ({ giro: g.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const g = giroPorSlug((await params).giro);
  if (!g) return {};
  return { ...metaPagina({ titulo: g.titulo, descripcion: g.descripcion, path: `/para/${g.slug}` }), keywords: [g.keyword] };
}

export default async function GiroPage({ params }: { params: Params }) {
  const g = giroPorSlug((await params).giro);
  if (!g) notFound();

  const otrosGiros = GIROS.filter((o) => o.slug !== g.slug);
  const enlaces = [
    ...g.funciones.map((s) => funcionPorSlug(s)).filter((f) => f !== undefined).map((f) => ({ href: `/funciones/${f.slug}`, nombre: f.nombre, texto: f.bajada.split('. ')[0] + '.' })),
    ...g.guias.map((s) => guiaPorSlug(s)).filter((x) => x !== undefined).map((x) => ({ href: `/guias/${x.slug}`, nombre: `Guía: ${x.nombre}`, texto: x.texto })),
  ];

  return (
    <Marco>
      <JsonLd
        data={[
          ldSoftware(g.descripcion),
          ldFaq(g.faqs),
          ldMigas([
            { nombre: 'Inicio', path: '/' },
            { nombre: `Para ${g.nombre}`, path: `/para/${g.slug}` },
          ]),
        ]}
      />
      <Cabecera
        migas={[{ nombre: 'Inicio', href: '/' }, { nombre: `Para ${g.nombre}`, href: `/para/${g.slug}` }]}
        eyebrow={`Para ${g.nombre}`}
        titulo={g.h1}
        bajada={g.bajada}
        secundario={{ href: urlDemo(g.demo.slug), label: 'Ve un demo real' }}
      >
        <DemoTarjeta demo={g.demo} href={urlDemo(g.demo.slug)} panelHref={urlDemo(g.demo.slug, '/panel')} />
      </Cabecera>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="dolor">
        <div className="mx-auto max-w-6xl">
          <h2 id="dolor" className="max-w-3xl font-[family-name:var(--font-display)] text-[clamp(1.8rem,4.4vw,2.8rem)] font-extrabold uppercase leading-[0.95] text-[#140F2E]">
            Si tienes uno de estos días, te entendemos
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {g.dolores.map((d) => (
              <li key={d.titulo} className="rounded-[24px] bg-[#F5F3FC] p-6">
                <h3 className="text-lg font-semibold leading-snug text-[#140F2E]">{d.titulo}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4A4370]">{d.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#1B1040] px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="solucion">
        <div className="mx-auto max-w-6xl">
          <h2 id="solucion" className="max-w-3xl font-[family-name:var(--font-display)] text-[clamp(1.8rem,4.4vw,2.8rem)] font-extrabold uppercase leading-[0.95] text-white">
            Cómo lo resuelve bicho
          </h2>
          <ul className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {g.solucion.map((s) => (
              <li key={s.titulo} className="flex gap-4">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4F23A]" aria-hidden="true">
                  <Check className="h-4 w-4 text-[#140F2E]" strokeWidth={3} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{s.titulo}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#B9B1E6]">{s.texto}</p>
                  {s.funcion && (
                    <Link href={`/funciones/${s.funcion}`} className="mt-2 inline-block text-sm font-semibold text-[#D4F23A] underline-offset-2 hover:underline">
                      Ver cómo funciona
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <Prosa>
          <h2>{g.detalle.titulo}</h2>
          {g.detalle.parrafos.map((p) => (
            <p key={p.slice(0, 30)}>{p}</p>
          ))}
        </Prosa>
      </section>

      <PricingSection />
      <FaqLista faqs={g.faqs} titulo={`Preguntas de ${g.nombre}`} />
      <Relacionados titulo="Te puede servir" enlaces={enlaces} />
      <Relacionados
        titulo="bicho para otros giros"
        enlaces={otrosGiros.map((o) => ({ href: `/para/${o.slug}`, nombre: `Para ${o.nombre}`, texto: o.dolores[0].titulo + '.' }))}
      />
      <section className="bg-[#F5F3FC] px-4 pb-14 text-center text-sm sm:px-6">
        <Link href="/negocios" className="font-semibold text-[#5B34E8] underline-offset-2 hover:underline">
          Explorar el directorio de negocios con reserva en línea
        </Link>
      </section>
      <Cierre
        titulo={<>Tu agenda, lista hoy</>}
        texto={`Das de alta tus servicios y tu horario desde el celular en unos 10 minutos. 15 días gratis, sin tarjeta, y si no te convence cancelas con un mensaje.`}
      />
    </Marco>
  );
}
