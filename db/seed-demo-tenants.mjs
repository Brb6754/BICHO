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
    logo: '/demo/logos/dental-nova.png',
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
      b('split', 'image-left', {
        eyebrow: '',
        heading: 'El consultorio',
        body: 'Equipo nuevo, esterilización a la vista y una sola persona por turno. Nadie espera en el pasillo.',
        imageUrl: '/demo/dental-nova.webp',
        ctaText: '',
        ctaLink: '',
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
    logo: '/demo/logos/casa-luma.webp',
    fonts: { heading: 'fraunces', body: 'jost' },
    name: 'Casa Luma',
    vertical: 'peluqueria',
    description: 'Color, corte y uñas en Zona Centro.',
    colors: { primary: '#4A2318', secondary: '#2E140D', accent: '#C0714B' },
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
      b('split', 'image-left', {
        eyebrow: '',
        heading: 'El salón',
        body: 'Seis estaciones con luz natural, lavabos reclinables y café mientras esperas el tinte.',
        imageUrl: '/demo/casa-luma.webp',
        ctaText: '',
        ctaLink: '',
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
    logo: '/demo/logos/alto-padel.webp',
    fonts: { heading: 'oswald', body: 'inter' },
    name: 'Alto Pádel Club',
    vertical: 'padel',
    description: 'Cuatro pistas, dos techadas. Abierto hasta las once.',
    colors: { primary: '#15336B', secondary: '#0D2149', accent: '#8CC63F' },
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
      b('split', 'image-left', {
        eyebrow: '',
        heading: 'Las pistas',
        body: 'Cuatro pistas de cristal, dos techadas. Iluminación LED para jugar de noche.',
        imageUrl: '/demo/alto-padel.webp',
        ctaText: '',
        ctaLink: '',
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
    logo: '/demo/logos/mesa-doce.png',
    fonts: { heading: 'cormorant', body: 'jost' },
    name: 'Mesa Doce',
    vertical: 'restaurante',
    description: 'Cocina de temporada. Doce mesas, dos turnos.',
    colors: { primary: '#3B4A26', secondary: '#232E16', accent: '#C8891F' },
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
      b('split', 'image-left', {
        eyebrow: '',
        heading: 'El comedor',
        body: 'Doce mesas, cocina abierta y terraza para cuando el clima lo permite.',
        imageUrl: '/demo/mesa-doce.webp',
        ctaText: '',
        ctaLink: '',
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
    logo: '/demo/logos/agua-serena.png',
    fonts: { heading: 'cormorant', body: 'jost' },
    name: 'Agua Serena',
    vertical: 'spa',
    description: 'Tres cabinas, un tratamiento a la vez.',
    colors: { primary: '#1D4A5F', secondary: '#12303E', accent: '#6F8F63' },
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
      b('split', 'image-left', {
        eyebrow: '',
        heading: 'Las cabinas',
        body: 'Tres cabinas con vista, camilla térmica y un vestidor para cada una.',
        imageUrl: '/demo/agua-serena.webp',
        ctaText: '',
        ctaLink: '',
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
    logo: '/demo/logos/hierro-monte.webp',
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
      b('split', 'image-left', {
        eyebrow: '',
        heading: 'El gimnasio',
        body: 'Dos salas, racks completos y nunca más de ocho personas por clase.',
        imageUrl: '/demo/hierro-monte.webp',
        ctaText: '',
        ctaLink: '',
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
    logo: '/demo/logos/clinica-alameda.webp',
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
      b('split', 'image-left', {
        eyebrow: '',
        heading: 'El consultorio',
        body: 'Dos consultorios, sala de espera chica y citas separadas para que no se encimen.',
        imageUrl: '/demo/clinica-alameda.webp',
        ctaText: '',
        ctaLink: '',
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
    logo: '/demo/logos/don-ramon.webp',
    fonts: { heading: 'bebas', body: 'inter' },
    name: 'Barbería Don Ramón',
    vertical: 'peluqueria',
    description: 'Corte clásico, barba y navaja. Desde 1998.',
    colors: { primary: '#1A1A1A', secondary: '#0D0D0D', accent: '#C8793C' },
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
      b('split', 'image-left', {
        eyebrow: '',
        heading: 'La barbería',
        body: 'Tres sillas originales, navaja, toalla caliente y la misma banca desde 1998.',
        imageUrl: '/demo/don-ramon.webp',
        ctaText: '',
        ctaLink: '',
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Lunes a viernes: 10:00–20:00', 'Sábado: 9:00–17:00', 'Domingo: cerrado'],
      }, COLUMN),
      b('location', 'default', { heading: 'Dónde estamos', address: 'Calle Pasteur 210 Sur, Zona Centro, Durango', mapUrl: '' }, COLUMN),
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // NAIL BAR — catálogo largo y denso, y la pregunta real es cuánto
  // dura y cuánto tarda. Formas de pastilla y círculo: la forma de una
  // uña. Berenjena con laca cereza, para no repetir a Casa Luma.
  // ═════════════════════════════════════════════════════════════════
  {
    slug: 'lima-laca',
    logo: '/demo/logos/lima-laca.webp',
    fonts: { heading: 'cormorant', body: 'outfit' },
    name: 'Lima & Laca',
    vertical: 'peluqueria',
    description: 'Nail bar en Los Ángeles, Durango.',
    colors: { primary: '#2E1A2B', secondary: '#1B0F1A', accent: '#E0576E' },
    design: {
      typeScale: 'humanist',
      rhythm: 'compact',
      shape: 'pill',
      imageTreatment: 'circle',
      headingFont: '',
      upperHeadings: false,
    },
    resourceLabel: 'Manicurista',
    location: 'Blvd. Domingo Arrieta 1204, Los Ángeles, Durango',
    resources: ['Dafne Carrillo', 'Itzel Barraza', 'Mariana Solís'],
    services: [
      ['Manicure clásico', 45, 280],
      ['Manicure en gel', 60, 420],
      ['Acrílicas · juego nuevo', 150, 850],
      ['Acrílicas · relleno', 105, 600],
      ['Pedicure spa', 75, 480],
      ['Retiro de material', 30, 180],
    ],
    schedule: [...week([2, 3, 4, 5], '10:00', '20:00'), ...week([6], '10:00', '18:00')],
    blocks: () => [
      header(
        'Nail bar',
        'Aparta tus uñas',
        'Elige servicio, manicurista y hora. Te llega la confirmación al instante.'
      , '/demo/lima-laca.webp'),
      booking(),
      b('services', 'menu', {
        heading: 'Carta y tiempos',
        intro: 'El tiempo es lo que de verdad planeas: un juego nuevo de acrílicas son dos horas y media sentada. Los diseños a mano se cotizan aparte según el detalle.',
        items: [
          { name: 'Manicure clásico', description: 'Limado, cutícula y esmalte tradicional.', price: '$280', duration: '45 min' },
          { name: 'Manicure en gel', description: 'Retiro, limado y color en gel. Dura de 2 a 3 semanas.', price: '$420', duration: '60 min' },
          { name: 'Acrílicas · juego nuevo', description: 'Construcción completa, largo y forma a elegir.', price: '$850', duration: '2 h 30' },
          { name: 'Acrílicas · relleno', description: 'Mantenimiento cada 3 o 4 semanas.', price: '$600', duration: '1 h 45' },
          { name: 'Pedicure spa', description: 'Remojo, exfoliación, masaje y esmalte.', price: '$480', duration: '75 min' },
          { name: 'Retiro de material', description: 'Gel o acrílico, sin dañar la uña natural.', price: '$180', duration: '30 min' },
        ],
      }, COLUMN),
      b('team', 'roster', {
        heading: 'Con quién puedes reservar',
        intro: 'Si es tu primera vez, cualquiera de las tres te asesora sobre largo y forma.',
        members: [
          { name: 'Dafne Carrillo', role: 'Acrílicas', photoUrl: '', note: 'Esculpido y formas largas.' },
          { name: 'Itzel Barraza', role: 'Diseño', photoUrl: '', note: 'Mano alzada, encapsulado y pedrería.' },
          { name: 'Mariana Solís', role: 'Gel y pedicure', photoUrl: '', note: 'Uña corta, natural y cuidado de cutícula.' },
        ],
      }, COLUMN),
      b('faq', 'default', {
        heading: 'Antes de venir',
        items: [
          { question: '¿Cuánto dura el gel?', answer: 'De 2 a 3 semanas sin que se levante. El acrílico aguanta más, pero pide relleno cada 3 o 4.' },
          { question: 'Traigo material de otro lado, ¿lo retiran?', answer: 'Sí. Agenda "Retiro de material" junto con lo que te vayas a poner, para que el tiempo alcance.' },
          { question: '¿Puedo llevar una foto de lo que quiero?', answer: 'Por favor. Mandala en las notas de la reserva y te decimos si alcanza en el tiempo que apartaste.' },
          { question: '¿Cancelan si llego tarde?', answer: 'Te esperamos 15 minutos. Después de eso depende de si la siguiente cita ya llegó.' },
        ],
      }, COLUMN),
      b('split', 'image-left', {
        eyebrow: '',
        heading: 'El estudio',
        body: 'Cuatro mesas con extracción de polvo, luz fría para ver el color real y esterilización en autoclave a la vista.',
        imageUrl: '/demo/lima-laca.webp',
        ctaText: '',
        ctaLink: '',
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Martes a viernes: 10:00–20:00', 'Sábado: 10:00–18:00', 'Domingo y lunes: cerrado'],
      }, COLUMN),
      b('location', 'default', {
        heading: 'Dónde estamos',
        address: 'Blvd. Domingo Arrieta 1204, Los Ángeles, Durango',
        mapUrl: '',
      }, COLUMN),
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // ESTÉTICA CANINA — el precio depende del tamaño del perro y el
  // tiempo, de la raza y el pelaje; eso es lo que el cliente necesita
  // ver antes de apartar. Verde azulado con amarillo cálido, formas
  // redondeadas y letra amigable: ni clínica ni barbería.
  // Todavía sin foto (/public/demo/burbujas-bigotes.webp) ni logo.
  // ═════════════════════════════════════════════════════════════════
  {
    slug: 'burbujas-bigotes',
    logo: null,
    fonts: { heading: 'poppins', body: 'inter' },
    name: 'Burbujas & Bigotes',
    vertical: 'peluqueria',
    description: 'Estética canina en Durango: baño, corte y spa para tu perro.',
    colors: { primary: '#0F4C4A', secondary: '#08302F', accent: '#F2A93B' },
    design: {
      typeScale: 'humanist',
      rhythm: 'balanced',
      shape: 'rounded',
      imageTreatment: 'soft',
      headingFont: '',
      upperHeadings: false,
    },
    resourceLabel: 'Estilista',
    location: 'Av. Universidad 512, Valle del Sur, Durango',
    resources: ['Fernanda Quiñones', 'Óscar Meraz'],
    services: [
      ['Baño perro chico', 60, 250],
      ['Baño perro mediano', 75, 330],
      ['Baño perro grande', 90, 450],
      ['Corte de raza', 120, 480],
      ['Corte higiénico', 30, 150],
      ['Baño medicado', 75, 380],
      ['Corte de uñas', 15, 90],
      ['Deslanado', 120, 550],
    ],
    schedule: [...week([1, 2, 3, 4, 5], '09:00', '19:00'), ...week([6], '09:00', '15:00')],
    blocks: () => [
      header(
        'Estética canina',
        'Agenda el baño de tu perro',
        'Elige servicio, estilista y hora. Lo recoges limpio, perfumado y con moño.'
      ),
      booking(),
      b('services', 'menu', {
        heading: 'Servicios y precios',
        intro: 'El baño se cobra por tamaño: chico hasta 10 kg, mediano de 10 a 25 kg, grande de 25 kg en adelante. Todos incluyen secado, cepillado, limpieza de oídos y perfume.',
        items: [
          { name: 'Baño perro chico', description: 'Chihuahua, pug, schnauzer mini y similares.', price: '$250', duration: '60 min' },
          { name: 'Baño perro mediano', description: 'Beagle, cocker, border collie y similares.', price: '$330', duration: '75 min' },
          { name: 'Baño perro grande', description: 'Labrador, golden, pastor alemán y similares.', price: '$450', duration: '90 min' },
          { name: 'Corte de raza', description: 'Incluye baño. Poodle, schnauzer, yorkie, shih tzu; el precio sube con el tamaño.', price: 'desde $480', duration: '2 h' },
          { name: 'Corte higiénico', description: 'Patas, cara y zona íntima, entre cortes.', price: '$150', duration: '30 min' },
          { name: 'Baño medicado', description: 'Shampoo indicado por su veterinario, o el nuestro para piel sensible.', price: '$380', duration: '75 min' },
          { name: 'Corte de uñas', description: 'Con limado. Quince minutos y listo.', price: '$90', duration: '15 min' },
          { name: 'Deslanado', description: 'Retiro de subpelo para husky, golden o pastor. Incluye baño.', price: '$550', duration: '2 h' },
        ],
      }, COLUMN),
      b('team', 'roster', {
        heading: 'Quién lo atiende',
        intro: '',
        members: [
          { name: 'Fernanda Quiñones', role: 'Cortes de raza', photoUrl: '', note: 'Poodle, schnauzer y razas de pelo largo.' },
          { name: 'Óscar Meraz', role: 'Perros grandes', photoUrl: '', note: 'Deslanado y perros nerviosos, con paciencia.' },
        ],
      }, COLUMN),
      b('faq', 'default', {
        heading: 'Antes de traerlo',
        items: [
          { question: '¿Necesita vacunas?', answer: 'Sí: cartilla con rabia y múltiple vigentes. Tráela la primera vez y la anotamos.' },
          { question: 'Mi perro es nervioso o muerde, ¿lo atienden?', answer: 'Sí. Avísanos en las notas de la reserva para darle más tiempo y que lo atienda Óscar.' },
          { question: '¿Cuánto tarda en estar listo?', answer: 'Lo que dice cada servicio. Te mandamos WhatsApp cuando ya puedes pasar por él.' },
          { question: '¿Y si trae pulgas o garrapatas?', answer: 'Agenda baño medicado. Si llega con pulgas a un baño normal, se cambia al medicado.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario',
        lines: ['Lunes a viernes: 9:00–19:00', 'Sábado: 9:00–15:00', 'Domingo: cerrado'],
      }, COLUMN),
      b('location', 'default', {
        heading: 'Dónde estamos',
        address: 'Av. Universidad 512, Valle del Sur, Durango',
        mapUrl: '',
      }, COLUMN),
    ],
  },

  // ═════════════════════════════════════════════════════════════════
  // INMOBILIARIA — validación con agentes reales antes de construir un
  // módulo: cada "servicio" es la visita a UNA propiedad (precio de la
  // propiedad en el nombre; la visita es sin costo) y cada recurso es
  // un asesor. Azul pizarra con dorado, serif en titulares.
  // Sin foto ni logo.
  // ═════════════════════════════════════════════════════════════════
  {
    slug: 'casa-norte',
    logo: null,
    fonts: { heading: 'playfair', body: 'inter' },
    name: 'Casa Norte Inmobiliaria',
    vertical: 'inmobiliaria',
    description: 'Casas, departamentos, terrenos y locales en Durango. Agenda tu visita en línea.',
    colors: { primary: '#1E3A5F', secondary: '#12243B', accent: '#C9A24A' },
    design: {
      typeScale: 'editorial',
      rhythm: 'balanced',
      shape: 'soft',
      imageTreatment: 'square',
      headingFont: '',
      upperHeadings: false,
    },
    resourceLabel: 'Asesor',
    location: 'Blvd. Felipe Pescador 1010, Zona Centro, Durango',
    resources: ['Daniela Villarreal', 'Rodrigo Soto', 'Alejandra Cháirez'],
    services: [
      ['Casa en Valle del Sur · 3 rec, 2 baños · $2,450,000', 45, 0],
      ['Casa en Jardines de Durango · 4 rec, 3 baños · $3,850,000', 45, 0],
      ['Depa en Los Remedios · 2 rec, 2 baños · $1,690,000', 45, 0],
      ['Casa en Fracc. Huizache · 2 rec, 1 baño · $1,180,000', 45, 0],
      ['Terreno en Las Alamedas · 250 m² · $980,000', 45, 0],
      ['Local en renta, Zona Centro · 80 m² · $14,500/mes', 45, 0],
    ],
    schedule: [...week([1, 2, 3, 4, 5], '09:00', '19:00'), ...week([6], '10:00', '14:00')],
    blocks: () => [
      header(
        'Inmobiliaria en Durango',
        'Agenda tu visita',
        'Elige la propiedad, el asesor y la hora. Te mandamos la ubicación exacta por WhatsApp.'
      ),
      booking(),
      b('services', 'menu', {
        heading: 'Propiedades disponibles',
        intro: 'La visita no tiene costo y dura unos 45 minutos. Precios de venta, salvo el local (renta mensual).',
        items: [
          { name: 'Casa en Valle del Sur', description: '3 recámaras, 2 baños, cochera para 2. Terreno 160 m², construcción 140 m².', price: '$2,450,000', duration: '45 min' },
          { name: 'Casa en Jardines de Durango', description: '4 recámaras, 3 baños, jardín y estudio. Terreno 250 m², construcción 230 m².', price: '$3,850,000', duration: '45 min' },
          { name: 'Depa en Los Remedios', description: '2 recámaras, 2 baños, 3er piso con elevador, un cajón de estacionamiento.', price: '$1,690,000', duration: '45 min' },
          { name: 'Casa en Fracc. Huizache', description: '2 recámaras, 1 baño, una planta. Acepta Infonavit.', price: '$1,180,000', duration: '45 min' },
          { name: 'Terreno en Las Alamedas', description: '250 m² escriturado, con servicios a pie de lote.', price: '$980,000', duration: '45 min' },
          { name: 'Local en renta, Zona Centro', description: '80 m² a pie de calle, baño y bodega. Depósito de un mes.', price: '$14,500/mes', duration: '45 min' },
        ],
      }, COLUMN),
      b('team', 'roster', {
        heading: 'Tu asesor',
        intro: '',
        members: [
          { name: 'Daniela Villarreal', role: 'Casas y crédito', photoUrl: '', note: 'Infonavit, Fovissste y crédito bancario.' },
          { name: 'Rodrigo Soto', role: 'Terrenos y locales', photoUrl: '', note: 'Inversión y propiedades comerciales.' },
          { name: 'Alejandra Cháirez', role: 'Departamentos', photoUrl: '', note: 'Primera vivienda y rentas.' },
        ],
      }, COLUMN),
      b('faq', 'default', {
        heading: 'Antes de tu visita',
        items: [
          { question: '¿Dónde nos vemos?', answer: 'En la propiedad. Al confirmar tu cita te mandamos la ubicación exacta por WhatsApp.' },
          { question: '¿La visita tiene costo?', answer: 'No. Agendar y visitar es gratis y sin compromiso.' },
          { question: '¿Aceptan crédito Infonavit o bancario?', answer: 'En la mayoría sí. Escríbelo en las notas de la reserva y tu asesor te dice cuáles aplican.' },
          { question: '¿Puedo ver varias propiedades el mismo día?', answer: 'Sí: agenda una cita por propiedad con el mismo asesor y él arma la ruta.' },
        ],
      }, COLUMN),
      b('hours', 'default', {
        heading: 'Horario de visitas',
        lines: ['Lunes a viernes: 9:00–19:00', 'Sábado: 10:00–14:00', 'Domingo: cerrado'],
      }, COLUMN),
      b('location', 'default', {
        heading: 'Oficina',
        address: 'Blvd. Felipe Pescador 1010, Zona Centro, Durango',
        mapUrl: '',
      }, COLUMN),
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
    logo_url: negocio.logo,
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

// Sin argumentos siembra todos; con slugs, solo esos (y no toca las
// citas de los demás demos):  node db/seed-demo-tenants.mjs burbujas-bigotes
const SOLO = process.argv.slice(2);
const ELEGIDOS = SOLO.length ? NEGOCIOS.filter((x) => SOLO.includes(x.slug)) : NEGOCIOS;

for (const negocio of ELEGIDOS) {
  await seed(negocio);
}

console.log('\nListos:');
ELEGIDOS.forEach((x) => console.log(`  https://${x.slug}.bichomx.com`));
