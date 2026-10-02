// Los cinco negocios de demostración.
//
// Correr con:  node db/seed-demo-tenants.mjs
//
// Idempotente por slug: vuelve a dejar cada negocio exactamente como
// está escrito aquí. Borra y recrea sus recursos, servicios y horarios
// (y con ellos sus citas, por la cascada), así que NO se corre sobre un
// negocio real — solo sobre estos cinco slugs.
//
// Para qué existen: es lo único que Bruno tiene para enseñar el
// producto. Cada uno tiene que verse como un negocio que ya opera, no
// como una plantilla con el nombre cambiado. De ahí tres reglas:
//
//  1. CADA UNO CON SU PALETA Y SU TIPOGRAFÍA. La diferencia entre un
//     dentista y un club de pádel no es el texto: es el color, la
//     forma y la letra. La página pública ya lee esos campos por
//     negocio, así que esto no necesita una línea de CSS.
//  2. PRECIOS Y TIEMPOS REALES, en pesos y en minutos que de verdad
//     dura cada cosa. Un catálogo con "Servicio 1 · $100" delata una
//     demo más rápido que cualquier otra cosa.
//  3. HORARIOS DE VERDAD, porque sin `resource_schedules` la página
//     abre con el calendario vacío — y un producto de reservas que no
//     ofrece un solo horario no se puede enseñar.
//
// Quedan en `status: 'trial'` a propósito: el MRR del panel interno se
// calcula con los negocios ACTIVOS, y cinco demos marcadas como activas
// inventarían $1,500 al mes que nadie paga.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── helpers de bloques ───────────────────────────────────────────────
let n = 0;
const b = (type, variant, props, style = {}) => ({
  id: `${type}-${++n}`,
  type,
  variant,
  props,
  style: {
    backgroundColor: null,
    padding: 'md',
    maxWidth: 'md',
    rounded: false,
    shadow: false,
    ...style,
  },
});

const COLUMN = { maxWidth: 'sm' };
const WIDE = { maxWidth: 'lg' };
const FULL = { maxWidth: 'full' };

// La foto del local vive en /public/demo/<slug>.webp y se sirve desde
// la app, así que funciona igual en cada subdominio de negocio.
const header = (eyebrow, title, subtitle, foto = '') =>
  b('hero', 'header', { eyebrow, title, subtitle, backgroundImageUrl: foto, align: 'left', ctaText: '', ctaLink: '' }, FULL);

const booking = () => b('booking', 'default', {}, WIDE);

// Horario semanal: 1=lunes … 6=sábado, 0=domingo (igual que Postgres).
const week = (days, from, to) => days.map((d) => ({ day_of_week: d, starts_at: from, ends_at: to }));

// ── los cinco negocios ───────────────────────────────────────────────
const NEGOCIOS = [
  // ══════════════════════════════════════════════════════════════════
  // DENTISTA — el paciente elige al dentista. Limpio, clínico, azul.
  // ══════════════════════════════════════════════════════════════════
  {
    slug: 'dental-nova',
    fonts: { heading: 'outfit', body: 'inter' },
    name: 'Dental Nova',
    vertical: 'dentista',
    description: 'Odontología general y estética en Durango.',
    colors: { primary: '#10395C', secondary: '#0A2742', accent: '#2FB2C6' },
    design: {
      typeScale: 'grotesque',
      rhythm: 'balanced',
      shape: 'soft',
      imageTreatment: 'circle',
      headingFont: '',
      upperHeadings: false,
    },
    resourceLabel: 'Dentista',
    location: 'Blvd. Domingo Arrieta 1203, Nueva Vizcaya, Durango',
    resources: ['Dra. Paulina Reyes', 'Dr. Iván Sáenz'],
    services: [
      ['Consulta y diagnóstico', 30, 400],
      ['Limpieza dental', 45, 800],
      ['Resina (una pieza)', 60, 1200],
      ['Blanqueamiento', 90, 3500],
      ['Extracción simple', 45, 1500],
      ['Urgencia por dolor', 30, 600],
    ],
    schedule: [...week([1, 2, 3, 4, 5], '09:00', '19:00'), ...week([6], '09:00', '14:00')],
    blocks: () => [
      header(
        'Odontología general y estética',
        'Agenda tu consulta',
        'Elige al dentista y la hora. Te confirmamos por correo, sin llamadas.'
      , '/demo/dental-nova.webp'),
      booking(),
      b('services', 'menu', {
        heading: 'Precios de referencia',
        intro: 'La consulta de valoración incluye radiografía cuando hace falta. Si el tratamiento cambia el costo, te lo decimos antes de empezar, nunca al final.',
        items: [
          { name: 'Consulta y diagnóstico', description: 'Revisión completa y plan de tratamiento.', price: '$400', duration: '30 min' },
          { name: 'Limpieza dental', description: 'Ultrasonido y pulido.', price: '$800', duration: '45 min' },
          { name: 'Resina', description: 'Por pieza, del color de tu diente.', price: '$1,200', duration: '60 min' },
          { name: 'Blanqueamiento', description: 'En consultorio, una sesión.', price: '$3,500', duration: '90 min' },
          { name: 'Urgencia por dolor', description: 'Mismo día si hay espacio.', price: '$600', duration: '30 min' },
        ],
      }, COLUMN),
      b('team', 'roster', {
        heading: 'Quién te atiende',
        intro: 'Si es tu primera visita, cualquiera de los dos hace la valoración.',
        members: [
          { name: 'Dra. Paulina Reyes', role: 'Odontología general', photoUrl: '', note: 'Limpiezas, resinas y endodoncia.' },
          { name: 'Dr. Iván Sáenz', role: 'Estética dental', photoUrl: '', note: 'Blanqueamiento y carillas.' },
        ],
      }, COLUMN),
      b('faq', 'default', {
        heading: 'Antes de venir',
        items: [
          { question: '¿Aceptan seguro?', answer: 'Trabajamos con reembolso: te damos la factura y el desglose para que lo presentes con tu aseguradora.' },
          { question: '¿Puedo llevar a un menor?', answer: 'Sí, desde los 4 años. Agenda a su nombre y ponlo en las notas.' },
          { question: '¿Y si tengo dolor hoy?', answer: 'Reserva "Urgencia por dolor" en el primer horario libre. Si no hay, llámanos y te hacemos espacio.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Lunes a viernes: 9:00–19:00', 'Sábado: 9:00–14:00', 'Domingo: cerrado'],
      }, COLUMN),
      b('location', 'default', {
        heading: 'Dónde estamos',
        address: 'Blvd. Domingo Arrieta 1203, Nueva Vizcaya, Durango',
        mapUrl: '',
      }, COLUMN),
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // SALÓN DE BELLEZA — se elige servicio Y estilista. Cálido, rosa.
  // ══════════════════════════════════════════════════════════════════
  {
    slug: 'casa-luma',
    fonts: { heading: 'fraunces', body: 'jost' },
    name: 'Casa Luma',
    vertical: 'peluqueria',
    description: 'Color, corte y uñas en Zona Centro.',
    colors: { primary: '#46202E', secondary: '#2C1220', accent: '#E0A3B2' },
    design: {
      typeScale: 'editorial',
      rhythm: 'spacious',
      shape: 'sharp',
      imageTreatment: 'square',
      headingFont: '',
      upperHeadings: false,
    },
    resourceLabel: 'Estilista',
    location: 'Av. 20 de Noviembre 812, Zona Centro, Durango',
    resources: ['Renata Villalobos', 'Ximena Ortiz', 'Paulina Cruz'],
    services: [
      ['Corte y peinado', 60, 450],
      ['Color raíz', 90, 780],
      ['Balayage', 180, 2400],
      ['Tratamiento de reconstrucción', 45, 650],
      ['Peinado de evento', 75, 900],
      ['Manicure en gel', 45, 350],
    ],
    schedule: [...week([2, 3, 4, 5], '10:00', '20:00'), ...week([6], '09:00', '18:00')],
    blocks: () => [
      header(
        'Estudio de color y corte',
        'Reserva tu cita',
        'Elige servicio, estilista y horario. Te llega la confirmación al instante.'
      , '/demo/casa-luma.webp'),
      booking(),
      b('services', 'menu', {
        heading: 'Precios de referencia',
        intro: 'El precio final depende del largo y la densidad del pelo. Te lo confirmamos en la consulta de diez minutos, antes de tocar nada.',
        items: [
          { name: 'Corte y peinado', description: 'Consulta, lavado, corte y secado.', price: '$450', duration: '60 min' },
          { name: 'Color raíz', description: 'Retoque con tono a medida.', price: '$780', duration: '90 min' },
          { name: 'Balayage', description: 'Aclarado a mano alzada, matizado y tratamiento.', price: '$2,400', duration: '3 h' },
          { name: 'Tratamiento de reconstrucción', description: 'Para pelo con decoloración previa.', price: '$650', duration: '45 min' },
          { name: 'Peinado de evento', description: 'Recogido o suelto trabajado.', price: '$900', duration: '75 min' },
          { name: 'Manicure en gel', description: 'Retiro, limado y color.', price: '$350', duration: '45 min' },
        ],
      }, COLUMN),
      b('team', 'roster', {
        heading: 'Con quién puedes reservar',
        intro: 'Si es tu primera vez, cualquiera de las tres te hace la consulta.',
        members: [
          { name: 'Renata Villalobos', role: 'Color', photoUrl: '', note: 'Rubios y corrección de color.' },
          { name: 'Ximena Ortiz', role: 'Corte', photoUrl: '', note: 'Corte seco y pelo rizado.' },
          { name: 'Paulina Cruz', role: 'Tratamientos y uñas', photoUrl: '', note: 'Reconstrucción y manicure.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Martes a viernes: 10:00–20:00', 'Sábado: 9:00–18:00', 'Domingo y lunes: cerrado'],
      }, COLUMN),
      b('location', 'default', {
        heading: 'Dónde estamos',
        address: 'Av. 20 de Noviembre 812, Zona Centro, Durango',
        mapUrl: '',
      }, COLUMN),
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // PÁDEL — la disponibilidad ES el producto. Nada la precede.
  // ══════════════════════════════════════════════════════════════════
  {
    slug: 'alto-padel',
    fonts: { heading: 'oswald', body: 'inter' },
    name: 'Alto Pádel Club',
    vertical: 'padel',
    description: 'Cuatro pistas, dos techadas. Abierto hasta las once.',
    colors: { primary: '#0F2E4A', secondary: '#0A2033', accent: '#56D08A' },
    design: {
      typeScale: 'condensed',
      rhythm: 'compact',
      shape: 'sharp',
      imageTreatment: 'square',
      headingFont: '',
      upperHeadings: true,
    },
    resourceLabel: 'Pista',
    location: 'Camino a la Ferrería 455, Durango',
    resources: ['Pista 1 · techada', 'Pista 2 · techada', 'Pista 3', 'Pista 4'],
    services: [
      ['Pista libre', 90, 320, false],
      ['Clase particular', 60, 600],
      ['Clase en grupo', 75, 220],
      ['Iniciación', 60, 180],
    ],
    schedule: week([0, 1, 2, 3, 4, 5, 6], '07:00', '23:00'),
    blocks: () => [
      header('Club de pádel', 'Reserva pista', 'Cuatro pistas, dos techadas. Elige horario y listo.', '/demo/alto-padel.webp'),
      booking(),
      b('services', 'compact', {
        heading: 'Tarifas',
        intro: '',
        items: [
          { name: 'Pista libre (hasta 4 jugadores)', description: '', price: '$320', duration: '90 min' },
          { name: 'Clase particular', description: '', price: '$600', duration: '60 min' },
          { name: 'Clase en grupo', description: '', price: '$220', duration: '75 min' },
          { name: 'Iniciación', description: '', price: '$180', duration: '60 min' },
          { name: 'Alquiler de pala', description: '', price: '$60', duration: 'por sesión' },
        ],
      }, COLUMN),
      b('faq', 'default', {
        heading: 'Antes de jugar',
        items: [
          { question: '¿La pista se paga completa o por persona?', answer: 'Completa. El precio es el mismo si van dos o cuatro.' },
          { question: '¿Hay palas prestadas?', answer: 'De alquiler, $60 por sesión. Avísanos en las notas cuántas necesitas.' },
          { question: '¿Qué pasa si llueve?', answer: 'Las pistas 1 y 2 son techadas. Si te tocó una descubierta, te cambiamos sin costo.' },
          { question: '¿Puedo cancelar?', answer: 'Sí, desde el enlace del correo, hasta 4 horas antes.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Todos los días: 7:00–23:00', 'Última reserva: 21:30'],
      }, COLUMN),
      b('location', 'default', {
        heading: 'Cómo llegar',
        address: 'Camino a la Ferrería 455, Durango',
        mapUrl: '',
      }, COLUMN),
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // RESTAURANTE — vertical nueva. Aquí reservar no cuesta: la mesa es
  // el recurso y el "servicio" es el tamaño del grupo.
  // ══════════════════════════════════════════════════════════════════
  {
    slug: 'mesa-doce',
    fonts: { heading: 'cormorant', body: 'jost' },
    name: 'Mesa Doce',
    vertical: 'restaurante',
    description: 'Cocina de temporada. Doce mesas, dos turnos.',
    colors: { primary: '#2B1A13', secondary: '#1A0F0A', accent: '#D4A355' },
    design: {
      typeScale: 'editorial',
      rhythm: 'spacious',
      shape: 'soft',
      imageTreatment: 'arch',
      headingFont: '',
      upperHeadings: false,
    },
    resourceLabel: 'Mesa',
    location: 'Calle Negrete 904 Pte., Zona Centro, Durango',
    resources: ['Salón · mesa para 2', 'Salón · mesa para 4', 'Terraza · mesa para 4', 'Mesa grande para 6'],
    services: [
      ['Mesa para 2', 90, 0],
      ['Mesa para 4', 120, 0],
      ['Mesa para 6', 120, 0],
      ['Menú de degustación', 150, 890],
    ],
    schedule: [...week([3, 4, 5, 6], '13:30', '23:00'), ...week([0], '13:30', '18:00')],
    blocks: () => [
      header('Cocina de temporada', 'Reserva tu mesa', 'Dos turnos, comida y cena. Confirmamos al momento.', '/demo/mesa-doce.webp'),
      booking(),
      b('services', 'editorial', {
        heading: 'La carta, en corto',
        intro: 'Cambia cada mes con lo que hay en el mercado. Esto es lo que casi siempre está.',
        items: [
          { name: 'Menú de degustación', description: 'Siete tiempos. Se pide al reservar, para toda la mesa.', price: '$890', duration: '2 h 30' },
          { name: 'Entradas', description: 'Tuétano al carbón, aguachile de temporada, pan de masa madre.', price: '$120–$280', duration: '' },
          { name: 'Fuertes', description: 'Pesca del día, cordero al horno de leña, risotto de hongos.', price: '$290–$520', duration: '' },
          { name: 'Postres', description: 'Pastel de elote, helado de queso con higo.', price: '$140', duration: '' },
        ],
      }, COLUMN),
      b('faq', 'default', {
        heading: 'Antes de venir',
        items: [
          { question: '¿Cuánto tiempo tenemos la mesa?', answer: 'Hora y media para dos personas, dos horas de cuatro en adelante. Si el turno siguiente está libre, nadie te va a apurar.' },
          { question: '¿Somos más de seis?', answer: 'Reserva la mesa grande y escríbenos en las notas cuántos son. Arriba de ocho lo armamos aparte.' },
          { question: '¿Hay opciones vegetarianas?', answer: 'Siempre dos fuertes y la mitad de las entradas. El menú de degustación tiene versión vegetariana si lo avisas al reservar.' },
          { question: '¿Puedo llegar tarde?', answer: 'Guardamos la mesa 15 minutos. Pasado eso la liberamos, porque el turno siguiente ya está reservado.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Turnos',
        lines: ['Miércoles a sábado: 13:30–17:00 y 19:00–23:00', 'Domingo: solo comida, 13:30–18:00', 'Lunes y martes: cerrado'],
      }, COLUMN),
      b('location', 'default', {
        heading: 'Dónde estamos',
        address: 'Calle Negrete 904 Pte., Zona Centro, Durango',
        mapUrl: '',
      }, COLUMN),
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // SPA — la duración es la decisión; las cabinas son contadas.
  // ══════════════════════════════════════════════════════════════════
  {
    slug: 'agua-serena',
    fonts: { heading: 'cormorant', body: 'jost' },
    name: 'Agua Serena',
    vertical: 'spa',
    description: 'Tres cabinas, un tratamiento a la vez.',
    colors: { primary: '#2E3B33', secondary: '#1E2822', accent: '#A9C2A3' },
    design: {
      typeScale: 'humanist',
      rhythm: 'spacious',
      shape: 'soft',
      imageTreatment: 'arch',
      headingFont: '',
      upperHeadings: false,
    },
    resourceLabel: 'Cabina',
    location: 'Calle Constitución 218 Nte., Durango',
    resources: ['Cabina Cedro', 'Cabina Agua', 'Cabina Luna'],
    services: [
      ['Masaje profundo', 80, 1150],
      ['Ritual de la casa', 120, 1900],
      ['Facial de hidratación', 60, 980],
      ['Piernas cansadas', 50, 820],
      ['Masaje en pareja', 80, 2100],
    ],
    schedule: [...week([2, 3, 4, 5], '11:00', '20:00'), ...week([6], '10:00', '18:00')],
    blocks: () => [
      header('Casa de bienestar', 'Aparta tu tratamiento', 'Tres cabinas, un tratamiento a la vez. Elige duración y horario.', '/demo/agua-serena.webp'),
      booking(),
      b('services', 'editorial', {
        heading: 'Tratamientos',
        intro: 'Los tiempos incluyen el vapor previo y el descanso posterior — no son solo el masaje.',
        items: [
          { name: 'Masaje profundo', description: 'Presión firme en espalda alta, cuello y hombros.', price: '$1,150', duration: '80 min' },
          { name: 'Ritual de la casa', description: 'Vapor, exfoliación en seco y masaje de cuerpo completo.', price: '$1,900', duration: '2 h' },
          { name: 'Facial de hidratación', description: 'Limpieza, extracción suave y mascarilla.', price: '$980', duration: '60 min' },
          { name: 'Piernas cansadas', description: 'Drenaje ascendente. Apto en embarazo.', price: '$820', duration: '50 min' },
          { name: 'Masaje en pareja', description: 'Dos cabinas contiguas, mismo horario.', price: '$2,100', duration: '80 min' },
        ],
      }, COLUMN),
      b('faq', 'default', {
        heading: 'Antes de tu cita',
        items: [
          { question: '¿Con cuánta anticipación llego?', answer: 'Diez minutos antes es suficiente. El tiempo del tratamiento empieza cuando entras a la cabina, no cuando llegas.' },
          { question: '¿Puedo cambiar la fecha?', answer: 'Sí, desde el enlace que te llega por correo, hasta 12 horas antes.' },
          { question: '¿Hay algo que deba avisar?', answer: 'Embarazo, presión alta, cirugía reciente o alergia a algún aceite. Ponlo en las notas al reservar.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Martes a viernes: 11:00–20:00', 'Sábado: 10:00–18:00', 'Domingo y lunes: cerrado'],
      }, COLUMN),
      b('location', 'default', {
        heading: 'Ubicación',
        address: 'Calle Constitución 218 Nte., Durango',
        mapUrl: '',
      }, COLUMN),
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // GIMNASIO — se reserva una CLASE con cupo, no una persona.
  // ══════════════════════════════════════════════════════════════════
  {
    slug: 'hierro-monte',
    fonts: { heading: 'anton', body: 'inter' },
    name: 'Hierro & Monte',
    vertical: 'gimnasio',
    description: 'Fuerza, movilidad y acondicionamiento en grupos de ocho.',
    colors: { primary: '#171717', secondary: '#0A0A0A', accent: '#FF5C2B' },
    design: {
      typeScale: 'condensed',
      rhythm: 'compact',
      shape: 'sharp',
      imageTreatment: 'square',
      headingFont: '',
      upperHeadings: true,
    },
    resourceLabel: 'Sala',
    location: 'Blvd. Felipe Pescador 1140, Durango',
    resources: ['Sala de fuerza', 'Sala de movilidad'],
    services: [
      ['Fuerza (grupo de 8)', 60, 180],
      ['Acondicionamiento', 45, 150],
      ['Movilidad y core', 45, 150],
      ['Evaluación inicial', 45, 0],
    ],
    schedule: [...week([1, 2, 3, 4, 5], '06:00', '21:00'), ...week([6], '08:00', '14:00')],
    blocks: () => [
      header('Entrenamiento en grupos chicos', 'Aparta tu clase', 'Ocho personas por sala. Reservas y te guardamos el lugar.', '/demo/hierro-monte.webp'),
      booking(),
      b('services', 'compact', {
        heading: 'Clases y precios',
        intro: 'La evaluación inicial no se cobra: son 45 minutos para ver cómo te mueves antes de meterte a una clase.',
        items: [
          { name: 'Fuerza (grupo de 8)', description: '', price: '$180', duration: '60 min' },
          { name: 'Acondicionamiento', description: '', price: '$150', duration: '45 min' },
          { name: 'Movilidad y core', description: '', price: '$150', duration: '45 min' },
          { name: 'Evaluación inicial', description: '', price: 'Sin costo', duration: '45 min' },
          { name: 'Mensualidad libre', description: '', price: '$1,100', duration: 'al mes' },
        ],
      }, COLUMN),
      b('faq', 'default', {
        heading: 'Antes de tu primera clase',
        items: [
          { question: '¿Necesito experiencia?', answer: 'No. La evaluación inicial existe justo para eso, y en la clase cada quien trabaja con su propia carga.' },
          { question: '¿Qué llevo?', answer: 'Ropa cómoda y agua. Si entrenas descalzo, avísanos.' },
          { question: '¿Y si no llego?', answer: 'Cancela desde el enlace del correo hasta 2 horas antes y el lugar se libera para alguien más.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Lunes a viernes: 6:00–21:00', 'Sábado: 8:00–14:00', 'Domingo: cerrado'],
      }, COLUMN),
      b('location', 'default', { heading: 'Dónde estamos', address: 'Blvd. Felipe Pescador 1140, Durango', mapUrl: '' }, COLUMN),
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // CLÍNICA — la primera consulta no es igual que el seguimiento.
  // ══════════════════════════════════════════════════════════════════
  {
    slug: 'clinica-alameda',
    fonts: { heading: 'dmserif', body: 'inter' },
    name: 'Clínica Alameda',
    vertical: 'doctor',
    description: 'Medicina general y nutrición, con consultas de 40 minutos.',
    colors: { primary: '#1F4D3D', secondary: '#143327', accent: '#79B58C' },
    design: {
      typeScale: 'humanist',
      rhythm: 'balanced',
      shape: 'soft',
      imageTreatment: 'circle',
      headingFont: '',
      upperHeadings: false,
    },
    resourceLabel: 'Consultorio',
    location: 'Av. 5 de Febrero 405, Zona Centro, Durango',
    resources: ['Dra. Mariana Esparza · general', 'Lic. Sofía Ríos · nutrición'],
    services: [
      ['Primera consulta', 40, 700],
      ['Consulta de seguimiento', 25, 450],
      ['Consulta de nutrición', 50, 650],
      ['Certificado médico', 20, 350],
    ],
    schedule: [...week([1, 2, 3, 4, 5], '08:00', '20:00'), ...week([6], '09:00', '13:00')],
    blocks: () => [
      header('Medicina general y nutrición', 'Agenda tu consulta', 'Cuarenta minutos la primera vez. Sin sala de espera llena.', '/demo/clinica-alameda.webp'),
      booking(),
      b('services', 'menu', {
        heading: 'Consultas',
        intro: 'La primera consulta dura cuarenta minutos porque incluye historia clínica completa. El seguimiento es más corto y más barato.',
        items: [
          { name: 'Primera consulta', description: 'Historia clínica, exploración y plan.', price: '$700', duration: '40 min' },
          { name: 'Consulta de seguimiento', description: 'Revisión de estudios y ajustes.', price: '$450', duration: '25 min' },
          { name: 'Consulta de nutrición', description: 'Medición, plan de alimentación y seguimiento.', price: '$650', duration: '50 min' },
          { name: 'Certificado médico', description: 'Escolar o deportivo.', price: '$350', duration: '20 min' },
        ],
      }, COLUMN),
      b('faq', 'default', {
        heading: 'Antes de tu cita',
        items: [
          { question: '¿Qué llevo a la primera consulta?', answer: 'Estudios recientes si los tienes y la lista de medicamentos que tomas, con dosis.' },
          { question: '¿Dan receta e incapacidad?', answer: 'Sí, ambas cuando el caso lo amerita.' },
          { question: '¿Atienden urgencias?', answer: 'No. Aquí la cita más próxima suele ser el mismo día, pero esto no sustituye una sala de urgencias.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Lunes a viernes: 8:00–20:00', 'Sábado: 9:00–13:00', 'Domingo: cerrado'],
      }, COLUMN),
      b('location', 'default', { heading: 'Dónde estamos', address: 'Av. 5 de Febrero 405, Zona Centro, Durango', mapUrl: '' }, COLUMN),
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // BARBERÍA — misma vertical que el salón, identidad opuesta. Está
  // aquí para enseñar justo eso: el giro no decide cómo se ve una
  // página; lo decide la marca del negocio.
  // ══════════════════════════════════════════════════════════════════
  {
    slug: 'don-ramon',
    fonts: { heading: 'bebas', body: 'inter' },
    name: 'Barbería Don Ramón',
    vertical: 'peluqueria',
    description: 'Corte clásico, barba y navaja. Desde 1998.',
    colors: { primary: '#1B2A33', secondary: '#0E1A21', accent: '#D4A520' },
    design: {
      typeScale: 'grotesque',
      rhythm: 'compact',
      shape: 'sharp',
      imageTreatment: 'square',
      headingFont: '',
      upperHeadings: true,
    },
    resourceLabel: 'Barbero',
    location: 'Calle Pasteur 210 Sur, Zona Centro, Durango',
    resources: ['Ramón', 'Beto', 'Chuy'],
    services: [
      ['Corte clásico', 40, 220],
      ['Corte y barba', 60, 320],
      ['Afeitado con navaja', 40, 260],
      ['Perfilado de barba', 25, 150],
      ['Corte para niño', 30, 180],
    ],
    schedule: [...week([1, 2, 3, 4, 5], '10:00', '20:00'), ...week([6], '09:00', '17:00')],
    blocks: () => [
      header('Corte, barba y navaja', 'Pide tu turno', 'Tres sillas. Elige barbero y hora, sin esperar en la banca.', '/demo/don-ramon.webp'),
      booking(),
      b('services', 'menu', {
        heading: 'Precios',
        intro: 'Todos incluyen lavado y toalla caliente.',
        items: [
          { name: 'Corte clásico', description: 'Tijera o máquina, como lo pidas.', price: '$220', duration: '40 min' },
          { name: 'Corte y barba', description: 'El completo.', price: '$320', duration: '60 min' },
          { name: 'Afeitado con navaja', description: 'Toalla caliente y aceite.', price: '$260', duration: '40 min' },
          { name: 'Perfilado de barba', description: 'Mantenimiento entre cortes.', price: '$150', duration: '25 min' },
          { name: 'Corte para niño', description: 'Hasta 12 años.', price: '$180', duration: '30 min' },
        ],
      }, COLUMN),
      b('team', 'roster', {
        heading: 'Los barberos',
        intro: '',
        members: [
          { name: 'Ramón', role: 'Clásico', photoUrl: '', note: 'El de la navaja.' },
          { name: 'Beto', role: 'Fades', photoUrl: '', note: 'Degradados y diseño.' },
          { name: 'Chuy', role: 'Barba', photoUrl: '', note: 'Perfilado y tratamiento.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Lunes a viernes: 10:00–20:00', 'Sábado: 9:00–17:00', 'Domingo: cerrado'],
      }, COLUMN),
      b('location', 'default', { heading: 'Dónde estamos', address: 'Calle Pasteur 210 Sur, Zona Centro, Durango', mapUrl: '' }, COLUMN),
    ],
  },
];


// ── ejecución ────────────────────────────────────────────────────────
async function seed(negocio) {
  n = 0; // ids de bloque legibles y estables por negocio
  const blocks = negocio.blocks();

  const fila = {
    slug: negocio.slug,
    name: negocio.name,
    vertical: negocio.vertical,
    description: negocio.description,
    status: 'trial',
    plan: 'standard',
    timezone: 'America/Mexico_City',
    primary_color: negocio.colors.primary,
    secondary_color: negocio.colors.secondary,
    accent_color: negocio.colors.accent,
    // Se dejan en el default de la columna a proposito: la pagina trata
    // ese valor como "sin configurar" y calcula el papel del color del
    // negocio. Ver mixToPaper en lib/branding/colors.ts.
    background_color: '#F7F6F3',
    text_color: '#1A1A1A',
    font_heading: negocio.fonts.heading,
    font_body: negocio.fonts.body,
    resource_label: negocio.resourceLabel,
    location: negocio.location,
    page_blocks: blocks,
    page_design: negocio.design,
  };

  const { data: existe } = await db.from('tenants').select('id').eq('slug', negocio.slug).maybeSingle();

  let id;
  if (existe) {
    const { error } = await db.from('tenants').update(fila).eq('id', existe.id);
    if (error) throw new Error(`${negocio.slug}: ${error.message}`);
    id = existe.id;
    // Borrar y recrear: así el script deja el negocio exactamente como
    // está escrito aquí, sin acumular servicios de corridas anteriores.
    await db.from('resource_schedules').delete().eq('tenant_id', id);
    await db.from('resources').delete().eq('tenant_id', id);
    await db.from('service_types').delete().eq('tenant_id', id);
  } else {
    const { data, error } = await db.from('tenants').insert(fila).select('id').single();
    if (error) throw new Error(`${negocio.slug}: ${error.message}`);
    id = data.id;
  }

  const { data: recursos, error: eRec } = await db
    .from('resources')
    .insert(negocio.resources.map((name) => ({ tenant_id: id, name, active: true })))
    .select('id, name');
  if (eRec) throw new Error(`${negocio.slug} recursos: ${eRec.message}`);

  const { error: eServ } = await db.from('service_types').insert(
    negocio.services.map(([name, duration_minutes, price_mxn, requires_staff = true]) => ({
      tenant_id: id,
      name,
      duration_minutes,
      price_cents: price_mxn * 100,
      requires_staff,
      active: true,
    }))
  );
  if (eServ) throw new Error(`${negocio.slug} servicios: ${eServ.message}`);

  const horarios = recursos.flatMap((r) =>
    negocio.schedule.map((s) => ({ tenant_id: id, resource_id: r.id, ...s }))
  );
  const { error: eHor } = await db.from('resource_schedules').insert(horarios);
  if (eHor) throw new Error(`${negocio.slug} horarios: ${eHor.message}`);

  console.log(
    `✓ ${negocio.slug.padEnd(13)} ${negocio.resources.length} ${negocio.resourceLabel.toLowerCase()}s · ` +
      `${negocio.services.length} servicios · ${horarios.length} rangos de horario`
  );
}

for (const negocio of NEGOCIOS) {
  await seed(negocio);
}

console.log('\nListos:');
NEGOCIOS.forEach((x) => console.log(`  https://${x.slug}.bichomx.com`));
