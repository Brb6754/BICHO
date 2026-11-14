import type { Metadata } from 'next';
import Link from 'next/link';
import { guiaPorSlug } from '@/lib/seo/guias';
import { ldArticulo, ldFaq, ldMigas, metaPagina, type Faq } from '@/lib/seo/sitio';
import { Cabecera, Cierre, FaqLista, JsonLd, Marco, Prosa, Relacionados } from '@/components/marketing/seo/Piezas';
import { DesglosePrecio } from '@/components/marketing/seo/Graficos';

// Las mismas cifras del ejemplo resuelto de la tabla de abajo.
const PARTES = [
  { nombre: 'Tu tiempo (1.5 h × $200)', monto: 300 },
  { nombre: 'Materiales', monto: 60 },
  { nombre: 'Comisión y ganancia (30%)', monto: 108 },
];

const PATH = '/guias/precios-servicios-salon';
const TITULO = 'Cómo ponerle precio a los servicios de tu salón';
const DESCRIPCION =
  'Método paso a paso para calcular el precio de tus servicios de estética, uñas, pestañas o barbería: costo por hora, materiales, comisión y margen. Con un ejemplo resuelto.';
const FECHA = guiaPorSlug('precios-servicios-salon')!.fecha;

export const metadata: Metadata = { ...metaPagina({ titulo: TITULO, descripcion: DESCRIPCION, path: PATH }), keywords: ['cómo poner precios en un salón de belleza', 'precio de servicios de uñas', 'cómo calcular precios de estética'] };

const FAQS: Faq[] = [
  {
    q: '¿Debo copiar los precios de la competencia?',
    a: 'Sirve como referencia de lo que tus clientas están acostumbradas a pagar, pero no como punto de partida. Tu renta, tus materiales y tu tiempo no son los de la otra estética. Primero haz tu cuenta; luego compara.',
  },
  {
    q: '¿Cada cuánto subo precios?',
    a: 'Revisa tu cuenta cuando suba algo que pagas (renta, producto, sueldos) y al menos una vez al año. Subir poco y con aviso se recibe mejor que un brinco grande después de años.',
  },
  {
    q: '¿Publico mis precios o los doy por mensaje?',
    a: 'Publicarlos ahorra el “¿cuánto cuesta?” de todos los días y filtra a quien no está dispuesta a pagarlos. Si un servicio varía mucho, puedes poner “desde $X”.',
  },
];

export default function GuiaPreciosPage() {
  return (
    <Marco>
      <JsonLd
        data={[
          ldArticulo({ titulo: TITULO, descripcion: DESCRIPCION, path: PATH, fecha: FECHA }),
          ldFaq(FAQS),
          ldMigas([
            { nombre: 'Inicio', path: '/' },
            { nombre: 'Guías', path: '/guias' },
            { nombre: 'Precios de servicios', path: PATH },
          ]),
        ]}
      />
      <Cabecera
        migas={[
          { nombre: 'Inicio', href: '/' },
          { nombre: 'Guías', href: '/guias' },
          { nombre: 'Precios de servicios', href: PATH },
        ]}
        eyebrow="Guía práctica"
        titulo="Cómo ponerle precio a tus servicios"
        bajada="Si tu precio sale de lo que cobra la de enfrente, puede que estés trabajando gratis sin saberlo. La cuenta completa, en cinco pasos y con un ejemplo."
      >
        <div className="mx-auto max-w-[400px] rotate-[1.5deg]">
          <DesglosePrecio partes={PARTES} total="$470" oscuro />
        </div>
      </Cabecera>
      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <Prosa>
          <h2>La idea en una línea</h2>
          <p>
            <strong>Precio = (tiempo × lo que cuesta tu hora) + materiales + comisión + tu ganancia.</strong> Todo lo demás es
            averiguar cada uno de esos números con honestidad.
          </p>

          <h2>1. Suma lo que te cuesta abrir el mes</h2>
          <p>
            Renta, luz, agua, internet, sueldos fijos, software, el pago del local, lo que apartas para impuestos. Todo lo que pagas
            aunque no llegue ninguna clienta. Ese es tu <strong>costo fijo mensual</strong>.
          </p>

          <h2>2. Calcula cuántas horas de servicio vendes de verdad</h2>
          <p>
            No las horas que está abierto el salón, sino las que alguien está atendiendo. Entre huecos, limpieza y tiempo muerto, casi
            nunca es el 100%. Sé conservadora: es mejor que el precio aguante un mes flojo.
          </p>
          <p>
            Divide: <strong>costo fijo mensual ÷ horas de servicio = lo que cuesta tu hora</strong>. Si tienes varias sillas, cuenta las
            horas de todas.
          </p>

          <h2>3. Mide los materiales de cada servicio</h2>
          <p>
            Cuánto producto se va en cada servicio: el gel, el tinte, el oxidante, las pestañas, la cera, el desechable. Calcúlalo por
            servicio dividiendo lo que cuesta el envase entre cuántos servicios rinde.
          </p>

          <h2>4. Agrega la comisión y tu ganancia</h2>
          <p>
            Si la estilista gana un porcentaje, súmalo. Y después tu ganancia: lo que le queda al negocio para crecer, cubrir un mes
            malo o reponer equipo. Sin esa parte, el negocio solo te paga el sueldo.
          </p>

          <h2>5. Compara con el mercado (al final, no al principio)</h2>
          <p>
            Ya con tu número, mira qué cobran cerca. Si quedas muy arriba, revisa si tus horas productivas son realistas o si algún
            costo se puede bajar. Si quedas muy abajo, probablemente estabas cobrando de menos.
          </p>

          <h2>Ejemplo resuelto</h2>
          <div className="mt-6">
            <DesglosePrecio partes={PARTES} total="$470" />
          </div>
          <p className="text-[14px] text-[#6A6488]">Números inventados solo para enseñar la cuenta. Usa los tuyos.</p>
          <table>
            <tbody>
              <tr><td>Costo fijo mensual</td><td className="tabular-nums">$24,000</td></tr>
              <tr><td>Horas de servicio vendidas al mes</td><td className="tabular-nums">120</td></tr>
              <tr><td>Costo de tu hora (24,000 ÷ 120)</td><td className="tabular-nums">$200</td></tr>
              <tr><td>Servicio: uñas acrílicas, 1.5 horas</td><td className="tabular-nums">$300</td></tr>
              <tr><td>Materiales del servicio</td><td className="tabular-nums">$60</td></tr>
              <tr><td>Costo total</td><td className="tabular-nums">$360</td></tr>
              <tr><td>Más 30% de comisión y ganancia</td><td className="tabular-nums">$108</td></tr>
              <tr><td><strong>Precio mínimo sugerido</strong></td><td className="tabular-nums"><strong>$468 → $470</strong></td></tr>
            </tbody>
          </table>
          <p>
            En este ejemplo, cobrar $350 porque “así cobran todas” significa perder dinero en cada set, aunque la agenda esté llena.
          </p>

          <h2>Tres errores comunes</h2>
          <ul>
            <li><strong>Cobrar igual servicios que no duran igual.</strong> Si el retoque te toma la mitad, cuesta menos; si el diseño te toma el doble, cuesta más.</li>
            <li><strong>Olvidar tu propio sueldo.</strong> Si tú atiendes, tu hora también es un costo.</li>
            <li><strong>No revisar nunca.</strong> Lo que pagas sube cada año; tus precios también deberían.</li>
          </ul>

          <h2>Dónde te ayuda bicho</h2>
          <p>
            En bicho cada servicio lleva su <Link href="/funciones/reservas-en-linea">precio y su duración</Link>, así tu página muestra
            precios claros y la agenda no te encima un servicio largo. Con <Link href="/funciones/caja">Caja</Link> ves cuánto vendiste y
            gastaste cada mes, que son justo los números de esta cuenta, y con <Link href="/funciones/inventario">Inventario</Link> sabes
            cuánto producto se va.
          </p>
        </Prosa>
      </section>
      <FaqLista faqs={FAQS} />
      <Relacionados
        titulo="Sigue leyendo"
        enlaces={[
          { href: '/guias/resico-para-salones', nombre: 'RESICO para salones', texto: 'Cuánto ISR pagarías cada mes.' },
          { href: '/funciones/comisiones', nombre: 'Comisiones', texto: 'Cuánto le toca a cada estilista.' },
          { href: '/para/unas', nombre: 'bicho para salones de uñas', texto: 'Cada servicio con su duración real.' },
        ]}
      />
      <Cierre titulo={<>Precios claros, agenda sin encimarse</>} texto="Publica tus servicios con su precio y su duración, y deja que tus clientas aparten solas. 15 días gratis, sin tarjeta." />
    </Marco>
  );
}
