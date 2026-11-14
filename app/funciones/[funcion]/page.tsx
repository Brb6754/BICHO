import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FUNCIONES, funcionPorSlug } from '@/lib/seo/funciones';
import { giroPorSlug } from '@/lib/seo/giros';
import { guiaPorSlug } from '@/lib/seo/guias';
import { PLANES, planMinimoPara } from '@/lib/billing/planes';
import { ldFaq, ldMigas, ldSoftware, metaPagina, urlDemo } from '@/lib/seo/sitio';
import { Cabecera, Cierre, Ejemplo, FaqLista, JsonLd, Marco, Relacionados } from '@/components/marketing/seo/Piezas';
import { EscenaFuncion } from '@/components/marketing/seo/Graficos';

type Params = Promise<{ funcion: string }>;

export const dynamicParams = false;
export function generateStaticParams() {
  return FUNCIONES.map((f) => ({ funcion: f.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const f = funcionPorSlug((await params).funcion);
  if (!f) return {};
  return { ...metaPagina({ titulo: f.titulo, descripcion: f.descripcion, path: `/funciones/${f.slug}` }), keywords: [f.keyword] };
}

export default async function FuncionPage({ params }: { params: Params }) {
  const f = funcionPorSlug((await params).funcion);
  if (!f) notFound();

  const plan = f.modulo ? PLANES[planMinimoPara(f.modulo)] : null;
  const enPlan = plan
    ? plan.nombre === 'Esencial'
      ? `Viene en todos los planes, desde Esencial ($${plan.precio} MXN al mes).`
      : `Viene en el plan ${plan.nombre} ($${plan.precio} MXN al mes)${plan.nombre === 'Negocio' ? ' y en Pro' : ''}.`
    : 'Viene en todos los planes, sin costo extra.';
  const demoHref = f.demo ? (f.demo.slug ? urlDemo(f.demo.slug, f.demo.path === '/' ? '' : f.demo.path) : f.demo.path) : null;

  const enlaces = [
    ...f.relacionadas.map((s) => funcionPorSlug(s)).filter((x) => x !== undefined).map((x) => ({ href: `/funciones/${x.slug}`, nombre: x.nombre, texto: x.descripcion.split('. ')[0] + '.' })),
    ...f.giros.map((s) => giroPorSlug(s)).filter((x) => x !== undefined).map((x) => ({ href: `/para/${x.slug}`, nombre: `Para ${x.nombre}`, texto: x.dolores[0].titulo + '.' })),
    ...f.guias.map((s) => guiaPorSlug(s)).filter((x) => x !== undefined).map((x) => ({ href: `/guias/${x.slug}`, nombre: `Guía: ${x.nombre}`, texto: x.texto })),
  ];

  return (
    <Marco>
      <JsonLd
        data={[
          ldSoftware(f.descripcion),
          ldFaq(f.faqs),
          ldMigas([
            { nombre: 'Inicio', path: '/' },
            { nombre: 'Funciones', path: '/funciones' },
            { nombre: f.nombre, path: `/funciones/${f.slug}` },
          ]),
        ]}
      />
      <Cabecera
        migas={[
          { nombre: 'Inicio', href: '/' },
          { nombre: 'Funciones', href: '/funciones' },
          { nombre: f.nombre, href: `/funciones/${f.slug}` },
        ]}
        eyebrow={f.nombre}
        titulo={f.h1}
        bajada={f.bajada}
        secundario={demoHref && f.demo ? { href: demoHref, label: f.demo.label } : undefined}
      >
        <EscenaFuncion slug={f.slug} captura={f.captura} />
      </Cabecera>

      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="beneficios">
        <div className="mx-auto max-w-6xl">
          <h2 id="beneficios" className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,4.4vw,2.8rem)] font-extrabold uppercase leading-[0.95] text-[#140F2E]">
            Qué ganas
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {f.beneficios.map((b) => (
              <li key={b.titulo} className="rounded-[24px] bg-[#F5F3FC] p-6">
                <h3 className="text-lg font-semibold text-[#140F2E]">{b.titulo}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4A4370]">{b.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#1B1040] px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="como">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <h2 id="como" className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,4.4vw,2.8rem)] font-extrabold uppercase leading-[0.95] text-white">
              Cómo funciona
            </h2>
            <ol className="mt-8 space-y-5">
              {f.pasos.map((p, i) => (
                <li key={p} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4F23A] font-bold text-[#140F2E]" aria-hidden="true">
                    {i + 1}
                  </span>
                  <p className="pt-1.5 text-[16px] leading-relaxed text-[#E3DEFA]">{p}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-6">
          {!f.captura && f.ejemplo && <Ejemplo titulo={f.ejemplo.titulo} filas={f.ejemplo.filas} />}
          <div className="rounded-[24px] bg-[#2A1B5E] p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#D4F23A]">En qué plan viene</p>
            <p className="mt-3 text-[17px] leading-relaxed text-white">{enPlan}</p>
            <p className="mt-3 text-[14px] leading-relaxed text-[#B9B1E6]">15 días gratis, sin tarjeta. Cambias de plan o cancelas cuando quieras.</p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
              <Link href="/#precios" className="text-[#D4F23A] underline-offset-2 hover:underline">Comparar planes</Link>
              {demoHref && f.demo && (
                <a href={demoHref} className="text-[#D4F23A] underline-offset-2 hover:underline">{f.demo.label}</a>
              )}
            </div>
          </div>
          </div>
        </div>
      </section>

      <FaqLista faqs={f.faqs} />
      <Relacionados titulo="Se lleva bien con" enlaces={enlaces} />
      <section className="bg-[#F5F3FC] px-4 pb-14 text-center text-sm sm:px-6">
        <Link href="/funciones" className="font-semibold text-[#5B34E8] underline-offset-2 hover:underline">
          Ver todas las funciones de bicho
        </Link>
      </section>
      <Cierre titulo={<>Pruébalo con tu negocio</>} texto={`Das de alta tu negocio en unos 10 minutos y pruebas ${f.nombre} con tus propios datos. 15 días gratis, sin tarjeta.`} />
    </Marco>
  );
}
