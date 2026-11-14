import type { Metadata } from 'next';
import Link from 'next/link';
import { guiaPorSlug } from '@/lib/seo/guias';
import { ldArticulo, ldFaq, ldMigas, metaPagina, type Faq } from '@/lib/seo/sitio';
import { Cabecera, Cierre, FaqLista, JsonLd, Marco, Prosa, Relacionados } from '@/components/marketing/seo/Piezas';
import { EscenaRecordatorio, LineaCita } from '@/components/marketing/seo/Graficos';

const PATH = '/guias/como-reducir-citas-que-no-llegan';
const TITULO = 'Cómo reducir las citas que no llegan en tu salón';
const DESCRIPCION =
  'Ocho cosas que sí funcionan para que tus clientas no te dejen plantada: confirmación, recordatorio, salida fácil, política de cancelación clara y anticipo bien pedido. Sin perder clientas.';
const FECHA = guiaPorSlug('como-reducir-citas-que-no-llegan')!.fecha;

export const metadata: Metadata = { ...metaPagina({ titulo: TITULO, descripcion: DESCRIPCION, path: PATH }), keywords: ['citas que no llegan', 'clientas que no llegan a su cita', 'cómo evitar que me dejen plantada'] };

const FAQS: Faq[] = [
  {
    q: '¿Cobrar anticipo espanta a las clientas?',
    a: 'Depende de cómo se pida. Funciona mejor en servicios largos o caros y con clientas nuevas, explicado como “apartado” que se descuenta del total, no como castigo. A tus clientas de siempre muchas veces no hace falta pedírselo.',
  },
  {
    q: '¿Cuándo mando el recordatorio?',
    a: 'Un día antes suele ser buen momento: da tiempo de reagendar y de que tú ofrezcas el espacio a alguien más. Si la cita es temprano, el recordatorio de la tarde anterior es el que más se lee.',
  },
  {
    q: '¿Qué hago con la clienta que siempre me deja plantada?',
    a: 'Anótalo en su ficha. A partir de la segunda vez, es razonable pedirle anticipo o darle solo horarios donde un hueco te afecte menos. Es tu agenda y tu tiempo.',
  },
];

export default function GuiaNoShowPage() {
  return (
    <Marco>
      <JsonLd
        data={[
          ldArticulo({ titulo: TITULO, descripcion: DESCRIPCION, path: PATH, fecha: FECHA }),
          ldFaq(FAQS),
          ldMigas([
            { nombre: 'Inicio', path: '/' },
            { nombre: 'Guías', path: '/guias' },
            { nombre: 'Citas que no llegan', path: PATH },
          ]),
        ]}
      />
      <Cabecera
        migas={[
          { nombre: 'Inicio', href: '/' },
          { nombre: 'Guías', href: '/guias' },
          { nombre: 'Citas que no llegan', href: PATH },
        ]}
        eyebrow="Guía práctica"
        titulo="Que ya no te dejen plantada"
        bajada="La mayoría de las citas que no llegan no son mala fe: se les olvidó, o les dio pena avisar. Ocho cosas que sí funcionan, ordenadas de la más fácil a la más firme."
      >
        <EscenaRecordatorio />
      </Cabecera>
      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <Prosa>
          <h2>Primero, entiende por qué no llegan</h2>
          <p>
            Antes de poner reglas, piensa en tus últimas citas fallidas. Casi siempre caen en tres grupos: la clienta <strong>se
            olvidó</strong>, <strong>le dio pena cancelar</strong> (escribir “ya no voy” se siente feo) o <strong>la cita no valía tanto para
            ella</strong> (la apartó “por si acaso”). Cada grupo se resuelve distinto, y la mayoría se resuelve sin regañar a nadie.
          </p>

          <h2>1. Confirma por escrito al momento de agendar</h2>
          <p>
            Una cita dicha por teléfono se olvida más fácil que una que llega escrita con día, hora, servicio y dirección. La
            confirmación también sirve para corregir errores (“¿el martes 14? yo dije el jueves”) antes de que se conviertan en un
            hueco.
          </p>

          <h2>2. Manda un recordatorio un día antes</h2>
          <p>
            Es lo que resuelve el grupo de “se me olvidó”. No tiene que ser largo: nombre, servicio, día y hora. Hazlo con la misma
            regularidad para todas las clientas; si solo recuerdas a algunas, las demás lo toman como señal de que no importa tanto.
          </p>

          <h2>3. Hazle fácil cancelar o cambiar la hora</h2>
          <p>
            Suena al revés, pero es de lo que más ayuda. Si cancelar requiere escribirte y dar explicaciones, mucha gente prefiere no
            decir nada. Si en su recordatorio viene un link para cambiar la hora ella misma, el plantón se convierte en un aviso, y tú
            recuperas el espacio con tiempo para ofrecerlo.
          </p>

          <LineaCita />

          <h2>4. Escribe tu política de cancelación (y dila antes)</h2>
          <p>
            Algo corto y claro, por ejemplo: “Si no puedes venir, avísanos con 24 horas para darle el espacio a otra clienta”. Ponlo en
            tu página de citas y en la confirmación. Una regla que la clienta leyó antes de agendar se siente justa; una que descubre
            después, se siente como multa.
          </p>

          <h2>5. Pide anticipo solo donde tiene sentido</h2>
          <p>
            Para servicios largos (un set de pestañas, un color con mechas, un paquete de spa) o para clientas nuevas, un anticipo que
            se descuenta del total filtra las citas “por si acaso”. Llámalo apartado, explica que se descuenta, y define qué pasa si
            avisa a tiempo (lo normal es moverlo a la nueva fecha).
          </p>

          <h2>6. Agenda la siguiente cita antes de que se vaya</h2>
          <p>
            La clienta de relleno o de retoque ya sabe que va a volver. Proponerle la fecha mientras paga es más fácil que esperar a
            que escriba, y una cita apartada con semanas de anticipación se acompaña bien de un recordatorio.
          </p>

          <h2>7. Ten a quién ofrecer el hueco</h2>
          <p>
            Un espacio que se libera con un día de anticipación todavía se puede llenar. Ten a la mano la lista de clientas que pidieron
            “avísame si se abre algo” o que ya les toca volver, y ofrécelo primero a ellas.
          </p>

          <h2>8. Anota quién falla</h2>
          <p>
            No para exhibir a nadie, sino para decidir con datos. Si una clienta falla dos veces, es razonable pedirle anticipo o darle
            horarios donde el hueco te afecte menos.
          </p>

          <h2>Qué hace bicho y qué no</h2>
          <ul>
            <li>
              <strong>Sí:</strong> confirmación al agendar con link para cambiar o cancelar (todos los planes), y{' '}
              <Link href="/funciones/recordatorios">recordatorio automático</Link> antes de la cita (plan Negocio).
            </li>
            <li>
              <strong>Sí:</strong> la lista de <Link href="/funciones/clientes-que-regresan">clientas que ya les toca volver</Link>, para
              ofrecerles el hueco.
            </li>
            <li>
              <strong>Todavía no:</strong> cobrar el anticipo en línea. Si lo pides por transferencia, anótalo en las notas de la cita.
            </li>
          </ul>
        </Prosa>
      </section>
      <FaqLista faqs={FAQS} />
      <Relacionados
        titulo="Sigue leyendo"
        enlaces={[
          { href: '/funciones/recordatorios', nombre: 'Recordatorios de citas', texto: 'Salen solos antes de cada cita.' },
          { href: '/para/pestanas', nombre: 'bicho para pestañas', texto: 'Donde un plantón cuesta dos horas.' },
          { href: '/guias/precios-servicios-salon', nombre: 'Cómo ponerle precio a tus servicios', texto: 'La cuenta para no trabajar gratis.' },
        ]}
      />
      <Cierre titulo={<>Confirmación y recordatorio, sin que lo mandes tú</>} texto="Tu agenda en línea manda la confirmación sola, y con el plan Negocio también el recordatorio. 15 días gratis, sin tarjeta." />
    </Marco>
  );
}
