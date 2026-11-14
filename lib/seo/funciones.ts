// Contenido de /funciones/<slug>: una página por herramienta, cada una con
// su búsqueda principal en español de México. El plan sale de
// lib/billing/planes.ts (planMinimoPara), nunca escrito a mano aquí.
//
// Solo lo que existe hoy en el producto. Donde hay un límite real (los
// recordatorios por WhatsApp dependen de un extra, la facturación pide tu
// sello del SAT, no hay anticipos) se dice en la propia página.

import type { Modulo } from '@/lib/billing/planes';
import type { Faq } from './sitio';

export type Funcion = {
  slug: string;
  nombre: string;
  /** null = viene en todos los planes sin interruptor (referidos, directorio). */
  modulo: Modulo | null;
  keyword: string;
  titulo: string;
  descripcion: string;
  h1: string;
  bajada: string;
  captura: { src: string; alt: string; movil?: boolean } | null;
  /** Para lo que no tiene demo público: ejemplo ilustrativo, marcado como tal. */
  ejemplo?: { titulo: string; filas: [string, string][] };
  /** Demo en vivo: slug del negocio demo + ruta (o URL absoluta del sitio). */
  demo: { slug?: string; path: string; label: string } | null;
  beneficios: { titulo: string; texto: string }[];
  pasos: string[];
  faqs: Faq[];
  relacionadas: string[];
  giros: string[];
  guias: string[];
};

export const FUNCIONES: Funcion[] = [
  {
    slug: 'reservas-en-linea',
    nombre: 'Reservas en línea',
    modulo: 'reservas',
    keyword: 'agenda de citas en línea',
    titulo: 'Agenda de citas en línea para tu negocio · bicho',
    descripcion:
      'Tu propia página de citas con tus servicios, horarios y marca. Tus clientes reservan solos, a cualquier hora, sin descargar nada. Prueba 15 días gratis, sin tarjeta.',
    h1: 'Agenda de citas en línea',
    bajada:
      'Una página con tu nombre donde tus clientes ven los horarios que de verdad tienes libres y apartan el suyo, aunque sean las 11 de la noche y tú estés dormida.',
    captura: { src: '/capturas/reserva-movil.png', alt: 'Página de reservas del nail bar Lima & Laca vista en un celular', movil: true },
    demo: { slug: 'lima-laca', path: '/', label: 'Reserva en el demo de Lima & Laca' },
    beneficios: [
      { titulo: 'Abierta las 24 horas', texto: 'La gente decide cuándo cortarse el pelo o hacerse las uñas fuera de tu horario. La página aparta la cita aunque no contestes.' },
      { titulo: 'Sin citas encimadas', texto: 'Cada servicio con su duración real y cada persona con su horario. Dos reservas a la misma hora con la misma persona se bloquean desde la base de datos.' },
      { titulo: 'Tu marca, no la nuestra', texto: 'Tu logo, tus colores, tu foto de portada y tu dirección propia: tunegocio.bichomx.com. Ni anuncios ni otros negocios al lado.' },
    ],
    pasos: [
      'Das de alta tus servicios con precio y duración, y tu horario.',
      'Compartes tu link en Instagram, Facebook o WhatsApp.',
      'Tu cliente elige servicio, día y hora, y le llega su confirmación con un link para cambiar o cancelar.',
    ],
    faqs: [
      { q: '¿La agenda en línea es gratis?', a: 'Los primeros 15 días son gratis y no piden tarjeta. Después, el plan Esencial con la agenda en línea cuesta $299 MXN al mes.' },
      { q: '¿Mis clientes tienen que descargar una app?', a: 'No. Es una página web: abren el link desde cualquier celular, eligen y reservan. Sin cuenta ni contraseña.' },
      { q: '¿Puedo seguir agendando a mano las citas que me piden por teléfono?', a: 'Sí. Desde tu agenda capturas la cita y el horario se bloquea para que nadie más lo tome en línea.' },
      { q: '¿Necesito página web?', a: 'No. Tu página de citas ya tiene portada, servicios, horario, ubicación y el botón para reservar.' },
    ],
    relacionadas: ['recordatorios', 'clientes-que-regresan', 'directorio'],
    giros: ['unas', 'barberias', 'consultorios'],
    guias: ['como-reducir-citas-que-no-llegan'],
  },
  {
    slug: 'recordatorios',
    nombre: 'Recordatorios de citas',
    modulo: 'regresan',
    keyword: 'recordatorios de citas por WhatsApp',
    titulo: 'Recordatorios automáticos de citas · bicho',
    descripcion:
      'Recordatorio automático antes de cada cita, por correo o por WhatsApp, con link para reagendar. Menos clientes que no llegan. Incluido en el plan Negocio.',
    h1: 'Recordatorios de citas automáticos',
    bajada:
      'La mayoría de las citas que no llegan no son mala fe: se les olvidó. Un recordatorio a tiempo, con un link para cambiar la hora, convierte el plantón en un aviso.',
    captura: { src: '/capturas/agenda.png', alt: 'Agenda del panel de Lima & Laca con las citas del día' },
    demo: { slug: 'lima-laca', path: '/panel/regresan', label: 'Ver el panel de recordatorios' },
    beneficios: [
      { titulo: 'Sale solo', texto: 'No tienes que acordarte de mandar nada. Una vez al día bicho revisa las citas que vienen y manda el recordatorio a quien le toca.' },
      { titulo: 'Con salida fácil', texto: 'El mensaje trae el link de su cita. Si no puede ir, la clienta reagenda o cancela ahí mismo y el espacio queda libre para otra persona.' },
      { titulo: 'Nunca dos veces', texto: 'Cada cita recibe un solo recordatorio, aunque algo se repita. Nadie recibe el mismo mensaje tres veces.' },
    ],
    pasos: [
      'Tu clienta agenda y deja su correo o su WhatsApp.',
      'Antes de su cita le llega el recordatorio con día, hora y servicio.',
      'Si no puede, toca el link y cambia la hora ella misma.',
    ],
    faqs: [
      { q: '¿El recordatorio llega por WhatsApp?', a: 'Por correo viene incluido en el plan Negocio. Por WhatsApp es un extra que se activa por negocio (Meta cobra cada mensaje); si te interesa, escríbenos y lo vemos contigo.' },
      { q: '¿Cuánto tiempo antes llega?', a: 'El sistema corre una vez al día y manda el recordatorio de las citas de las siguientes horas, normalmente el día anterior. Las citas agendadas hace un rato no reciben recordatorio, porque ya tienen su confirmación.' },
      { q: '¿Qué plan lo incluye?', a: 'El recordatorio automático viene con Clientes que regresan, en el plan Negocio ($499 MXN al mes). La confirmación al momento de agendar viene en todos los planes.' },
    ],
    relacionadas: ['clientes-que-regresan', 'reservas-en-linea', 'lealtad'],
    giros: ['pestanas', 'consultorios', 'spa'],
    guias: ['como-reducir-citas-que-no-llegan'],
  },
  {
    slug: 'clientes-que-regresan',
    nombre: 'Clientes que regresan',
    modulo: 'regresan',
    keyword: 'cómo hacer que los clientes regresen',
    titulo: 'Cómo hacer que tus clientes regresen · bicho',
    descripcion:
      'Una lista de quién no ha vuelto con un mensaje listo para mandar, recordatorios automáticos y a quién pedirle reseña de Google. Para salones, barberías y spas.',
    h1: 'Haz que tus clientes regresen',
    bajada:
      'Conseguir una clienta nueva cuesta anuncios y tiempo. Que la de siempre vuelva cuesta un mensaje a tiempo. bicho te dice a quién y te lo deja escrito.',
    captura: { src: '/capturas/regresan.png', alt: 'Pantalla Clientes que regresan con la lista de clientas que no han vuelto' },
    demo: { slug: 'lima-laca', path: '/panel/regresan', label: 'Ver Clientes que regresan en el demo' },
    beneficios: [
      { titulo: 'Quién no ha vuelto', texto: 'La lista de clientas cuya última cita fue hace más de las semanas que tú elijas y no tienen nada agendado.' },
      { titulo: 'El mensaje ya escrito', texto: 'Botón "Escribirle" con un mensaje que puedes editar antes de mandarlo por WhatsApp. Lo mandas tú, desde tu número.' },
      { titulo: 'Reseñas de Google', texto: 'Pegas el link de reseñas de tu negocio y te muestra a quién vino esta semana para pedírsela cuando todavía se acuerda.' },
    ],
    pasos: [
      'Eliges cada cuántas semanas quieres que te avise.',
      'Abres la lista y ves quién ya pasó de ese tiempo.',
      'Le escribes con un toque, con el mensaje ya armado.',
    ],
    faqs: [
      { q: '¿bicho manda los mensajes por mí?', a: 'Los mensajes para que vuelvan los mandas tú, desde tu WhatsApp: así suenan a ti y no a un robot. Lo automático es el recordatorio de cita.' },
      { q: '¿De dónde saca cuándo vino cada clienta?', a: 'De las citas que pasan por tu agenda en bicho. Por eso funciona mejor mientras más citas registras ahí.' },
      { q: '¿Qué plan lo incluye?', a: 'El plan Negocio, de $499 MXN al mes, junto con Caja, Lealtad, Inventario y Comisiones.' },
    ],
    relacionadas: ['lealtad', 'recordatorios', 'copiloto'],
    giros: ['unas', 'pestanas', 'estetica-canina'],
    guias: ['como-reducir-citas-que-no-llegan', 'precios-servicios-salon'],
  },
  {
    slug: 'lealtad',
    nombre: 'Tarjeta de lealtad',
    modulo: 'lealtad',
    keyword: 'tarjeta de lealtad digital',
    titulo: 'Tarjeta de lealtad digital (tarjeta de sellos) · bicho',
    descripcion:
      'La tarjeta de sellos de papel, pero digital: tus clientes guardan su tarjeta en un link y tú das sellos desde tu celular. Más promociones. Incluido en el plan Negocio.',
    h1: 'Tarjeta de lealtad digital',
    bajada:
      'La tarjetita de "a la décima, gratis" funciona, hasta que se pierde en la bolsa o se moja en la lavadora. La misma idea, en un link que no se pierde.',
    captura: { src: '/capturas/lealtad.png', alt: 'Pantalla de Lealtad con sellos para el premio y promociones' },
    demo: { slug: 'lima-laca', path: '/panel/lealtad', label: 'Ver Lealtad en el demo' },
    beneficios: [
      { titulo: 'Tú decides el premio', texto: 'Cuántos sellos se necesitan y qué se gana: un servicio gratis, un descuento, lo que te funcione.' },
      { titulo: 'La tarjeta vive en un link', texto: 'Le das su tarjeta a la clienta y la ve desde su celular, sin descargar nada. No hay plástico que imprimir.' },
      { titulo: 'Promociones con código', texto: 'Armas promociones con detalle y código opcional, y quedan registrados los canjes.' },
    ],
    pasos: [
      'Defines cuántos sellos lleva el premio.',
      'Le das tarjeta a tu cliente desde el panel y se la mandas.',
      'Cada visita le pones su sello; al completar, canjea su premio.',
    ],
    faqs: [
      { q: '¿Mis clientes necesitan una app para ver su tarjeta?', a: 'No. Su tarjeta es una página que abren desde un link, en cualquier celular.' },
      { q: '¿Puedo usar la tarjeta de sellos aunque no use la agenda?', a: 'La tarjeta se le da a un cliente registrado en bicho. Lo natural es usarla junto con la agenda, porque cada cita ya deja registrado al cliente.' },
      { q: '¿Qué plan la incluye?', a: 'El plan Negocio, de $499 MXN al mes.' },
    ],
    relacionadas: ['clientes-que-regresan', 'caja', 'referidos'],
    giros: ['unas', 'spa', 'barberias'],
    guias: ['precios-servicios-salon'],
  },
  {
    slug: 'caja',
    nombre: 'Caja',
    modulo: 'caja',
    keyword: 'control de caja para negocio pequeño',
    titulo: 'Control de caja para negocio pequeño · bicho',
    descripcion:
      'Cuánto vendiste, cuánto gastaste y cuánto te quedó, por día, semana y mes. Corte de caja con lo que debería haber en el cajón. Para salones, barberías y spas.',
    h1: 'Control de caja para tu negocio',
    bajada:
      'Al final del día, una pregunta: ¿cuánto me quedó? Sin libreta, sin Excel, y separando lo que está en el cajón de lo que llegó al banco.',
    captura: { src: '/capturas/caja.png', alt: 'Pantalla de Caja con lo vendido, lo gastado y el corte del día' },
    demo: { slug: 'lima-laca', path: '/panel/caja', label: 'Ver Caja en el demo' },
    beneficios: [
      { titulo: 'Te quedó, en grande', texto: 'Lo vendido menos lo gastado del día, la semana o el mes, comparado con el periodo anterior.' },
      { titulo: 'Corte de caja real', texto: 'Con qué abriste, cuánto cobraste y pagaste en efectivo, y cuánto debería haber en el cajón. Lo de tarjeta y transferencia va aparte.' },
      { titulo: 'Las citas cuentan solas', texto: 'Las citas cobradas se suman como venta, y los gastos los registras en un momento.' },
    ],
    pasos: [
      'Al terminar cada cita, registras cuánto y cómo te pagaron.',
      'Anotas los gastos del día cuando salen.',
      'Al cerrar, ves el corte y cuánto debería haber en el cajón.',
    ],
    faqs: [
      { q: '¿Sirve como punto de venta con ticket?', a: 'No es una terminal ni imprime tickets. Es el registro de lo que entró y salió, para que sepas cuánto ganaste y cuadres el cajón.' },
      { q: '¿Me ayuda con los impuestos?', a: 'Caja te da tus ventas del mes, y la guía RESICO puede tomarlas para estimar tu ISR. Es informativo, no reemplaza a un contador.' },
      { q: '¿Qué plan la incluye?', a: 'El plan Negocio, de $499 MXN al mes.' },
    ],
    relacionadas: ['comisiones', 'inventario', 'guia-resico'],
    giros: ['barberias', 'esteticas', 'spa'],
    guias: ['resico-para-salones', 'precios-servicios-salon'],
  },
  {
    slug: 'inventario',
    nombre: 'Inventario',
    modulo: 'inventario',
    keyword: 'control de inventario para salón de belleza',
    titulo: 'Control de inventario para salón de belleza · bicho',
    descripcion:
      'Qué productos tienes y cuáles se están acabando: tintes, esmaltes, shampoo, cera. Aviso cuando quedan pocos y registro de movimientos. Incluido en el plan Negocio.',
    h1: 'Control de inventario para tu salón',
    bajada:
      'Enterarte de que se acabó el tinte cuando la clienta ya está en la silla es el peor momento. Que el sistema te avise antes.',
    captura: { src: '/capturas/inventario.png', alt: 'Pantalla de Inventario con productos y aviso de existencias bajas' },
    demo: { slug: 'lima-laca', path: '/panel/inventario', label: 'Ver Inventario en el demo' },
    beneficios: [
      { titulo: 'Aviso antes de que se acabe', texto: 'A cada producto le pones a partir de cuántas piezas quieres que te avise.' },
      { titulo: 'Lo que usas y lo que vendes', texto: 'Productos de uso interno y de venta al público, con precio de venta opcional.' },
      { titulo: 'Historial de movimientos', texto: 'Entradas, salidas y ajustes quedan registrados para saber a dónde se fue cada pieza.' },
    ],
    pasos: [
      'Das de alta tus productos con cuántos tienes hoy.',
      'Registras lo que entra, lo que usas y lo que vendes.',
      'Te avisa cuando un producto llega a su mínimo.',
    ],
    faqs: [
      { q: '¿Tengo que contar todo cada semana?', a: 'No. Registras los movimientos conforme pasan y, si el conteo físico no cuadra, haces un ajuste.' },
      { q: '¿Sirve para productos que vendo en mostrador?', a: 'Sí, puedes ponerle precio de venta y registrar cuánto cobraste.' },
      { q: '¿Qué plan lo incluye?', a: 'El plan Negocio, de $499 MXN al mes.' },
    ],
    relacionadas: ['caja', 'comisiones', 'copiloto'],
    giros: ['esteticas', 'unas', 'barberias'],
    guias: ['precios-servicios-salon'],
  },
  {
    slug: 'comisiones',
    nombre: 'Comisiones',
    modulo: 'comisiones',
    keyword: 'calcular comisiones de estilistas',
    titulo: 'Calcular comisiones de estilistas y barberos · bicho',
    descripcion:
      'Cuánto vendió cada estilista o barbero y cuánto le toca según su porcentaje, y registro de lo que ya le pagaste. Sin libreta ni discusiones el sábado.',
    h1: 'Calcula las comisiones de tus estilistas',
    bajada:
      'El pago de la semana no debería depender de quién sumó mejor la libreta. Cada quien con su porcentaje, y el número sale solo de lo que atendió.',
    captura: { src: '/capturas/comisiones.png', alt: 'Pantalla de Comisiones con lo vendido y lo que le toca a cada persona' },
    demo: { slug: 'lima-laca', path: '/panel/comisiones', label: 'Ver Comisiones en el demo' },
    beneficios: [
      { titulo: 'Un porcentaje por persona', texto: 'La estilista con más antigüedad puede ganar distinto que la que va empezando.' },
      { titulo: 'Sale de las citas', texto: 'Lo vendido por cada quien se toma de las citas que atendió, no de lo que alguien recuerda.' },
      { titulo: 'Pagos marcados', texto: 'Marcas cuándo le pagaste a cada quien y queda el registro.' },
    ],
    pasos: [
      'A cada persona le asignas su porcentaje.',
      'Las citas que atiende se suman a su venta.',
      'Al cerrar el periodo, ves cuánto le toca y marcas el pago.',
    ],
    faqs: [
      { q: '¿Sirve para barberías y estéticas?', a: 'Sí, para cualquier negocio donde cada persona gana un porcentaje de lo que atiende.' },
      { q: '¿Calcula la nómina completa?', a: 'No. Calcula comisiones sobre lo vendido; sueldos fijos, IMSS y retenciones van por fuera.' },
      { q: '¿Qué plan lo incluye?', a: 'El plan Negocio, de $499 MXN al mes.' },
    ],
    relacionadas: ['caja', 'inventario', 'reservas-en-linea'],
    giros: ['barberias', 'esteticas', 'spa'],
    guias: ['precios-servicios-salon'],
  },
  {
    slug: 'cotizaciones',
    nombre: 'Cotizaciones',
    modulo: 'cotizaciones',
    keyword: 'hacer cotizaciones en línea',
    titulo: 'Hacer cotizaciones en línea con tu marca · bicho',
    descripcion:
      'Arma una cotización en un minuto con el IVA calculado. Tu cliente la ve con tu marca, la descarga en PDF y la acepta con un clic. Incluido en el plan Pro.',
    h1: 'Haz cotizaciones en línea',
    bajada:
      'Un formato de cotización en Word que se manda por WhatsApp y nadie contesta. O un link con tu marca que tu cliente abre, descarga y acepta en el momento.',
    captura: null,
    ejemplo: {
      titulo: 'Cotización · Paquete de novia',
      filas: [
        ['Peinado y maquillaje de novia', '$3,500.00'],
        ['Prueba de peinado', '$800.00'],
        ['IVA 16%', '$688.00'],
        ['Total', '$4,988.00'],
      ],
    },
    demo: null,
    beneficios: [
      { titulo: 'IVA calculado', texto: 'Agregas conceptos y cantidades; los impuestos y el total salen solos.' },
      { titulo: 'PDF con tu marca', texto: 'Tu cliente ve la cotización con tu logo y la descarga en PDF.' },
      { titulo: 'Aceptar con un clic', texto: 'Tu cliente la acepta en línea y tú ves cuáles se abrieron y siguen sin respuesta.' },
    ],
    pasos: [
      'Armas la cotización con conceptos, precios y vigencia.',
      'Le mandas el link a tu cliente.',
      'La acepta en línea; si tienes Facturación, la conviertes en factura.',
    ],
    faqs: [
      { q: '¿Sirve para eventos, como novias o XV años?', a: 'Sí. Cualquier servicio que se cotiza antes de agendar: paquetes de novia, eventos, tratamientos largos.' },
      { q: '¿El cliente necesita cuenta para aceptarla?', a: 'No. Abre el link, la revisa y la acepta.' },
      { q: '¿Qué plan la incluye?', a: 'El plan Pro, de $799 MXN al mes, junto con Reuniones, Facturación y Copiloto.' },
    ],
    relacionadas: ['facturacion', 'reuniones', 'copiloto'],
    giros: ['esteticas', 'consultorios', 'spa'],
    guias: ['precios-servicios-salon'],
  },
  {
    slug: 'reuniones',
    nombre: 'Reuniones',
    modulo: 'reuniones',
    keyword: 'agendar reuniones con clientes',
    titulo: 'Agendar reuniones con clientes en línea · bicho',
    descripcion:
      'Una página para que tus clientes agenden videollamadas, visitas o juntas contigo. Después anotas en qué quedó cada una. Incluido en el plan Pro.',
    h1: 'Agenda reuniones con tus clientes',
    bajada:
      'Para lo que no es una cita de servicio: la valoración, la visita, la junta con un proveedor. Tu cliente elige la hora y tú llegas sabiendo de qué va.',
    captura: { src: '/capturas/reuniones.png', alt: 'Página pública de reuniones de la inmobiliaria demo Casa Norte en un celular', movil: true },
    demo: { slug: 'casa-norte', path: '/', label: 'Agenda en el demo de Casa Norte' },
    beneficios: [
      { titulo: 'Videollamada, visita o en tu oficina', texto: 'Cada tipo de reunión pide solo los datos que hacen falta.' },
      { titulo: 'En qué quedó', texto: 'Después de cada reunión anotas el resultado y ves qué tan seguido cierras.' },
      { titulo: 'Junto a tus clientes', texto: 'Cada reunión queda en la ficha del cliente, al lado de sus cotizaciones.' },
    ],
    pasos: [
      'Defines tus horarios para reuniones.',
      'Compartes tu página de reuniones.',
      'Tu cliente agenda y tú registras en qué quedó.',
    ],
    faqs: [
      { q: '¿Es lo mismo que la agenda de citas?', a: 'No. Las citas son para servicios con duración y precio; las reuniones son para hablar con un cliente antes de venderle.' },
      { q: '¿Qué plan las incluye?', a: 'El plan Pro, de $799 MXN al mes.' },
    ],
    relacionadas: ['cotizaciones', 'copiloto', 'reservas-en-linea'],
    giros: ['consultorios', 'esteticas'],
    guias: [],
  },
  {
    slug: 'facturacion',
    nombre: 'Facturación CFDI 4.0',
    modulo: 'facturacion',
    keyword: 'facturación CFDI 4.0 para pequeños negocios',
    titulo: 'Facturación CFDI 4.0 para pequeños negocios · bicho',
    descripcion:
      'Emite facturas CFDI 4.0 desde la cotización que tu cliente aceptó, sin capturar dos veces. 100 timbres al mes en el plan Pro. Necesitas tu RFC y tu sello digital.',
    h1: 'Facturación CFDI 4.0 para tu negocio',
    bajada:
      'Del "sí" de tu cliente a su factura, sin volver a capturar sus datos. El timbrado lo hace un PAC autorizado por el SAT; tú solo das clic.',
    captura: null,
    ejemplo: {
      titulo: 'Factura CFDI 4.0 · ejemplo',
      filas: [
        ['Uso CFDI', 'G03 Gastos en general'],
        ['Concepto', 'Servicio de estética'],
        ['Subtotal', '$1,000.00'],
        ['IVA 16%', '$160.00'],
        ['Total', '$1,160.00'],
      ],
    },
    demo: null,
    beneficios: [
      { titulo: 'Desde la cotización', texto: 'Timbras la cotización aceptada y sale su factura con folio fiscal. El total es exactamente el que tu cliente aceptó.' },
      { titulo: '100 timbres al mes', texto: 'Incluidos en el plan Pro. Se renuevan el día 1 de cada mes.' },
      { titulo: 'Tu sello, del lado seguro', texto: 'Subes tu certificado al proveedor de timbrado; bicho no guarda tu sello digital.' },
    ],
    pasos: [
      'Das de alta tus datos fiscales y tu sello digital (CSD).',
      'Tu cliente acepta una cotización o te pide factura.',
      'Timbras y le llega su CFDI.',
    ],
    faqs: [
      { q: '¿Qué necesito para facturar?', a: 'Tu RFC, estar en un régimen que te permita facturar (como RESICO) y tu Certificado de Sello Digital (CSD), que se tramita gratis en el SAT con tu e.firma.' },
      { q: '¿Cuántas facturas puedo hacer?', a: 'El plan Pro incluye 100 timbres al mes. Si necesitas más, escríbenos y lo vemos.' },
      { q: '¿bicho me da factura de mi suscripción?', a: 'Escríbenos antes de pagar si la necesitas y lo vemos contigo.' },
    ],
    relacionadas: ['cotizaciones', 'guia-resico', 'caja'],
    giros: ['consultorios', 'esteticas'],
    guias: ['resico-para-salones'],
  },
  {
    slug: 'copiloto',
    nombre: 'Copiloto con IA',
    modulo: 'copiloto',
    keyword: 'asistente con IA para negocio',
    titulo: 'Asistente con IA para tu negocio · bicho',
    descripcion:
      'Pregúntale en español a tus propios datos: citas, clientes, cotizaciones y documentos que subas. Solo lee, nunca manda nada. 500 preguntas al mes en el plan Pro.',
    h1: 'Un asistente con IA que conoce tu negocio',
    bajada:
      'En vez de buscar en reportes, le preguntas como le preguntarías a tu encargada: "¿quién no ha vuelto este mes?". Responde con tus datos, no con generalidades de internet.',
    captura: null,
    ejemplo: {
      titulo: 'Preguntas que puedes hacerle',
      filas: [
        ['Tú', '¿Cuántas citas tuve esta semana?'],
        ['Tú', '¿Quién se quejó del precio?'],
        ['Tú', '¿Qué cotizaciones vencen esta semana?'],
        ['Tú', '¿Qué reuniones tengo mañana y con quién?'],
      ],
    },
    demo: null,
    beneficios: [
      { titulo: 'Habla con tus datos', texto: 'Consulta tus citas, clientes, cotizaciones y reuniones, y busca en las notas que has escrito.' },
      { titulo: 'Tus documentos también', texto: 'Subes tu lista de precios o tus políticas y puedes preguntarle sobre ellos.' },
      { titulo: 'Solo lee', texto: 'No puede mandar mensajes ni cambiar nada. Lo peor que puede pasar es una respuesta rara, nunca una acción.' },
    ],
    pasos: ['Abres el Copiloto en tu panel.', 'Escribes tu pregunta en español.', 'Te responde con tus datos, y puedes ver qué consultó para contestar.'],
    faqs: [
      { q: '¿Otro negocio puede ver mis datos a través del Copiloto?', a: 'No. Cada pregunta se responde consultando solo los datos de tu negocio, con los mismos permisos que tu cuenta.' },
      { q: '¿Cuántas preguntas puedo hacer?', a: 'El plan Pro incluye 500 preguntas al mes; se renuevan el día 1.' },
      { q: '¿Qué plan lo incluye?', a: 'El plan Pro, de $799 MXN al mes.' },
    ],
    relacionadas: ['clientes-que-regresan', 'cotizaciones', 'caja'],
    giros: ['esteticas', 'consultorios'],
    guias: [],
  },
  {
    slug: 'guia-resico',
    nombre: 'Guía RESICO',
    modulo: 'resico',
    keyword: 'cómo darse de alta en RESICO',
    titulo: 'Cómo darse de alta en RESICO, paso a paso · bicho',
    descripcion:
      'Checklist para formalizarte en el Régimen Simplificado de Confianza (RFC, e.firma, buzón, CSD, declaración) y calculadora del ISR mensual. Incluida gratis en todos los planes.',
    h1: 'Cómo darte de alta en RESICO',
    bajada:
      'El paso a paso para formalizar tu negocio, en lenguaje de mostrador, y una calculadora de cuánto ISR te tocaría cada mes. Viene en todos los planes.',
    captura: { src: '/capturas/resico.png', alt: 'Guía RESICO dentro del panel con el checklist de pasos' },
    demo: { slug: 'lima-laca', path: '/panel/resico', label: 'Ver la guía en el demo' },
    beneficios: [
      { titulo: 'Seis pasos con palomita', texto: 'RFC, e.firma, buzón tributario, régimen, sello digital y declaración. Marcas lo que ya hiciste.' },
      { titulo: 'Calculadora de ISR', texto: 'Escribes lo que cobraste con factura en el mes y te dice la tasa y el ISR estimado.' },
      { titulo: 'Conectada a tu Caja', texto: 'Si usas Caja, toma tus ventas del mes para precargar la calculadora.' },
    ],
    pasos: ['Lees qué es RESICO y si te toca.', 'Vas marcando cada trámite conforme lo haces.', 'Cada mes calculas tu ISR estimado.'],
    faqs: [
      { q: '¿Es asesoría fiscal?', a: 'No. Es información de referencia revisada contra la Ley del ISR y sat.gob.mx. Antes de decidir, consulta a un contador.' },
      { q: '¿La puedo ver sin registrarme?', a: 'Sí, la versión pública con la calculadora está en la guía de RESICO para salones.' },
      { q: '¿Qué plan la incluye?', a: 'Todos, desde Esencial ($299 MXN al mes).' },
    ],
    relacionadas: ['facturacion', 'caja', 'referidos'],
    giros: ['esteticas', 'barberias'],
    guias: ['resico-para-salones'],
  },
  {
    slug: 'referidos',
    nombre: 'Referidos',
    modulo: null,
    keyword: 'programa de referidos',
    titulo: 'Recomienda bicho y gana un mes gratis · bicho',
    descripcion:
      'Comparte tu link con otra dueña de negocio. Cuando haga su primer pago, tú ganas 30 días gratis. Incluido en todos los planes.',
    h1: 'Recomienda bicho y gana un mes gratis',
    bajada:
      'Si te sirve, seguro conoces a otra dueña de salón a la que también. Cuando se registra con tu link y hace su primer pago, tú ganas 30 días gratis.',
    captura: null,
    ejemplo: {
      titulo: 'Tus referidos',
      filas: [
        ['Tu link', 'bichomx.com/registro?ref=tu-negocio'],
        ['Se registró', 'En prueba'],
        ['Hizo su primer pago', '+30 días gratis para ti'],
      ],
    },
    demo: null,
    beneficios: [
      { titulo: 'Tu link es tu nombre', texto: 'El código de referido es la dirección de tu negocio. Fácil de compartir y de recordar.' },
      { titulo: 'Un mes por cada negocio', texto: 'Ganas 30 días gratis por cada negocio que haga su primer pago con tu link.' },
      { titulo: 'Lo ves en tu panel', texto: 'Quién se registró con tu link y en qué estado va.' },
    ],
    pasos: ['Copias tu link desde el panel.', 'Se lo mandas a otra dueña de negocio.', 'Cuando hace su primer pago, se suma tu mes gratis.'],
    faqs: [
      { q: '¿Tiene límite?', a: 'Ganas 30 días por cada negocio referido, una vez por negocio, cuando hace su primer pago autorizado.' },
      { q: '¿Qué plan lo incluye?', a: 'Todos los planes, sin costo extra.' },
    ],
    relacionadas: ['lealtad', 'guia-resico', 'directorio'],
    giros: ['unas', 'esteticas'],
    guias: [],
  },
  {
    slug: 'directorio',
    nombre: 'Directorio de negocios',
    modulo: null,
    keyword: 'directorio de negocios con reserva en línea',
    titulo: 'Aparece en el directorio de negocios con reserva · bicho',
    descripcion:
      'Tu negocio en el directorio de bichomx.com por ciudad y giro, para que te encuentren gente que busca dónde reservar cerca. Incluido en todos los planes.',
    h1: 'Aparece en el directorio de negocios',
    bajada:
      'Además de tu propio link, tu negocio puede aparecer en el directorio público de bicho, por ciudad y por giro, con un botón directo para reservar.',
    captura: { src: '/capturas/directorio.png', alt: 'Directorio público de negocios con reserva en línea en bichomx.com' },
    demo: { path: '/negocios', label: 'Ver el directorio' },
    beneficios: [
      { titulo: 'Por ciudad y giro', texto: 'Páginas como "Estéticas en Durango" donde alguien que busca puede encontrarte.' },
      { titulo: 'Tú decides', texto: 'Apareces solo si lo prendes en tu panel; tu dirección completa no se publica.' },
      { titulo: 'Directo a reservar', texto: 'Cada negocio lleva a su página de citas, sin intermediarios.' },
    ],
    pasos: ['Prendes "aparecer en el directorio" en tu panel.', 'Escribes tu ciudad y colonia.', 'Tu negocio aparece en su ciudad y giro.'],
    faqs: [
      { q: '¿Cuesta extra aparecer?', a: 'No, viene en todos los planes.' },
      { q: '¿Se publica mi dirección?', a: 'Solo ciudad y colonia. La dirección completa queda en tu página, si tú la pones.' },
    ],
    relacionadas: ['reservas-en-linea', 'referidos', 'clientes-que-regresan'],
    giros: ['esteticas', 'spa', 'consultorios'],
    guias: [],
  },
];

export function funcionPorSlug(slug: string): Funcion | undefined {
  return FUNCIONES.find((f) => f.slug === slug);
}
