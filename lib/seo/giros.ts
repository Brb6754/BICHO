// Contenido de las páginas /para/<giro>. Cada una con su dolor, su demo y
// sus preguntas: si solo cambiara el nombre del giro, Google las trataría
// como contenido duplicado y ninguna posicionaría.
//
// Reglas de honestidad (no hay clientes de pago todavía): cero testimonios,
// cero números de tracción. Solo lo que el producto hace hoy.

import type { Faq } from './sitio';

export type Giro = {
  slug: string;
  nombre: string; // "salones de uñas"
  keyword: string;
  titulo: string;
  descripcion: string;
  h1: string;
  bajada: string;
  demo: { slug: string; nombre: string; giro: string; foto: string | null };
  dolores: { titulo: string; texto: string }[];
  solucion: { titulo: string; texto: string; funcion?: string }[];
  /** Párrafos propios del giro: el detalle que solo alguien del oficio reconoce. */
  detalle: { titulo: string; parrafos: string[] };
  faqs: Faq[];
  funciones: string[];
  guias: string[];
};

export const GIROS: Giro[] = [
  {
    slug: 'unas',
    nombre: 'salones de uñas',
    keyword: 'agenda de citas para salón de uñas',
    titulo: 'Agenda de citas para salón de uñas · bicho',
    descripcion:
      'Tus clientas apartan su cita de uñas solas, a cualquier hora, y les llega su confirmación. Agenda en línea para nail bars y manicuristas en México. 15 días gratis.',
    h1: 'Agenda de citas para tu salón de uñas',
    bajada:
      'Que tus clientas aparten su juego nuevo o su relleno solas, desde el link de tu Instagram, sin esperar a que contestes entre una clienta y otra.',
    demo: { slug: 'lima-laca', nombre: 'Lima & Laca', giro: 'Nail bar', foto: '/demo/lima-laca.webp' },
    dolores: [
      {
        titulo: 'Contestas con las uñas a medio limar',
        texto:
          'Estás con una clienta en la mesa y el celular no deja de vibrar: "¿tienes hoy a las 5?". Contestar es soltar la lima; no contestar es perder la cita.',
      },
      {
        titulo: 'Un juego de acrílico no dura lo mismo que un esmaltado',
        texto:
          'Si agendas todo "a la hora", un set nuevo con diseño se te come la siguiente cita y la clienta de las 6 termina esperando media hora.',
      },
      {
        titulo: 'La del relleno se te olvida a ti, y a ella también',
        texto:
          'Pasan tres semanas, ella no escribe, tú no te acuerdas. Ese relleno se lo hace en otro lado.',
      },
    ],
    solucion: [
      {
        titulo: 'Cada servicio con su duración real',
        texto:
          'Das de alta "Acrílicas · juego nuevo", "Relleno" o "Gel en manos" con el tiempo que de verdad te toma. La agenda solo ofrece los huecos donde cabe completo.',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Eligen con quién',
        texto:
          'Si en el salón trabajan varias, la clienta escoge a su manicurista y solo ve los horarios de ella. Nadie se encima.',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Te avisa a quién toca escribirle',
        texto:
          'Clientes que regresan te muestra quién ya pasó de sus semanas sin volver, con un mensaje listo para mandarle por WhatsApp.',
        funcion: 'clientes-que-regresan',
      },
      {
        titulo: 'Tarjeta de sellos sin papel',
        texto: 'La décima manicura gratis, sin tarjetitas que se pierden en la bolsa: la clienta guarda su tarjeta en un link.',
        funcion: 'lealtad',
      },
    ],
    detalle: {
      titulo: 'Lo que cambia en un salón de uñas',
      parrafos: [
        'En uñas, la mayoría de las citas se repiten: relleno cada dos o tres semanas, retiro, cambio de diseño. Por eso lo que más dinero deja no es la clienta nueva, es que la de siempre no se vaya con otra. bicho guarda el historial de cada clienta y te dice quién ya debería haber vuelto.',
        'También importa el tiempo. Un manicure clásico y un set de acrílico con diseño no pueden ocupar el mismo bloque de una hora. Como cada servicio lleva su duración, tu agenda deja de tener citas encimadas y huecos muertos de 20 minutos que nadie puede usar.',
        'Y si vendes esmaltes, removedor o aceites, Inventario te avisa cuando se están acabando antes de quedarte sin el tono que todas piden.',
      ],
    },
    faqs: [
      {
        q: '¿Mis clientas tienen que descargar una app para agendar?',
        a: 'No. Entran a un link (por ejemplo tusalon.bichomx.com), eligen servicio, día y hora, y listo. Funciona en cualquier celular, sin cuenta ni contraseña.',
      },
      {
        q: '¿Puedo poner el link en mi Instagram?',
        a: 'Sí, es lo más común: lo pegas en tu biografía o en tus historias destacadas. También lo puedes mandar por WhatsApp cuando alguien te pregunte por horarios.',
      },
      {
        q: '¿Qué pasa si una clienta quiere cambiar su cita?',
        a: 'En su confirmación viene un link para reagendar o cancelar ella misma. Tú ves el cambio en tu agenda al momento, sin mensajes de ida y vuelta.',
      },
      {
        q: 'Trabajo sola, ¿me sirve?',
        a: 'Sí. Con una sola persona la clienta no tiene que elegir con quién; solo escoge servicio y hora. El plan Esencial cuesta $299 al mes.',
      },
    ],
    funciones: ['reservas-en-linea', 'clientes-que-regresan', 'lealtad', 'inventario'],
    guias: ['como-reducir-citas-que-no-llegan', 'precios-servicios-salon'],
  },
  {
    slug: 'pestanas',
    nombre: 'estudios de pestañas y cejas',
    keyword: 'agenda para lash studio',
    titulo: 'Agenda de citas para pestañas y cejas · bicho',
    descripcion:
      'Agenda en línea para lash studios y diseño de cejas: tus clientas reservan su aplicación o retoque solas y tú dejas de contestar "¿a qué hora tienes?". 15 días gratis.',
    h1: 'Agenda para tu estudio de pestañas y cejas',
    bajada:
      'Una aplicación de pestañas te tiene dos horas con los ojos de la clienta cerrados y las manos ocupadas. Que la agenda conteste por ti mientras trabajas.',
    demo: { slug: 'casa-luma', nombre: 'Casa Luma', giro: 'Salón de belleza', foto: '/demo/casa-luma.webp' },
    dolores: [
      {
        titulo: 'No puedes soltar las pinzas para contestar',
        texto:
          'Una aplicación clásica o de volumen no se pausa para revisar el WhatsApp. Cuando por fin contestas, la clienta ya agendó en otro lado.',
      },
      {
        titulo: 'El retoque tiene fecha, y nadie la apunta',
        texto:
          'Si el retoque pasa de su tiempo ya no es retoque: se cae media pestaña y termina siendo aplicación completa, o peor, la clienta no vuelve.',
      },
      {
        titulo: 'Dos horas vacías por una que no llegó',
        texto:
          'Un plantón en pestañas no es una hora perdida: es el bloque más largo de tu día, sin forma de llenarlo a última hora.',
      },
    ],
    solucion: [
      {
        titulo: 'Bloques largos bien acomodados',
        texto:
          'Aplicación, volumen, retoque, lifting o laminado de cejas: cada uno con su duración, así la agenda nunca ofrece un hueco donde no cabe.',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Recordatorio el día antes',
        texto:
          'Con el plan Negocio sale un recordatorio automático antes de la cita, para que la clienta confirme o reagende a tiempo y no te deje el bloque vacío.',
        funcion: 'recordatorios',
      },
      {
        titulo: 'Sabes a quién le toca su retoque',
        texto: 'Clientes que regresan te muestra quién ya pasó de sus semanas sin volver, para escribirle antes de que se le caigan.',
        funcion: 'clientes-que-regresan',
      },
    ],
    detalle: {
      titulo: 'Lo que cambia en un estudio de pestañas',
      parrafos: [
        'En pestañas el negocio vive del retoque. La aplicación completa trae a la clienta; el retoque cada dos o tres semanas es lo que hace que el mes cierre. Por eso conviene que cada clienta tenga su ficha con la fecha de su última cita y lo que se hizo.',
        'Como los servicios son largos, cada cita que no llega pesa el doble. Un recordatorio un día antes, con un link para reagendar ella misma, te da tiempo de ofrecer ese espacio a otra persona en lugar de enterarte cuando ya pasó la hora.',
        'Si cobras anticipo por transferencia, anótalo en las notas de la cita. bicho todavía no cobra anticipos por ti; preferimos decirlo claro a prometerlo.',
      ],
    },
    faqs: [
      {
        q: '¿Puedo pedir que confirmen su cita?',
        a: 'La clienta recibe su confirmación al agendar, con un link para cambiar o cancelar. Con el plan Negocio, además le llega un recordatorio automático antes de la cita.',
      },
      {
        q: '¿Puedo separar aplicación y retoque con precios distintos?',
        a: 'Sí. Cada servicio tiene su nombre, precio y duración. Puedes tener "Clásicas", "Volumen", "Retoque 2 semanas" y "Lifting" por separado.',
      },
      {
        q: '¿Y si no sé de tecnología?',
        a: 'El alta se hace desde el celular en unos 10 minutos: nombre del negocio, servicios y horario. Si te atoras, nos escribes y te ayuda una persona, no un bot.',
      },
    ],
    funciones: ['reservas-en-linea', 'recordatorios', 'clientes-que-regresan', 'caja'],
    guias: ['como-reducir-citas-que-no-llegan', 'precios-servicios-salon'],
  },
  {
    slug: 'barberias',
    nombre: 'barberías',
    keyword: 'app para agendar citas barbería',
    titulo: 'App para agendar citas en tu barbería · bicho',
    descripcion:
      'Tus clientes apartan su corte con el barbero que quieren, sin llamar ni esperar turno. Agenda en línea, caja y comisiones por barbero. 15 días gratis, sin tarjeta.',
    h1: 'App para agendar citas en tu barbería',
    bajada:
      'Que el cliente elija a su barbero y su hora desde el celular, y que tú sepas al final del día cuánto le toca a cada quien sin sacar la calculadora.',
    demo: { slug: 'don-ramon', nombre: 'Barbería Don Ramón', giro: 'Barbería', foto: '/demo/don-ramon.webp' },
    dolores: [
      {
        titulo: 'El cliente quiere a su barbero, no a cualquiera',
        texto:
          'Si llega y su barbero está ocupado, espera 40 minutos en la banca o se va. Ninguna de las dos es buena para la barbería.',
      },
      {
        titulo: 'Las comisiones se hacen en una libreta',
        texto:
          'Al cerrar, alguien suma a mano los cortes de cada barbero y saca su porcentaje. Un error ahí es una discusión el sábado en la noche.',
      },
      {
        titulo: 'El corte cada tres semanas que nadie agenda',
        texto: 'El cliente fijo se corta cada tres o cuatro semanas. Si nadie se lo recuerda, un día pasa por otra barbería que le quedó de camino.',
      },
    ],
    solucion: [
      {
        titulo: 'Agenda por barbero',
        texto: 'Cada barbero con su horario. El cliente elige con quién y solo ve los huecos libres de esa persona.',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Comisiones calculadas solas',
        texto: 'Le pones su porcentaje a cada barbero y Comisiones te dice cuánto vendió y cuánto le toca, y marcas cuándo le pagaste.',
        funcion: 'comisiones',
      },
      {
        titulo: 'Corte de caja del día',
        texto: 'Cuánto entró en efectivo, cuánto en tarjeta y cuánto debería haber en el cajón.',
        funcion: 'caja',
      },
    ],
    detalle: {
      titulo: 'Lo que cambia en una barbería',
      parrafos: [
        'En una barbería con varios sillones, el problema no es tanto llenar la agenda como repartirla bien. Con agenda por barbero, el cliente aparta con quien siempre se corta y el que está libre recibe a los que llegan sin cita.',
        'Lo segundo es el dinero. Comisiones toma lo que cada barbero vendió y le aplica su porcentaje, así el pago de la semana deja de depender de una libreta. Caja hace el corte del día con lo cobrado en efectivo y lo que llegó por tarjeta o transferencia.',
        'Y si también vendes pomadas, cera o shampoo, Inventario te avisa cuando quedan pocos.',
      ],
    },
    faqs: [
      {
        q: '¿Puedo seguir atendiendo a los que llegan sin cita?',
        a: 'Sí. La agenda en línea convive con el walk-in: tú puedes agregar citas a mano desde el panel y los huecos libres siguen disponibles para quien llegue.',
      },
      {
        q: '¿Cuánto cuesta con comisiones por barbero?',
        a: 'Comisiones, Caja, Inventario y Lealtad vienen en el plan Negocio, de $499 MXN al mes. Los primeros 15 días son gratis y no piden tarjeta.',
      },
      {
        q: '¿Los barberos pueden ver su agenda?',
        a: 'Cada cita lleva el nombre del barbero que la atiende, y tú ves las de todos desde tu panel, en el celular o en la computadora.',
      },
    ],
    funciones: ['reservas-en-linea', 'comisiones', 'caja', 'inventario'],
    guias: ['precios-servicios-salon', 'resico-para-salones'],
  },
  {
    slug: 'spa',
    nombre: 'spas',
    keyword: 'sistema de citas spa',
    titulo: 'Sistema de citas para spa · bicho',
    descripcion:
      'Reservas en línea para spas y centros de masaje: cabinas, terapeutas y paquetes con su duración real. Tus clientes reservan solos y reciben su confirmación. 15 días gratis.',
    h1: 'Sistema de citas para tu spa',
    bajada:
      'Que la persona que quiere un masaje un domingo a las 10 de la noche pueda apartarlo en ese momento, sin esperar a que abras el lunes para contestarle.',
    demo: { slug: 'agua-serena', nombre: 'Agua Serena', giro: 'Spa', foto: '/demo/agua-serena.webp' },
    dolores: [
      {
        titulo: 'La gente decide de noche y tú contestas de día',
        texto:
          'El regalo de cumpleaños o el "necesito un masaje" se decide en la noche. Si la respuesta llega a la mañana siguiente, la emoción ya se enfrió.',
      },
      {
        titulo: 'Cabinas y terapeutas no cuadran en una libreta',
        texto:
          'Tienes dos cabinas y tres terapeutas, y un masaje en pareja ocupa ambas. Acomodar eso a mano es la receta de una cabina doble reservada dos veces.',
      },
      {
        titulo: 'El silencio de la cabina contra el celular',
        texto: 'Un spa vende calma. Una terapeuta contestando mensajes entre sesiones no la transmite.',
      },
    ],
    solucion: [
      {
        titulo: 'Reserva a cualquier hora',
        texto: 'La página de citas está abierta 24/7. La persona elige el masaje, el día y la hora, y le llega su confirmación al instante.',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Sin dos citas en la misma cabina',
        texto:
          'Cada cabina o terapeuta tiene su agenda. La doble reserva se bloquea desde la base de datos, no depende de que alguien se fije.',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Clientes que vuelven',
        texto: 'Lealtad con tarjeta de sellos y promociones, y una lista de quién no ha vuelto para invitarle de nuevo.',
        funcion: 'lealtad',
      },
    ],
    detalle: {
      titulo: 'Lo que cambia en un spa',
      parrafos: [
        'En un spa, la reserva es parte de la experiencia. Una página con tus fotos, tus tratamientos y precios claros dice más de tu lugar que un "mándame mensaje para informes". bicho arma esa página con tu logo y tus colores.',
        'Los tratamientos largos (un ritual de 90 minutos, un paquete con facial y masaje) necesitan duraciones exactas para que la agenda no ofrezca huecos imposibles. Cada servicio lleva la suya.',
        'Y como mucha gente llega por regalo, conviene que el lugar se vea serio al primer vistazo: confirmación por correo, link para reagendar y una dirección clara de cómo llegar.',
      ],
    },
    faqs: [
      {
        q: '¿Puedo mostrar fotos de mis cabinas y tratamientos?',
        a: 'Sí. Tu página lleva portada con foto, tu logo, tus colores, la lista de servicios con descripción y precio, horario y ubicación.',
      },
      {
        q: '¿Necesito página web aparte?',
        a: 'No. Tu página de citas ya funciona como tu página: tiene tu dirección propia (tuspa.bichomx.com), tus servicios y el botón para reservar.',
      },
      {
        q: '¿Puedo ocultar el precio de algunos tratamientos?',
        a: 'Sí, cada servicio puede mostrar su precio o no. "Gratis" y "precio a consultar" son cosas distintas y bicho las trata distinto.',
      },
    ],
    funciones: ['reservas-en-linea', 'lealtad', 'recordatorios', 'caja'],
    guias: ['como-reducir-citas-que-no-llegan', 'precios-servicios-salon'],
  },
  {
    slug: 'esteticas',
    nombre: 'estéticas y salones de belleza',
    keyword: 'agenda para estética',
    titulo: 'Agenda en línea para estéticas y salones de belleza · bicho',
    descripcion:
      'Agenda de citas para estéticas y salones de belleza en México: corte, color, peinado y tratamientos con su duración y su estilista. Caja, inventario y comisiones. 15 días gratis.',
    h1: 'Agenda en línea para tu estética',
    bajada:
      'Corte, tinte, mechas, peinado: cada uno con su tiempo y su estilista. Que la agenda se acomode sola y que tú dejes la libreta en el cajón.',
    demo: { slug: 'casa-luma', nombre: 'Casa Luma', giro: 'Salón de belleza', foto: '/demo/casa-luma.webp' },
    dolores: [
      {
        titulo: 'La libreta que solo entiende una persona',
        texto:
          'Si la recepcionista falta, nadie sabe qué citas hay ni de quién es esa letra. Y si se moja o se pierde, se va la agenda del mes.',
      },
      {
        titulo: 'Un tinte se encima con el siguiente corte',
        texto:
          'Un color con mechas puede llevar tres horas. Si se agenda como "una cita", la estilista termina con dos clientas al mismo tiempo.',
      },
      {
        titulo: 'No sabes cuánto ganaste hasta fin de mes',
        texto: 'Entre efectivo, tarjeta, lo que se le paga a cada estilista y los productos, el número real del día queda en el aire.',
      },
    ],
    solucion: [
      {
        titulo: 'Agenda por estilista y por servicio',
        texto: 'Cada servicio con su duración y cada estilista con su horario. La clienta aparta con quien quiere en un hueco donde sí cabe.',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Caja y comisiones del día',
        texto: 'Cuánto vendiste, cuánto gastaste y cuánto le toca a cada estilista, sin hoja de cálculo.',
        funcion: 'caja',
      },
      {
        titulo: 'Inventario de tintes y productos',
        texto: 'Sabes qué tienes y te avisa cuando un tono o un tratamiento se está acabando.',
        funcion: 'inventario',
      },
    ],
    detalle: {
      titulo: 'Lo que cambia en una estética',
      parrafos: [
        'Una estética con dos o tres sillas ya es un pequeño negocio con nómina. Lo que más se complica no es atender, es administrar: quién atendió a quién, cuánto se cobró y cuánto se le debe a cada estilista. bicho junta la agenda con la caja y las comisiones para que el número salga solo.',
        'La agenda también deja de depender de una persona. Cualquiera con acceso al panel ve las citas del día desde su celular, y la clienta puede cambiar su cita sin llamar.',
        'Si estás pensando en formalizarte, el plan incluye la guía RESICO con una calculadora del ISR mensual para que sepas cuánto te tocaría pagar.',
      ],
    },
    faqs: [
      {
        q: '¿Puedo pasar mis clientas de la libreta a bicho?',
        a: 'Cada vez que alguien agenda se crea su ficha sola, con su historial de citas. Las citas que te piden por teléfono las puedes capturar tú desde la agenda, y así la clienta queda registrada igual.',
      },
      {
        q: '¿Qué plan me conviene para una estética con varias estilistas?',
        a: 'Si solo quieres la agenda en línea, Esencial ($299 al mes). Si además quieres caja, comisiones, inventario y lealtad, Negocio ($499 al mes).',
      },
      {
        q: '¿Puedo cancelar cuando quiera?',
        a: 'Sí, no hay contrato ni plazo forzoso. Nos mandas un mensaje y se cancela; tu página deja de recibir citas nuevas.',
      },
    ],
    funciones: ['reservas-en-linea', 'caja', 'comisiones', 'inventario'],
    guias: ['precios-servicios-salon', 'resico-para-salones'],
  },
  {
    slug: 'estetica-canina',
    nombre: 'estéticas caninas',
    keyword: 'agenda para estética canina',
    titulo: 'Agenda de citas para estética canina · bicho',
    descripcion:
      'Agenda en línea para estéticas caninas y grooming: los dueños apartan baño y corte por tamaño de perro, y tú sabes cuánto tiempo te va a llevar cada uno. 15 días gratis.',
    h1: 'Agenda de citas para tu estética canina',
    bajada:
      'No es lo mismo bañar a un chihuahua que a un husky. Que los dueños aparten el servicio correcto y que tu día no se desacomode a la tercera mascota.',
    demo: { slug: 'burbujas-bigotes', nombre: 'Burbujas & Bigotes', giro: 'Estética canina', foto: null },
    dolores: [
      {
        titulo: 'El tamaño del perro cambia todo el día',
        texto:
          'Si agendas por hora sin saber el tamaño, un perro grande de pelo doble te desacomoda todas las citas de la tarde.',
      },
      {
        titulo: 'Los dueños preguntan lo mismo todo el día',
        texto: '"¿Cuánto cuesta el baño?", "¿tienes hoy?", "¿a qué hora lo recojo?". Cada pregunta es un rato con las manos mojadas lejos del celular.',
      },
      {
        titulo: 'El baño mensual que nadie agenda',
        texto: 'El perro necesita baño cada mes, pero el dueño no lo apunta. Si no le escribes tú, se le pasa.',
      },
    ],
    solucion: [
      {
        titulo: 'Servicios por tamaño',
        texto: 'Das de alta "Baño perro chico", "Baño y corte perro grande" con su precio y su duración. El dueño elige el que corresponde y la agenda calcula el tiempo.',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Precios a la vista',
        texto: 'Tu página muestra servicios y precios antes de reservar, así dejas de contestar "¿cuánto cuesta?".',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Te recuerda a quién escribir',
        texto: 'Clientes que regresan te muestra qué dueños ya pasaron de su tiempo sin volver, con un mensaje listo para mandar.',
        funcion: 'clientes-que-regresan',
      },
    ],
    detalle: {
      titulo: 'Lo que cambia en una estética canina',
      parrafos: [
        'En grooming el tiempo depende del animal, no solo del servicio. La forma más simple de que la agenda no mienta es separar los servicios por tamaño o por tipo de pelo, cada uno con su duración. Así el dueño escoge y tú no tienes que adivinar.',
        'Las notas de la cita sirven para lo importante: si el perro es nervioso, si tiene alguna alergia o si el dueño pidió un corte específico. Quedan en la ficha del cliente para la siguiente visita.',
        'Y si vendes shampoo, premios o accesorios, Inventario te avisa cuando se están acabando.',
      ],
    },
    faqs: [
      {
        q: '¿El dueño puede dejar notas sobre su perro?',
        a: 'Sí. Al reservar puede escribir una nota (nombre del perro, raza, si es nervioso) y la ves en la cita.',
      },
      {
        q: '¿Puedo tener precios distintos por tamaño?',
        a: 'Sí. Cada servicio es independiente, con su precio y su duración: chico, mediano, grande, o como tú los organices.',
      },
      {
        q: '¿Necesito página web?',
        a: 'No. Tu página de citas tiene tu dirección propia, tus servicios, horario y ubicación. La compartes en Facebook, Instagram o WhatsApp.',
      },
    ],
    funciones: ['reservas-en-linea', 'clientes-que-regresan', 'inventario', 'caja'],
    guias: ['como-reducir-citas-que-no-llegan', 'precios-servicios-salon'],
  },
  {
    slug: 'consultorios',
    nombre: 'consultorios',
    keyword: 'agenda de citas para consultorio',
    titulo: 'Agenda de citas en línea para consultorio · bicho',
    descripcion:
      'Agenda en línea para consultorios médicos, dentales y de nutrición en México: tus pacientes reservan solos y tú dejas de contestar mensajes a las 11 de la noche. 15 días gratis.',
    h1: 'Agenda de citas en línea para tu consultorio',
    bajada:
      'Que el paciente aparte su consulta desde el celular, a la hora que le acomode, y que tu teléfono deje de ser la recepción después de las 8 de la noche.',
    demo: { slug: 'dental-nova', nombre: 'Dental Nova', giro: 'Dentista', foto: '/demo/dental-nova.webp' },
    dolores: [
      {
        titulo: 'Contestas pacientes en la cena',
        texto: 'Si no hay recepción, el WhatsApp del consultorio es tu WhatsApp. Y los pacientes escriben cuando pueden, no cuando abres.',
      },
      {
        titulo: 'La primera consulta no dura lo mismo que una revisión',
        texto: 'Una valoración inicial, una limpieza y un seguimiento tienen tiempos distintos. Agendar todo igual retrasa a todos los que siguen.',
      },
      {
        titulo: 'El paciente que no llega y no avisa',
        texto: 'Un espacio de consulta vacío no se recupera. Y muchas veces el paciente simplemente olvidó la fecha.',
      },
    ],
    solucion: [
      {
        titulo: 'Tipos de consulta con su duración',
        texto: 'Primera vez, seguimiento, limpieza: cada uno con su tiempo. El paciente elige y la agenda ofrece solo huecos donde cabe.',
        funcion: 'reservas-en-linea',
      },
      {
        titulo: 'Recordatorio antes de la cita',
        texto: 'Con el plan Negocio, el paciente recibe un recordatorio automático y puede reagendar desde su link si no va a llegar.',
        funcion: 'recordatorios',
      },
      {
        titulo: 'Factura cuando el paciente la pide',
        texto: 'Con el plan Pro puedes emitir CFDI 4.0 desde bicho, con tu propio sello digital.',
        funcion: 'facturacion',
      },
    ],
    detalle: {
      titulo: 'Lo que cambia en un consultorio',
      parrafos: [
        'En un consultorio pequeño el doctor suele ser también la recepción. Una página de citas no reemplaza la consulta, pero sí quita la parte que no necesita al doctor: decir qué horarios hay y apartar uno.',
        'Los datos de tus pacientes se guardan aislados por negocio en la base de datos; ningún otro consultorio ni otro negocio puede verlos. bicho no es un expediente clínico: es tu agenda y tu lista de pacientes con sus citas.',
        'Si tus pacientes piden factura, el plan Pro incluye facturación CFDI 4.0 con 100 timbres al mes. Para emitirlas necesitas tu RFC y tu sello digital (CSD) del SAT.',
      ],
    },
    faqs: [
      {
        q: '¿Sirve para dentistas, nutriólogos y psicólogos?',
        a: 'Sí. Funciona para cualquier consulta con cita: das de alta tus tipos de consulta con su duración y tu horario.',
      },
      {
        q: '¿Es un expediente clínico?',
        a: 'No. bicho maneja agenda, pacientes y sus citas, pero no historias clínicas. Para eso sigue usando tu expediente.',
      },
      {
        q: '¿Puedo facturar mis consultas?',
        a: 'Con el plan Pro ($799 al mes) puedes emitir CFDI 4.0, con 100 timbres al mes. Necesitas tu RFC y tu sello digital del SAT.',
      },
      {
        q: '¿Mis pacientes tienen que crear una cuenta?',
        a: 'No. Eligen consulta, día y hora y dejan su nombre y teléfono. Les llega su confirmación con un link para cambiar o cancelar.',
      },
    ],
    funciones: ['reservas-en-linea', 'recordatorios', 'facturacion', 'reuniones'],
    guias: ['como-reducir-citas-que-no-llegan', 'resico-para-salones'],
  },
];

export function giroPorSlug(slug: string): Giro | undefined {
  return GIROS.find((g) => g.slug === slug);
}
