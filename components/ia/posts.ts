// The campaign's content, as data. One object per post — publishing the
// next one is adding an entry here, not writing another page.
//
// Why the body lives here instead of in MDX or a CMS: there are five
// posts. A CMS for five posts is a second product to maintain, and MDX
// would mean every post can invent its own layout, which is exactly how
// a content page stops looking like one publication. The shape below is
// the format of the series — question, what actually happens, the steps,
// the honest caveat — and every post filling the same shape is what
// makes it read as a series rather than five loose pages.
//
// The voice is Bruno's, aimed at the person who actually reads these: a
// salon owner, a clinic manager, someone who installs solar panels. No
// "LLM", no "agente", no "prompt engineering" — the vocabulary is the
// one in their day. When a technical word is unavoidable it gets
// explained in the same sentence.

export type PostBlock =
  | { kind: 'p'; text: string }
  | { kind: 'steps'; items: string[] }
  // The counterweight. Every post has exactly one, and it is not
  // decoration: a series about AI that never says "here this doesn't
  // work" is advertising, and a business owner can smell that.
  | { kind: 'honest'; title: string; text: string };

import type { SceneKey } from './Scenes';

export type Post = {
  slug: string;
  /**
   * The drawing that belongs to this post. Not a mood image: each scene
   * in Scenes.tsx is this post's own content one level more literal, so
   * someone scrolling on a phone gets it before reading a word.
   */
  scene: SceneKey;
  /** The question a business owner actually asks, in their words. */
  question: string;
  /** The answer, short enough to be the card's headline. */
  answer: string;
  /** One line under the headline on the card and at the top of the post. */
  standfirst: string;
  /** Which of bicho's four areas this post belongs to. */
  area: 'operación' | 'ventas' | 'marketing' | 'datos';
  /** Honest reading time. Counted from the body, not rounded up to look substantial. */
  minutes: number;
  body: PostBlock[];
};

export const POSTS: Post[] = [
  {
    slug: 'whatsapp-preguntas-repetidas',
    scene: 'repeated',
    question: '¿Cómo contesto el WhatsApp sin estar pegado al teléfono?',
    answer: 'Empieza por las diez preguntas que más te hacen',
    standfirst:
      'No necesitas un robot que conteste todo. Necesitas que deje de interrumpirte lo que ya contestaste mil veces.',
    area: 'operación',
    minutes: 4,
    body: [
      {
        kind: 'p',
        text: 'Casi todos los negocios que atendemos tienen el mismo problema y casi nadie lo nombra así: el teléfono no suena por citas, suena por preguntas. Horarios, dirección, si aceptan tarjeta, cuánto cuesta. Son las mismas diez, todo el día, y cada una te saca de lo que estabas haciendo.',
      },
      {
        kind: 'p',
        text: 'La respuesta que se vende es «pon un chatbot». La que funciona es más chica: escribe tus diez preguntas y sus diez respuestas, y deja que la herramienta conteste solo esas. Lo que no esté en la lista se lo pasa a una persona.',
      },
      {
        kind: 'steps',
        items: [
          'Abre tu WhatsApp y lee los últimos cincuenta mensajes que te llegaron. No los de tus clientes favoritos: todos.',
          'Cuenta cuántos preguntan lo mismo. Vas a encontrar que entre seis y diez preguntas cubren la mayoría.',
          'Escribe la respuesta de cada una como se la dirías a alguien en el mostrador, no como la escribiría un abogado.',
          'Configura esas respuestas en WhatsApp Business (las respuestas rápidas son gratis y ya existen) antes de pagar por nada.',
          'Deja una salida clara: «si necesitas otra cosa, escribe la palabra ASESOR». Esa palabra es la que te pasa la conversación a ti.',
        ],
      },
      {
        kind: 'p',
        text: 'Si después de un mes esas respuestas cubren la mayoría de lo que llega, ahí sí tiene sentido pagar por algo que lo haga solo. Antes no: estarías automatizando algo que todavía no sabes qué es.',
      },
      {
        kind: 'honest',
        title: 'Dónde esto se siente mal',
        text: 'Un cliente molesto nota el robot en el primer mensaje y se enoja más. Si alguien escribe con una queja, la conversación tiene que llegar a una persona sin pasar por ningún menú. Eso no se automatiza.',
      },
    ],
  },
  {
    slug: 'cotizar-con-una-foto',
    scene: 'receipt',
    question: '¿Puedo cotizar con una foto en vez de pedir datos?',
    answer: 'Sí, y baja muchísimo la fricción',
    standfirst:
      'Cada campo que le pides a alguien antes de darle un número es gente que se va. Una foto es un solo paso.',
    area: 'ventas',
    minutes: 5,
    body: [
      {
        kind: 'p',
        text: 'Lo probamos en un negocio de paneles solares. El formulario de siempre pedía consumo, tarifa, metros de techo y teléfono. Nadie sabe su tarifa de memoria. El formulario se convirtió en: manda una foto de tu recibo de CFE.',
      },
      {
        kind: 'p',
        text: 'La herramienta lee el recibo, saca el consumo y la tarifa, y devuelve un estimado. La persona no llenó nada. El negocio recibió el dato que necesitaba y un teléfono al que llamar.',
      },
      {
        kind: 'p',
        text: 'Esto sirve para cualquier giro donde el cliente tiene un papel que tú sabes leer y él no: un recibo, una receta, una lista de precios de la competencia, la placa de un equipo que hay que reparar.',
      },
      {
        kind: 'steps',
        items: [
          'Identifica el papel. ¿Qué documento tiene tu cliente que contiene la información que hoy le pides a mano?',
          'Decide qué tres datos necesitas de ahí. No más: cada dato extra es una forma más de equivocarse.',
          'Pide la foto y un teléfono. Nada más. El resto lo sacas tú.',
          'Enseña siempre el número como estimado, y di de dónde salió: «según tu consumo de 480 kWh». Un número sin origen no se cree.',
        ],
      },
      {
        kind: 'honest',
        title: 'Dónde esto se siente mal',
        text: 'Si el estimado sale mal, perdiste al cliente y tu reputación de paso. Revisa a mano los primeros cincuenta antes de confiar en ninguno, y nunca cierres una venta con el número automático: úsalo para abrir la conversación, no para terminarla.',
      },
    ],
  },
  {
    slug: 'contenido-de-la-semana-en-una-hora',
    scene: 'calendar',
    question: '¿Cómo saco las publicaciones de la semana sin que me coma el día?',
    answer: 'Una hora al mes, no quince minutos al día',
    standfirst:
      'El problema del contenido no es escribirlo. Es decidir qué escribir, todos los días, desde cero.',
    area: 'marketing',
    minutes: 4,
    body: [
      {
        kind: 'p',
        text: 'Quien publica todos los días desde cero termina publicando lo que se le ocurrió esa mañana, que casi nunca es lo que a su cliente le interesa. Y a las tres semanas deja de publicar.',
      },
      {
        kind: 'p',
        text: 'Lo que sí aguanta: sentarte una vez al mes con las preguntas reales de tus clientes —las mismas del primer post— y convertir cada una en una publicación. Ya tienes el tema, ya sabes que a alguien le importa, porque te lo preguntó.',
      },
      {
        kind: 'steps',
        items: [
          'Junta las preguntas del mes. Las de WhatsApp, las del mostrador, las que te hacen en el teléfono.',
          'Elige ocho. Cada una es una publicación.',
          'Escribe tú la respuesta en dos o tres renglones, como se la dirías a esa persona.',
          'Usa la herramienta para lo que de verdad ahorra tiempo: adaptar esos renglones al formato de cada red, no para inventarte el contenido.',
          'Reserva dos horas al mes para esto y trátalas como una cita con un cliente: no se mueven.',
        ],
      },
      {
        kind: 'p',
        text: 'La diferencia entre esto y «que la IA escriba mis posts» es de dónde sale la idea. Si la idea la pone la máquina, se nota, y además no dice nada que tu cliente no pudiera leer en cualquier otro lado.',
      },
      {
        kind: 'honest',
        title: 'Dónde esto se siente mal',
        text: 'Publicar todos los días texto generado sin que lo leas es la forma más rápida de que tu cuenta deje de sonar a ti. Si no te reconoces en lo que publicaste, tu cliente tampoco.',
      },
    ],
  },
  {
    slug: 'clientes-que-dejan-de-venir',
    scene: 'gap',
    question: '¿Cómo sé qué clientes están por dejarme?',
    answer: 'Ya lo sabes, está en tu agenda',
    standfirst:
      'No necesitas un modelo predictivo. Necesitas una lista que hoy nadie está mirando.',
    area: 'datos',
    minutes: 3,
    body: [
      {
        kind: 'p',
        text: 'Cuesta entre cinco y siete veces más conseguir un cliente nuevo que hacer volver a uno que ya te compró. Casi todos los negocios chicos gastan en lo primero y no hacen nada con lo segundo, no por flojera: porque la lista de quién ya no viene no existe en ningún lado.',
      },
      {
        kind: 'p',
        text: 'Si tienes la agenda de los últimos meses, esa lista se arma sola. Quién venía cada mes y lleva tres sin aparecer. Quién vino una vez y nunca regresó. Quién tiene cita la semana que entra y podrías aprovechar para ofrecerle algo más.',
      },
      {
        kind: 'steps',
        items: [
          'Saca de tu agenda a todos los que vinieron al menos dos veces.',
          'Marca a los que llevan más de tres meses sin volver y no tienen nada agendado.',
          'Esa es tu lista. Normalmente es más corta de lo que crees y vale más que cualquier campaña.',
          'Escríbeles tú, uno por uno, con su nombre y lo que se hicieron la última vez. Un mensaje masivo se nota y no funciona.',
        ],
      },
      {
        kind: 'honest',
        title: 'Dónde esto se siente mal',
        text: 'Hay clientes que no volvieron por una razón, y escribirles sin saber cuál es empeorarlo. Si alguien se fue molesto, pregúntale qué pasó antes de ofrecerle una promoción.',
      },
    ],
  },
  {
    slug: 'cuando-la-ia-no-es-la-respuesta',
    scene: 'stopped',
    question: '¿En qué NO debería meter IA?',
    answer: 'En todo lo que todavía haces a mano y no entiendes',
    standfirst:
      'Automatizar un proceso que no funciona te da el mismo proceso roto, más rápido y más caro.',
    area: 'operación',
    minutes: 3,
    body: [
      {
        kind: 'p',
        text: 'Este es el post que nos cuesta clientes y lo publicamos igual, porque es lo que le decimos a la gente en la primera llamada.',
      },
      {
        kind: 'p',
        text: 'La IA es buenísima repitiendo algo que tú ya sabes hacer bien. Es pésima decidiendo qué hay que hacer. Si tu proceso todavía no está escrito en ningún lado y vive en la cabeza de una persona, automatizarlo no lo arregla: lo congela mal y ahora nadie sabe por qué hace lo que hace.',
      },
      {
        kind: 'steps',
        items: [
          'Si no puedes explicarle el proceso a un empleado nuevo en cinco minutos, tampoco se lo puedes explicar a una máquina.',
          'Si el error le cuesta dinero o salud a tu cliente, la decisión final es de una persona. Siempre.',
          'Si lo haces tres veces al mes, no lo automatices: cuesta más mantener la automatización que hacerlo.',
          'Si el problema real es que te faltan clientes, ninguna herramienta lo resuelve. Eso es ventas.',
        ],
      },
      {
        kind: 'p',
        text: 'Lo que sí vale la pena casi siempre: lo repetitivo, lo que ya está escrito, lo que no requiere criterio y lo que hoy te quita horas sin darte nada a cambio.',
      },
      {
        kind: 'honest',
        title: 'Lo que ganamos diciendo esto',
        text: 'Preferimos no venderte algo a que nos pagues por una herramienta que vas a apagar en dos meses. Sale más barato para los dos.',
      },
    ],
  },
];

export function postBySlug(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
