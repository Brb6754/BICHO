import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarCheck,
  CreditCard,
  Download,
  HeartHandshake,
  LogOut,
  MessageCircleOff,
  NotebookPen,
  Package,
  Percent,
  Receipt,
  Smartphone,
  Sparkles,
  Stamp,
  Tag,
  UserRound,
  Wallet,
} from 'lucide-react';
import { PillLink } from '@/components/marketing/Primitives';
import { AsteriskMark, BichoBug, CircleStamp, GridField, LimeArrow, Sparkle } from '@/components/marketing/Flourishes';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { PricingSection } from '@/components/marketing/PricingSection';
import { DemoTarjeta, FaqLista, JsonLd, Marco } from '@/components/marketing/seo/Piezas';
import { EscenaDosLados, EscenaProducto, FichaGiro, IlustracionDolor, VistaTarjeta } from '@/components/marketing/seo/Graficos';
import { GIROS } from '@/lib/seo/giros';
import { CORREO_CONTACTO, ldFaq, ldOrganizacion, ldSoftware, metaPagina, urlDemo, type Faq } from '@/lib/seo/sitio';

const TITULO = 'Agenda de citas en línea para salones de belleza · bicho';
const DESCRIPCION =
  'Tus clientas apartan su cita solas, a cualquier hora, y les llega su confirmación. Agenda, recordatorios, caja y lealtad para negocios de belleza en México. 15 días gratis, sin tarjeta.';

export const metadata: Metadata = metaPagina({ titulo: TITULO, descripcion: DESCRIPCION, path: '/' });

// La raíz de bichomx.com (cambio de 2026-11-14): landing del producto,
// escrita al DOLOR de la dueña de un negocio de belleza, no a la
// "profesionalización" (conclusión de la junta del 9 nov, redes/
// ESTRUCTURA-BICHO.md). La página del estudio pasó a /estudio.
//
// Sin clientes de pago todavía: la prueba social son los demos en vivo y
// lo verificable (precio claro, sin contrato, cancelar con un mensaje).

const DEMOS = [
  { slug: 'lima-laca', nombre: 'Lima & Laca', giro: 'Uñas', foto: '/demo/lima-laca.webp' },
  { slug: 'agua-serena', nombre: 'Agua Serena', giro: 'Spa', foto: '/demo/agua-serena.webp' },
  { slug: 'casa-luma', nombre: 'Casa Luma', giro: 'Salón de belleza', foto: '/demo/casa-luma.webp' },
  { slug: 'burbujas-bigotes', nombre: 'Burbujas & Bigotes', giro: 'Estética canina', foto: null },
  { slug: 'dental-nova', nombre: 'Dental Nova', giro: 'Dentista', foto: '/demo/dental-nova.webp' },
  { slug: 'alto-padel', nombre: 'Alto Pádel Club', giro: 'Club de pádel', foto: '/demo/alto-padel.webp' },
];

const DOLORES = [
  {
    grafica: 'chat' as const,
    icono: MessageCircleOff,
    titulo: '“¿Tienes hoy a las 5?”, a las 11 de la noche',
    texto: 'Contestas horarios entre clienta y clienta, con las manos ocupadas, y en la noche sigues contestando. Si tardas, agenda con otra.',
  },
  {
    grafica: 'plantada' as const,
    icono: CalendarCheck,
    titulo: 'La de las 4 no llegó, y no avisó',
    texto: 'Le dijiste que no a otra clienta por guardarle el lugar. La hora se perdió y nadie la va a pagar.',
  },
  {
    grafica: 'libreta' as const,
    icono: NotebookPen,
    titulo: 'Todo vive en la libreta',
    texto: 'Las citas, los teléfonos, quién te debe. Si se moja, se pierde o la letra no se entiende, se va el mes.',
  },
];

const PASOS = [
  { titulo: 'Das de alta tu negocio', texto: 'Desde el celular, en unos 10 minutos: nombre, servicios con precio y duración, y tu horario. Sin tarjeta.' },
  { titulo: 'Compartes tu link', texto: 'Lo pegas en tu Instagram, tu Facebook o lo mandas por WhatsApp cuando te pregunten. Es tu dirección: tusalon.bichomx.com.' },
  { titulo: 'Tus clientas apartan solas', texto: 'Ven tus horarios libres, eligen y les llega su confirmación con un link para cambiar o cancelar. Tú ves todo en tu agenda.' },
];

const MODULOS = [
  { icono: Wallet, nombre: 'Caja', slug: 'caja', beneficio: 'Al cerrar sabes cuánto te quedó y cuánto debería haber en el cajón.', plan: 'Negocio' },
  { icono: Stamp, nombre: 'Lealtad', slug: 'lealtad', beneficio: 'La tarjeta de sellos, sin papel que se pierda en la bolsa.', plan: 'Negocio' },
  { icono: HeartHandshake, nombre: 'Clientes que regresan', slug: 'clientes-que-regresan', beneficio: 'Te dice quién ya no ha vuelto y te deja el mensaje escrito. Más recordatorios automáticos.', plan: 'Negocio' },
  { icono: Package, nombre: 'Inventario', slug: 'inventario', beneficio: 'Te avisa antes de que se acabe el tono que todas piden.', plan: 'Negocio' },
  { icono: Percent, nombre: 'Comisiones', slug: 'comisiones', beneficio: 'Cuánto le toca a cada estilista, sin sumar la libreta el sábado.', plan: 'Negocio' },
  { icono: Receipt, nombre: 'Facturas', slug: 'facturacion', beneficio: 'CFDI 4.0 cuando te la piden, con tu sello digital. 100 timbres al mes.', plan: 'Pro' },
  { icono: Sparkles, nombre: 'Copiloto', slug: 'copiloto', beneficio: 'Pregúntale a tus datos en español: “¿quién no ha vuelto este mes?”.', plan: 'Pro' },
];

const CONFIANZA = [
  { icono: Smartphone, titulo: 'Lista hoy', texto: 'Te registras y tu página queda funcionando el mismo día.' },
  { icono: CreditCard, titulo: 'Sin tarjeta', texto: '15 días gratis sin dar ningún dato de pago.' },
  { icono: LogOut, titulo: 'Cancelas con un mensaje', texto: 'Sin contrato ni plazo forzoso. Nos escribes y listo.' },
  { icono: Download, titulo: 'Tus datos son tuyos', texto: 'Si te vas, pídenos tu lista de clientas y citas y te la mandamos.' },
  { icono: UserRound, titulo: 'Te contesta una persona', texto: 'Si te atoras, te ayuda alguien de bicho, no un bot.' },
  { icono: Tag, titulo: 'Precio claro', texto: 'Tres planes con precio publicado. Sin comisión por cita.' },
];

const FAQS: Faq[] = [
  { q: '¿Necesito tener página web?', a: 'No. bicho te da tu página de citas con tu logo, tus servicios, tu horario y tu ubicación, en tu propia dirección (tunegocio.bichomx.com). La compartes donde ya estás: Instagram, Facebook y WhatsApp.' },
  { q: '¿Mis clientas tienen que descargar algo?', a: 'No. Abren el link desde cualquier celular, eligen servicio, día y hora, y listo. Sin app, sin cuenta y sin contraseña.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. No hay contrato ni plazo forzoso: nos mandas un mensaje y se cancela. Tu página deja de recibir citas nuevas y tus datos siguen siendo tuyos.' },
  { q: '¿Y si no sé de tecnología?', a: 'Si sabes usar WhatsApp, puedes usar bicho. El alta se hace desde el celular en unos 10 minutos, y si te atoras te ayuda una persona.' },
  { q: '¿Facturan?', a: 'Con el plan Pro tú puedes emitir facturas CFDI 4.0 a tus clientas (100 timbres al mes), con tu RFC y tu sello digital del SAT. Si necesitas factura de tu suscripción, escríbenos antes de pagar y lo vemos contigo.' },
  { q: '¿Cobran comisión por cada cita?', a: 'No. Pagas tu plan al mes ($299, $499 o $799 MXN) y recibes las citas que lleguen.' },
  { q: '¿Qué pasa al terminar los 15 días?', a: 'Eliges tu plan y agregas tu método de pago. Si no lo haces, tienes 3 días más de margen y después tu página se pone en pausa: deja de recibir citas nuevas, pero tus datos no se borran. Nada se cobra solo, porque nunca diste tarjeta.' },
];

const h2 = 'font-[family-name:var(--font-display)] text-[clamp(1.9rem,4.6vw,3.1rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em]';

export default function LandingPage() {
  return (
    <Marco>
      <JsonLd data={[ldOrganizacion(), ldSoftware(DESCRIPCION), ldFaq(FAQS)]} />

      {/* HERO: el dolor más fuerte del giro belleza y UNA acción. */}
      <section id="top" className="relative isolate overflow-hidden bg-[#5B34E8]">
        <GridField />
        <AsteriskMark className="pointer-events-none absolute right-[6%] top-24 hidden h-10 w-10 text-[#D4F23A] lg:block" />
        <BichoBug className="pointer-events-none absolute -left-4 bottom-16 hidden h-16 w-16 -rotate-[24deg] xl:block" />
        <MarketingNav tone="onViolet" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center lg:pb-24">
          <div>
            <p className="inline-flex rounded-full border border-white/25 bg-white/[0.08] px-3 py-1 text-xs font-medium text-white">
              Agenda de citas para uñas, pestañas, estéticas, spa y barberías
            </p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(2.6rem,9vw,5.6rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em] text-white">
              Deja de contestar <span className="text-[#D4F23A]">“¿a qué hora tienes?”</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#E3DEFA] sm:text-lg">
              Tus clientas apartan solas su cita, a cualquier hora, y les llega su confirmación con un link para cambiarla. Tú
              atiendes; la agenda contesta.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PillLink href="/registro" tone="lime" className="justify-between sm:justify-start">
                Prueba 15 días gratis
              </PillLink>
              <PillLink href="#demos" tone="outlineOnDark" className="justify-center">
                Ve un demo real
              </PillLink>
              <CircleStamp className="ml-4 hidden h-28 w-28 shrink-0 sm:inline-flex lg:hidden xl:inline-flex" />
            </div>
            <p className="mt-4 text-[14px] text-[#E3DEFA]">Sin tarjeta · lista hoy · cancelas con un mensaje</p>
          </div>
          <div className="relative">
            <Sparkle className="absolute -right-1 top-0 h-7 w-7 text-[#D4F23A]" />
            <EscenaProducto />
            <p className="mt-2 text-center text-[13px] text-[#E3DEFA]">
              Así la ve tu clienta.{' '}
              <a href={urlDemo('lima-laca')} className="font-semibold text-white underline underline-offset-2">
                Pruébala tú
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* EL PROBLEMA, en sus palabras. */}
      <section className="relative z-10 -mt-8 rounded-t-[2rem] bg-white px-4 pt-16 sm:px-6 sm:pt-20" aria-labelledby="problema">
        <div className="mx-auto max-w-6xl">
          <h2 id="problema" className={`${h2} max-w-3xl text-[#140F2E]`}>
            ¿Te suena alguno?
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {DOLORES.map(({ grafica, icono: Icono, titulo, texto }) => (
              <li key={titulo} className="rounded-[24px] bg-[#F5F3FC] p-4 pb-6">
                <IlustracionDolor tipo={grafica} />
                <Icono className="ml-2 mt-5 h-6 w-6 text-[#5B34E8]" aria-hidden="true" />
                <h3 className="mx-2 mt-3 text-lg font-semibold leading-snug text-[#140F2E]">{titulo}</h3>
                <p className="mx-2 mt-2 text-[15px] leading-relaxed text-[#4A4370]">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CÓMO FUNCIONA: sí es secuencia, por eso va numerado. */}
      <section id="como-funciona" className="scroll-mt-4 bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <h2 className={`${h2} text-[#140F2E]`}>Así de simple</h2>
            <ol className="mt-10 space-y-8">
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="flex gap-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5B34E8] text-lg font-bold text-white" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#140F2E]">{p.titulo}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#4A4370]">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <figure>
            <EscenaDosLados />
            <figcaption className="mt-14 text-center sm:mt-16 text-[13px] text-[#6A6488]">Lo que aparta tu clienta en su celular cae en tu agenda (demo con datos de ejemplo).</figcaption>
          </figure>
        </div>
      </section>

      {/* DEMOS: la prueba social honesta. */}
      <section id="demos" className="scroll-mt-4 bg-[#1B1040] px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="demos-titulo">
        <div className="mx-auto max-w-6xl">
          <h2 id="demos-titulo" className={`${h2} max-w-3xl text-white`}>
            No nos creas: <span className="text-[#D4F23A]">reserva en un demo</span>
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#B9B1E6]">
            Son negocios de ejemplo, abiertos y sin contraseña. Aparta una cita como lo haría tu clienta y luego abre el panel para ver
            cómo le llega al dueño.
          </p>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DEMOS.map((d) => (
              <li key={d.slug}>
                <DemoTarjeta demo={d} href={urlDemo(d.slug)} panelHref={urlDemo(d.slug, '/panel')} className="h-full" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* MÓDULOS: por beneficio, no por nombre técnico. */}
      <section id="modulos" className="scroll-mt-4 bg-white px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="modulos-titulo">
        <div className="mx-auto max-w-6xl">
          <h2 id="modulos-titulo" className={`${h2} max-w-3xl text-[#140F2E]`}>
            Cuando la agenda ya no basta
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#4A4370]">
            Empiezas con la agenda en línea. Cuando tu negocio lo pida, prendes lo demás, sin cambiar de sistema.
          </p>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MODULOS.map(({ icono: Icono, nombre, slug, beneficio, plan }) => (
              <li key={slug}>
                <Link
                  href={`/funciones/${slug}`}
                  className="group flex h-full flex-col rounded-[24px] bg-[#F5F3FC] p-6 transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(20,15,46,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8]"
                >
                  <VistaTarjeta slug={slug} />
                  <span className="flex items-center gap-2 text-lg font-semibold text-[#140F2E]">
                    <Icono className="h-5 w-5 text-[#5B34E8]" aria-hidden="true" />
                    {nombre}
                  </span>
                  <span className="mt-2 flex-1 text-[15px] leading-relaxed text-[#4A4370]">{beneficio}</span>
                  <span className="mt-4 text-xs font-semibold text-[#5B34E8]">Plan {plan}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/funciones"
                className="flex h-full min-h-[180px] flex-col justify-end rounded-[24px] bg-[#5B34E8] p-6 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#140F2E] focus-visible:ring-offset-2"
              >
                <span className="text-lg font-semibold">Ver todas las funciones</span>
                <span className="mt-1 text-[14px] text-[#E3DEFA]">Recordatorios, cotizaciones, reuniones, guía RESICO y más.</span>
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* GIROS: enlaces internos al motor de búsqueda. */}
      <section className="bg-[#F5F3FC] px-4 py-14 sm:px-6" aria-labelledby="giros-titulo">
        <div className="mx-auto max-w-6xl">
          <h2 id="giros-titulo" className={`${h2} text-[#140F2E]`}>Hecho para tu giro</h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {GIROS.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/para/${g.slug}`}
                  className="group block rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8] focus-visible:ring-offset-2"
                >
                  <FichaGiro slug={g.slug} nombre={g.nombre.charAt(0).toUpperCase() + g.nombre.slice(1)} foto={g.demo.foto} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CONFIANZA: lo que la dueña necesita oír antes de dar el sí. */}
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="confianza-titulo">
        <div className="mx-auto max-w-6xl">
          <h2 id="confianza-titulo" className={`${h2} max-w-3xl text-[#140F2E]`}>
            Sin letras chiquitas
          </h2>
          <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {CONFIANZA.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D4F23A]" aria-hidden="true">
                  <Icono className="h-5 w-5 text-[#140F2E]" />
                </span>
                <div>
                  <h3 className="font-semibold text-[#140F2E]">{titulo}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#4A4370]">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PricingSection />
      <FaqLista faqs={FAQS} titulo="Lo que nos preguntan antes de empezar" />

      {/* CIERRE */}
      <section className="bg-white px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[#5B34E8] px-6 py-14 sm:px-14 sm:py-16">
          <GridField />
          <span className="absolute right-12 top-1/2 hidden -translate-y-1/2 lg:block"><CircleStamp /></span>
          <LimeArrow className="absolute right-52 top-12 hidden h-20 w-20 text-[#D4F23A] lg:block" />
          <BichoBug className="absolute right-6 top-6 h-14 w-14 rotate-[18deg] lg:hidden" />
          <h2 className={`${h2} relative max-w-3xl text-white`}>
            Esta noche, que conteste <span className="text-[#D4F23A]">tu agenda</span>
          </h2>
          <p className="relative mt-5 max-w-xl text-[16px] leading-relaxed text-[#E3DEFA]">
            Tu página de citas queda lista hoy. 15 días gratis, sin tarjeta, y si no te convence cancelas con un mensaje.
          </p>
          <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PillLink href="/registro" tone="lime" className="justify-between sm:justify-start">
              Prueba 15 días gratis
            </PillLink>
            <a href={`mailto:${CORREO_CONTACTO}`} className="text-center text-sm font-semibold text-white underline underline-offset-2 sm:ml-4">
              ¿Dudas? Escríbenos
            </a>
          </div>
        </div>
      </section>
    </Marco>
  );
}
