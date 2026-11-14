import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { PASOS_RESICO } from '@/lib/resico/pasos';
import { REVISADO, TABLA_MENSUAL, formatoTasa } from '@/lib/resico/isr';
import { formatoPesos } from '@/lib/caja/resumen';
import { guiaPorSlug } from '@/lib/seo/guias';
import { ldArticulo, ldFaq, ldMigas, metaPagina, type Faq } from '@/lib/seo/sitio';
import { Cabecera, Cierre, FaqLista, JsonLd, Marco, Prosa, Relacionados } from '@/components/marketing/seo/Piezas';
import { CalculadoraResico } from '@/components/marketing/seo/CalculadoraResico';

const PATH = '/guias/resico-para-salones';
const TITULO = 'RESICO para salones: cómo darte de alta y cuánto pagas';
const DESCRIPCION =
  'Guía en lenguaje sencillo del Régimen Simplificado de Confianza para estéticas, barberías, uñas y spas: quién puede entrar, los 6 trámites, qué te toca cada mes y calculadora del ISR.';
const FECHA = guiaPorSlug('resico-para-salones')!.fecha;

export const metadata: Metadata = { ...metaPagina({ titulo: TITULO, descripcion: DESCRIPCION, path: PATH }), keywords: ['cómo darse de alta en RESICO', 'RESICO para estéticas', 'calculadora ISR RESICO'] };

const FAQS: Faq[] = [
  {
    q: '¿Cuánto paga de ISR un salón en RESICO?',
    a: 'Entre 1% y 2.5% de lo que cobraste con factura en el mes, sin IVA y sin restar gastos. La tasa depende de cuánto cobraste: hasta $25,000 al mes es 1%, y sube por tramos hasta 2.5%. La tasa que te toque se aplica a todo lo del mes.',
  },
  {
    q: '¿Puedo entrar al RESICO si mi salón es una empresa (S.A. o S. de R.L.)?',
    a: 'Esta guía es para personas físicas. Quienes son socios o accionistas de una persona moral no pueden tributar en el RESICO de personas físicas. Si tu salón está constituido como empresa, consulta a un contador.',
  },
  {
    q: '¿El RESICO incluye el IVA?',
    a: 'No. El RESICO es solo del ISR. El IVA se calcula y se declara aparte; para eso conviene hablar con un contador.',
  },
  {
    q: '¿Qué pasa si una clienta no me pide factura?',
    a: 'En RESICO tienes que facturar todo lo que cobras. Lo que no te piden con factura se junta en una factura global por esas ventas.',
  },
];

export default function GuiaResicoPage() {
  return (
    <Marco>
      <JsonLd
        data={[
          ldArticulo({ titulo: TITULO, descripcion: DESCRIPCION, path: PATH, fecha: FECHA }),
          ldFaq(FAQS),
          ldMigas([
            { nombre: 'Inicio', path: '/' },
            { nombre: 'Guías', path: '/guias' },
            { nombre: 'RESICO para salones', path: PATH },
          ]),
        ]}
      />
      <Cabecera
        migas={[
          { nombre: 'Inicio', href: '/' },
          { nombre: 'Guías', href: '/guias' },
          { nombre: 'RESICO para salones', href: PATH },
        ]}
        eyebrow="Guía fiscal · informativa"
        titulo="RESICO para salones, sin palabras de contador"
        bajada="Qué es, si te toca, los seis trámites para darte de alta y cuánto ISR pagarías cada mes. Pensado para estéticas, barberías, salones de uñas y spas."
      />
      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <Prosa>
          <div className="flex gap-3 rounded-2xl bg-[#FFF4D6] p-4 text-[15px] leading-relaxed text-[#140F2E]">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9A6700]" aria-hidden="true" />
            <p className="!mt-0">
              <strong>Esto es informativo, no es asesoría fiscal.</strong> El cálculo es un estimado del ISR: no incluye IVA ni otras
              obligaciones. Antes de decidir, consulta a un contador.
            </p>
          </div>

          <h2>¿Qué es el RESICO?</h2>
          <p>
            El Régimen Simplificado de Confianza es una forma de pagar impuestos para personas físicas que venden, dan servicios o
            rentan. Pagas el ISR con una tasa baja, del 1% al 2.5%, sobre lo que cobraste con factura, sin contar el IVA. No restas
            gastos: a cambio, la tasa es mucho más baja que en otros regímenes.
          </p>
          <p>
            Para un salón tiene sentido porque casi todo lo que vendes es servicio y tus gastos (renta, producto, comisiones) no
            cambian la cuenta. Lo que importa es cuánto cobraste.
          </p>

          <h2>¿Quién puede entrar?</h2>
          <ul>
            <li>Si lo que cobraste el año pasado por tu negocio no pasó de $3,500,000. Si vas empezando, si calculas que este año no lo vas a pasar.</li>
            <li>No pueden entrar, entre otros: quienes son socios o accionistas de una empresa (persona moral) y quienes tienen ingresos en regímenes fiscales preferentes.</li>
            <li>Si en el año pasas de $3,500,000, sales del RESICO desde el mes siguiente.</li>
            <li>Si dejas de presentar 3 o más pagos mensuales en un año, o no presentas la anual, también sales.</li>
          </ul>

          <h2>Cómo darte de alta: los 6 pasos</h2>
          <ol>
            {PASOS_RESICO.map((p) => (
              <li key={p.id}>
                <strong>{p.titulo}.</strong> {p.texto}
              </li>
            ))}
          </ol>

          <h2>Lo que te toca cada mes y cada año</h2>
          <ul>
            <li>Hacer factura (CFDI) por todo lo que cobras. Si la clienta no la pide, haces una factura global por esas ventas.</li>
            <li>Pedir y guardar las facturas de tus gastos.</li>
            <li>Declarar y pagar el ISR cada mes, a más tardar el día 17 del mes siguiente.</li>
            <li>Presentar la declaración anual en abril.</li>
            <li>Si tienes empleados, retenerles su ISR y pagarlo cada mes, también el día 17.</li>
            <li>Si le cobras a una empresa (persona moral), te retiene el 1.25% y te da la factura de esa retención.</li>
          </ul>

          <h2>Cuánto pagarías: la tabla y la calculadora</h2>
          <p>La tasa NO es progresiva por tramos: la que toque se aplica a todo lo cobrado en el mes.</p>
          <table>
            <thead>
              <tr>
                <th>Ingresos del mes, hasta</th>
                <th>Tasa</th>
              </tr>
            </thead>
            <tbody>
              {TABLA_MENSUAL.map((t) => (
                <tr key={t.hastaCents}>
                  <td className="tabular-nums">{formatoPesos(t.hastaCents)}</td>
                  <td className="tabular-nums">{formatoTasa(t.tasaBps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <CalculadoraResico />

          <h2>¿Cuándo conviene hablar con un contador?</h2>
          <ul>
            <li>Antes de inscribirte o de cambiarte de régimen.</li>
            <li>Si tienes empleados o vas a contratar.</li>
            <li>Si además tienes sueldo, rentas u otros ingresos.</li>
            <li>Si tus ventas se acercan a $3,500,000 al año.</li>
            <li>Para el IVA: el RESICO es solo del ISR, y el IVA se calcula aparte.</li>
            <li>Si te llega cualquier aviso del SAT a tu buzón.</li>
          </ul>

          <h2>Dónde te ayuda bicho</h2>
          <p>
            Dentro del panel, la <Link href="/funciones/guia-resico">guía RESICO</Link> viene en todos los planes: vas palomeando cada
            trámite y, si usas <Link href="/funciones/caja">Caja</Link>, la calculadora toma tus ventas del mes. Cuando ya tengas tu
            sello digital, el plan Pro incluye <Link href="/funciones/facturacion">facturación CFDI 4.0</Link>.
          </p>

          <p className="text-[13px] text-[#6A6488]">
            Información de referencia, revisada en {REVISADO} contra la Ley del ISR (arts. 113-E a 113-J) y sat.gob.mx. Las reglas y
            el límite pueden cambiar cada año; para 2027 hay una propuesta de reforma en trámite.
          </p>
        </Prosa>
      </section>
      <FaqLista faqs={FAQS} />
      <Relacionados
        titulo="Sigue leyendo"
        enlaces={[
          { href: '/guias/precios-servicios-salon', nombre: 'Cómo ponerle precio a tus servicios', texto: 'La cuenta para no trabajar gratis.' },
          { href: '/funciones/facturacion', nombre: 'Facturación CFDI 4.0', texto: 'Factura desde bicho con tu sello digital.' },
          { href: '/para/esteticas', nombre: 'bicho para estéticas', texto: 'Agenda, caja y comisiones en un solo lugar.' },
        ]}
      />
      <Cierre titulo={<>Ordena tu negocio antes de formalizarlo</>} texto="Con la agenda y la caja en bicho sabes cuánto cobras cada mes, que es justo lo que te va a pedir el SAT. 15 días gratis, sin tarjeta." />
    </Marco>
  );
}
