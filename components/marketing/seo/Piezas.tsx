import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, MessageCircle, PawPrint, ShieldCheck } from 'lucide-react';
import { PillLink } from '../Primitives';
import { BichoBug, CircleStamp, GridField, LimeArrow, Sparkle } from '../Flourishes';
import { MarketingNav } from '../MarketingNav';
import { MarketingFooter } from '../MarketingFooter';
import { Medicion } from './Medicion';
import { WHATSAPP_CONTACTO, urlWhatsApp, type Faq } from '@/lib/seo/sitio';

// Piezas de las páginas de búsqueda (/para, /funciones, /guias) y de la
// landing. Server components: nada aquí manda JS al navegador salvo la nav.

export function JsonLd({ data }: { data: object | object[] }) {
  // `<` escapado: un texto con "</script>" no puede cerrar la etiqueta.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** Botón flotante de WhatsApp. Sin número configurado (lib/seo/sitio.ts) no se pinta. */
export function WhatsAppFlotante({ texto = 'Hola, quiero saber más de bicho para mi negocio.' }: { texto?: string }) {
  if (!WHATSAPP_CONTACTO) return null;
  return (
    <a
      href={urlWhatsApp(WHATSAPP_CONTACTO, texto)}
      target="_blank"
      rel="noopener noreferrer"
      data-evento="whatsapp_contacto"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-[#1F8A4C] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_-8px_rgba(20,15,46,0.5)] transition-colors hover:bg-[#176B3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#140F2E] focus-visible:ring-offset-2"
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      <span className="hidden sm:inline">¿Dudas? Escríbenos</span>
    </a>
  );
}

/** Preguntas frecuentes con <details>: accesible y sin JS. */
export function FaqLista({ faqs, titulo = 'Preguntas frecuentes' }: { faqs: Faq[]; titulo?: string }) {
  return (
    <section className="bg-white px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="faq-titulo">
      <div className="mx-auto max-w-3xl">
        <h2 id="faq-titulo" className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,4.4vw,2.6rem)] font-extrabold uppercase leading-[0.95] text-[#140F2E]">
          {titulo}
        </h2>
        <div className="mt-8 divide-y divide-[#140F2E]/10 border-y border-[#140F2E]/10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[16px] font-semibold text-[#140F2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8] [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-[#5B34E8] transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-4 text-[15px] leading-relaxed text-[#4A4370]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Captura real de un demo, en marco de navegador o de teléfono. */
export function Captura({
  src,
  alt,
  movil = false,
  prioridad = false,
  className = '',
}: {
  src: string;
  alt: string;
  movil?: boolean;
  prioridad?: boolean;
  className?: string;
}) {
  if (movil) {
    return (
      <div className={`mx-auto w-full max-w-[260px] rounded-[2.2rem] bg-[#140F2E] p-2 shadow-[0_30px_60px_-25px_rgba(20,15,46,0.6)] ${className}`}>
        <Image src={src} alt={alt} width={390} height={844} priority={prioridad} sizes="260px" className="h-auto w-full rounded-[1.8rem]" />
      </div>
    );
  }
  return (
    <div className={`overflow-hidden rounded-2xl bg-[#140F2E] shadow-[0_30px_60px_-25px_rgba(20,15,46,0.55)] ring-1 ring-[#140F2E]/10 ${className}`}>
      <div className="flex items-center gap-1.5 px-4 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
      </div>
      <Image
        src={src}
        alt={alt}
        width={1280}
        height={800}
        priority={prioridad}
        sizes="(min-width: 1024px) 640px, 100vw"
        className="h-auto w-full"
      />
    </div>
  );
}

/** Cabecera morada con la nav adentro, igual que la portada. */
export function Cabecera({
  migas,
  eyebrow,
  titulo,
  bajada,
  secundario,
  children,
}: {
  migas?: { nombre: string; href: string }[];
  eyebrow: string;
  titulo: React.ReactNode;
  bajada: string;
  secundario?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[#5B34E8]">
      <GridField />
      <BichoBug className="pointer-events-none absolute -left-6 bottom-10 hidden h-16 w-16 -rotate-[22deg] opacity-90 xl:block" />
      <MarketingNav tone="onViolet" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-4 sm:px-6 sm:pb-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
        <div>
          {migas && (
            <nav aria-label="Migas de pan" className="text-[13px] text-[#E3DEFA]">
              <ol className="flex flex-wrap gap-1.5">
                {migas.map((m, i) => (
                  <li key={m.href} className="flex gap-1.5">
                    {i > 0 && <span aria-hidden="true">/</span>}
                    <Link href={m.href} className="underline-offset-2 hover:text-white hover:underline">
                      {m.nombre}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <p className="mt-5 inline-flex rounded-full border border-white/25 bg-white/[0.08] px-3 py-1 text-xs font-medium text-[#D4F23A]">
            {eyebrow}
          </p>
          <h1 className="relative mt-4 text-balance font-[family-name:var(--font-display)] text-[clamp(2.2rem,7vw,4.2rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-white">
            {titulo}
            <Sparkle className="ml-2 inline-block h-[0.5em] w-[0.5em] -translate-y-[0.6em] text-[#D4F23A]" />
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#E3DEFA]">{bajada}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PillLink href="/registro" tone="lime" className="justify-between sm:justify-start">
              Prueba 15 días gratis
            </PillLink>
            {secundario && (
              <PillLink href={secundario.href} tone="outlineOnDark" className="justify-center">
                {secundario.label}
              </PillLink>
            )}
          </div>
          <p className="mt-4 flex items-center gap-2 text-[13px] text-[#E3DEFA]">
            <ShieldCheck className="h-4 w-4 text-[#D4F23A]" aria-hidden="true" />
            Sin tarjeta para empezar. Cancelas con un mensaje.
          </p>
        </div>
        {children && <div>{children}</div>}
      </div>
    </section>
  );
}

/** Cierre de página: una sola acción, sin presión. */
export function Cierre({ titulo, texto }: { titulo: React.ReactNode; texto: string }) {
  return (
    <section className="bg-white px-4 pb-20 sm:px-6 sm:pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[#1B1040] px-6 py-12 sm:px-14 sm:py-16">
        <GridField />
        <span className="absolute right-10 top-1/2 hidden -translate-y-1/2 lg:block"><CircleStamp /></span>
        <LimeArrow className="absolute right-48 top-10 hidden h-20 w-20 text-[#D4F23A] lg:block" />
        <BichoBug className="absolute -right-3 -top-3 h-14 w-14 rotate-[18deg] lg:hidden" />
        <h2 className="relative max-w-2xl font-[family-name:var(--font-display)] text-[clamp(1.9rem,5vw,3rem)] font-extrabold uppercase leading-[0.95] text-white">
          {titulo}
        </h2>
        <p className="relative mt-4 max-w-xl text-[15px] leading-relaxed text-[#B9B1E6]">{texto}</p>
        <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <PillLink href="/registro" tone="lime" className="justify-between sm:justify-start">
            Prueba 15 días gratis
          </PillLink>
          <PillLink href="/#demos" tone="outlineOnDark" className="justify-center">
            Ve un demo real
          </PillLink>
        </div>
      </div>
    </section>
  );
}

/** Enlaces internos entre páginas relacionadas. */
export function Relacionados({ titulo, enlaces }: { titulo: string; enlaces: { href: string; nombre: string; texto: string }[] }) {
  if (!enlaces.length) return null;
  return (
    <section className="bg-[#F5F3FC] px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-lg font-semibold text-[#140F2E]">{titulo}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enlaces.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="block h-full rounded-2xl bg-white p-5 ring-1 ring-[#140F2E]/[0.06] transition-shadow hover:shadow-[0_12px_30px_-18px_rgba(20,15,46,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8]"
              >
                <span className="font-semibold text-[#5B34E8]">{e.nombre}</span>
                <span className="mt-1 block text-[14px] leading-snug text-[#4A4370]">{e.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Marco común: fondo blanco fijo (no hereda el tema del panel), pie y WhatsApp. */
export function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-[#140F2E]">
      <main>{children}</main>
      <MarketingFooter />
      <WhatsAppFlotante />
      <Medicion />
    </div>
  );
}

/** Bloque de texto largo de las guías y páginas de giro. */
export function Prosa({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl text-[16px] leading-relaxed text-[#2E2755] [&_a]:font-medium [&_a]:text-[#5B34E8] [&_a]:underline [&_h2]:mt-12 [&_h2]:font-[family-name:var(--font-display)] [&_h2]:text-[clamp(1.6rem,4vw,2.2rem)] [&_h2]:font-extrabold [&_h2]:uppercase [&_h2]:leading-[0.95] [&_h2]:text-[#140F2E] [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#140F2E] [&_li]:mt-2 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_strong]:text-[#140F2E] [&_table]:mt-6 [&_table]:w-full [&_td]:border-t [&_td]:border-[#140F2E]/10 [&_td]:py-2 [&_td]:pr-3 [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
      {children}
    </div>
  );
}

/** Tarjeta de un demo en vivo: la prueba social honesta mientras no hay clientes. */
export function DemoTarjeta({
  demo,
  href,
  panelHref,
  className = '',
}: {
  demo: { nombre: string; giro: string; foto: string | null };
  href: string;
  panelHref?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[24px] bg-white shadow-[0_30px_60px_-25px_rgba(20,15,46,0.55)] ${className}`}>
      <a href={href} className="group relative block aspect-[16/10] bg-[#2A1B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4F23A]">
        {demo.foto ? (
          <Image src={demo.foto} alt="" fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 grid grid-cols-5 place-items-center gap-3 bg-[#5A3A00] p-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <PawPrint key={i} className={`h-8 w-8 text-[#FFC24D]/40 ${i % 2 ? 'rotate-12' : '-rotate-12'}`} />
            ))}
          </span>
        )}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0A061C]/90 via-[#0A061C]/30 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 p-5">
          <span className="block text-xs font-semibold uppercase tracking-wide text-[#D4F23A]">Demo en vivo · {demo.giro}</span>
          <span className="mt-1 block text-xl font-bold text-white">{demo.nombre}</span>
        </span>
      </a>
      <div className="flex flex-col gap-2 p-5 text-sm">
        <p className="text-[#4A4370]">Es un negocio de ejemplo con datos de prueba. Reserva una cita como lo haría tu clienta.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
          <a href={href} className="text-[#5B34E8] underline-offset-2 hover:underline">Reservar en el demo</a>
          {panelHref && (
            <a href={panelHref} className="text-[#5B34E8] underline-offset-2 hover:underline">Ver el panel del dueño</a>
          )}
        </div>
      </div>
    </div>
  );
}

/** Ejemplo ilustrativo para lo que no tiene demo público. */
export function Ejemplo({ titulo, filas }: { titulo: string; filas: [string, string][] }) {
  return (
    <figure className="rounded-[24px] bg-white p-6 shadow-[0_30px_60px_-25px_rgba(20,15,46,0.55)]">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="font-semibold text-[#140F2E]">{titulo}</span>
        <span className="rounded-full bg-[#F5F3FC] px-2.5 py-1 text-[11px] font-medium text-[#6A6488]">Ejemplo ilustrativo</span>
      </figcaption>
      <dl className="mt-5 divide-y divide-[#140F2E]/[0.08]">
        {filas.map(([a, b], i) => (
          <div key={i} className="flex justify-between gap-4 py-2.5 text-[14px]">
            <dt className="text-[#6A6488]">{a}</dt>
            <dd className="text-right font-medium text-[#140F2E]">{b}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
