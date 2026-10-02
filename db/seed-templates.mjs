// Seeds the six industry templates.
//
// Run with:  node db/seed-templates.mjs
//
// Idempotent: upserts by `vertical`, so re-running replaces a
// template's blocks/design in place rather than duplicating rows. It
// never touches the tenants table, so a business already using a
// vertical just picks up the new layout.
//
// ─────────────────────────────────────────────────────────────────
// WHAT THIS PAGE IS  (read before adding anything)
//
// It is a BOOKING PAGE, not a website about the business. Someone
// arrives here to make an appointment. That single fact decides the
// whole composition:
//
//   · Booking sits in position 2, right under a compact identity
//     header — never below a poster hero, a gallery or an essay.
//   · Every other block has to earn its place by answering one of
//     exactly two questions: "am I in the right place / can I trust
//     this?" or "what will it cost me and when can I come?".
//   · Anything that only answers "isn't this business lovely" —
//     editorial photo mosaics, philosophy prose, team spreads,
//     membership marketing, CTA slabs pointing back at the booking
//     that is already on the page — is noise between the visitor and
//     the thing they came for. It was here in an earlier pass and has
//     been cut deliberately.
//
// The industries still differ, but now they differ in what a booking
// page for that industry actually needs (does the customer pick a
// person? a court? a class? does the first visit differ from a
// follow-up?) plus the design language, rather than in art direction.
// ─────────────────────────────────────────────────────────────────

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

// ONE MEASURE for the whole page. The booking card renders at
// max-w-2xl, so a services list at max-w-6xl beside it makes the page
// read as unrelated sections of different widths instead of a single
// calm column. `sm` resolves to max-w-2xl — the same measure.
const COLUMN = { maxWidth: 'sm' };
const WIDE = { maxWidth: 'lg' };
const NARROW = { maxWidth: 'sm' };
const FULL = { maxWidth: 'full' };
const TIGHT = { padding: 'sm' };

// Identity header — same role in all six, different voice.
const header = (eyebrow, title, subtitle) =>
  b('hero', 'header', { eyebrow, title, subtitle, backgroundImageUrl: '', align: 'left', ctaText: '', ctaLink: '' }, FULL);

// The reason the page exists.
const booking = () => b('booking', 'default', {}, WIDE);

// ────────────────────────────────────────────────────────────────────
// 01 · PELUQUERÍA — the customer picks a service AND a stylist
// ────────────────────────────────────────────────────────────────────
const peluqueria = {
  design: {
    typeScale: 'grotesque',
    rhythm: 'balanced',
    shape: 'sharp',
    imageTreatment: 'square',
    headingFont: "Georgia, 'Times New Roman', serif",
    upperHeadings: false,
  },
  blocks: [
    header('Estudio de color y corte', 'Reserva tu cita', 'Elige servicio, estilista y horario. Te confirmamos al instante por correo.'),
    booking(),
    b('services', 'menu', {
      heading: 'Precios de referencia',
      intro: 'El precio final depende del largo y la densidad del pelo. Te lo confirmamos en la consulta de diez minutos, nunca al final.',
      items: [
        { name: 'Corte y peinado', description: 'Consulta, lavado, corte y secado.', price: '$450', duration: '60 min' },
        { name: 'Color raíz', description: 'Retoque con tono a medida.', price: '$780', duration: '90 min' },
        { name: 'Balayage', description: 'Aclarado a mano alzada, matizado y tratamiento.', price: '$2,400', duration: '3 h' },
        { name: 'Tratamiento de reconstrucción', description: 'Para pelo con decoloración previa.', price: '$650', duration: '45 min' },
        { name: 'Peinado de evento', description: 'Recogido o suelto trabajado.', price: '$900', duration: '75 min' },
      ],
    }, COLUMN),
    b('team', 'roster', {
      heading: 'Con quién puedes reservar',
      intro: 'Si es tu primera vez, cualquiera de las tres te hace la consulta.',
      members: [
        { name: 'Renata Villalobos', role: 'Color', photoUrl: '', note: 'Rubios y corrección de color.' },
        { name: 'Ximena Ortiz', role: 'Corte', photoUrl: '', note: 'Corte seco y pelo rizado.' },
        { name: 'Paulina Cruz', role: 'Tratamientos', photoUrl: '', note: 'Reconstrucción y salud capilar.' },
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
};

// ────────────────────────────────────────────────────────────────────
// 02 · SPA — duration is the decision; cabins are limited
// ────────────────────────────────────────────────────────────────────
const spa = {
  design: {
    typeScale: 'humanist',
    rhythm: 'spacious',
    shape: 'soft',
    imageTreatment: 'arch',
    headingFont: "'Iowan Old Style', Georgia, serif",
    upperHeadings: false,
  },
  blocks: [
    header('Casa de bienestar', 'Aparta tu tratamiento', 'Tres cabinas, un tratamiento a la vez. Elige duración y horario.'),
    booking(),
    b('services', 'editorial', {
      heading: 'Tratamientos',
      intro: 'Los tiempos incluyen el vapor previo y el descanso posterior — no son solo el masaje.',
      items: [
        { name: 'Masaje profundo', description: 'Presión firme en espalda alta, cuello y hombros.', price: '$1,150', duration: '80 min' },
        { name: 'Ritual de la casa', description: 'Vapor, exfoliación en seco y masaje de cuerpo completo.', price: '$1,900', duration: '2 h' },
        { name: 'Facial de hidratación', description: 'Limpieza, extracción suave y mascarilla.', price: '$980', duration: '60 min' },
        { name: 'Piernas cansadas', description: 'Drenaje ascendente. Apto en embarazo.', price: '$820', duration: '50 min' },
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
    b('location', 'default', { heading: 'Ubicación', address: 'Calle Constitución 218 Nte., Durango', mapUrl: '' }, COLUMN),
  ],
};

// ────────────────────────────────────────────────────────────────────
// 03 · PÁDEL — availability IS the product; nothing precedes it
// ────────────────────────────────────────────────────────────────────
const padel = {
  design: {
    typeScale: 'condensed',
    rhythm: 'compact',
    shape: 'sharp',
    imageTreatment: 'square',
    headingFont: "'Arial Narrow', 'Helvetica Neue', Helvetica, sans-serif",
    upperHeadings: true,
  },
  blocks: [
    header('Club de pádel', 'Reserva pista', 'Cuatro pistas, dos techadas. Abierto hasta medianoche.'),
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
      heading: 'Antes de venir',
      items: [
        { question: '¿Necesito pala propia?', answer: 'No. Hay palas de alquiler en recepción por $60, sin reserva previa.' },
        { question: '¿Y si llueve?', answer: 'Dos de las cuatro pistas son techadas. Si te tocaba una descubierta, te cambiamos sin costo o te devolvemos la reserva.' },
        { question: '¿Hasta cuándo puedo cancelar?', answer: 'Hasta 4 horas antes, desde el enlace de tu correo. Después de esa hora la pista ya se contó como ocupada.' },
      ],
    }, COLUMN),
    b('hours', 'default', {
      heading: 'Horario',
      lines: ['Lunes a viernes: 7:00–24:00', 'Sábado y domingo: 8:00–22:00'],
    }, COLUMN),
    b('location', 'default', { heading: 'Cómo llegar', address: 'Blvd. Domingo Arrieta 1500, Durango', mapUrl: '' }, COLUMN),
  ],
};

// ────────────────────────────────────────────────────────────────────
// 04 · DENTISTA — trust has to arrive before the booking, but briefly
// ────────────────────────────────────────────────────────────────────
const dentista = {
  design: {
    typeScale: 'grotesque',
    rhythm: 'balanced',
    shape: 'rounded',
    imageTreatment: 'soft',
    headingFont: 'inherit',
    upperHeadings: false,
  },
  blocks: [
    header('Clínica dental', 'Agenda tu consulta', 'Primera cita con radiografía y presupuesto por escrito. Urgencias el mismo día.'),
    booking(),
    b('features', 'grid', {
      heading: '',
      items: [
        'Presupuesto por escrito en la primera cita',
        'Radiografía digital, menos radiación',
        'Urgencias el mismo día',
        'Pago a meses sin intereses',
      ],
      layout: 'grid',
    }, { ...COLUMN, ...TIGHT }),
    b('services', 'compact', {
      heading: 'Precios de referencia',
      intro: 'El presupuesto final se entrega por escrito tras la radiografía.',
      items: [
        { name: 'Consulta y diagnóstico', description: '', price: '$350', duration: '30 min' },
        { name: 'Limpieza dental', description: '', price: '$700', duration: '45 min' },
        { name: 'Resina (por pieza)', description: '', price: '$900', duration: '45 min' },
        { name: 'Endodoncia', description: '', price: '$3,200', duration: '90 min' },
        { name: 'Corona de zirconia', description: '', price: '$6,500', duration: '2 citas' },
        { name: 'Blanqueamiento', description: '', price: '$4,000', duration: '75 min' },
      ],
    }, COLUMN),
    b('team', 'roster', {
      heading: 'Quién te atiende',
      intro: '',
      members: [
        { name: 'Dra. Fernanda Escobar', role: 'Odontología general y estética', photoUrl: '', note: 'Cédula 7284915' },
        { name: 'Dr. Ricardo Nava', role: 'Endodoncia', photoUrl: '', note: 'Cédula 6108332' },
        { name: 'Dra. Sofía Márquez', role: 'Ortodoncia', photoUrl: '', note: 'Cédula 8455170' },
      ],
    }, COLUMN),
    b('faq', 'default', {
      heading: 'Dudas frecuentes',
      items: [
        { question: '¿Aceptan seguro?', answer: 'Trabajamos con reembolso: te damos factura y el desglose que piden las aseguradoras.' },
        { question: '¿Puedo pagar a meses?', answer: 'Sí, a 3, 6 y 9 meses sin intereses con tarjetas participantes, desde $3,000.' },
        { question: '¿Atienden niños?', answer: 'Desde los 4 años. La primera cita es solo para que conozcan el consultorio.' },
      ],
    }, COLUMN),
    b('location', 'default', { heading: 'Consultorio', address: 'Calle Negrete 405 Pte., Consultorio 3, Durango', mapUrl: '' }, COLUMN),
  ],
};

// ────────────────────────────────────────────────────────────────────
// 05 · DOCTOR — credentials matter, but one paragraph, not a spread
// ────────────────────────────────────────────────────────────────────
const doctor = {
  design: {
    typeScale: 'humanist',
    rhythm: 'balanced',
    shape: 'soft',
    imageTreatment: 'circle',
    headingFont: 'inherit',
    upperHeadings: false,
  },
  blocks: [
    header('Medicina interna · Dr. Alejandro Rentería', 'Agenda tu consulta', 'Consultas de 40 minutos. Trae tus estudios de los últimos dos años.'),
    booking(),
    b('services', 'compact', {
      heading: 'Tipos de consulta',
      intro: '',
      items: [
        { name: 'Primera vez', description: '', price: '$1,200', duration: '40 min' },
        { name: 'Seguimiento', description: '', price: '$800', duration: '25 min' },
        { name: 'Chequeo anual', description: '', price: '$1,500', duration: '45 min' },
        { name: 'Segunda opinión', description: '', price: '$1,400', duration: '40 min' },
      ],
    }, COLUMN),
    b('features', 'list', {
      heading: 'Qué llevar a tu cita',
      items: [
        'Estudios de los últimos dos años, aunque parezcan viejos.',
        'Las cajas de tus medicamentos, o una foto de las etiquetas.',
        'Si vienes por una segunda opinión, el diagnóstico previo por escrito.',
      ],
      layout: 'list',
    }, COLUMN),
    b('text', 'default', {
      heading: 'Sobre el doctor',
      body: 'Médico internista con 14 años de práctica. Medicina en la UNAM, especialidad en el Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán. Atiende sobre todo hipertensión, diabetes tipo 2 y pacientes con varias condiciones a la vez. Cédula profesional 4192077, cédula de especialidad 7834501.',
      align: 'left',
      size: 'sm',
    }, COLUMN),
    b('faq', 'default', {
      heading: 'Preguntas frecuentes',
      items: [
        { question: '¿Atiende urgencias?', answer: 'No. Si es una urgencia, acude a un servicio de urgencias. Aquí es consulta programada y seguimiento.' },
        { question: '¿Da recetas por mensaje?', answer: 'Solo renovaciones de un tratamiento ya establecido en consulta.' },
        { question: '¿Cuánto tardan los resultados?', answer: 'El laboratorio los manda en 24–48 h y agendamos una cita corta de interpretación.' },
      ],
    }, COLUMN),
    b('hours', 'default', {
      heading: 'Horario de consulta',
      lines: ['Lunes, miércoles y viernes: 9:00–14:00', 'Martes y jueves: 15:00–20:00', 'Sábado: 9:00–13:00'],
    }, COLUMN),
    b('location', 'default', { heading: 'Ubicación', address: 'Torre Médica Durango, Av. 5 de Febrero 1201, Consultorio 604', mapUrl: '' }, COLUMN),
  ],
};

// ────────────────────────────────────────────────────────────────────
// 06 · GIMNASIO — the class schedule is the booking; capacity matters
// ────────────────────────────────────────────────────────────────────
const gimnasio = {
  design: {
    typeScale: 'condensed',
    rhythm: 'compact',
    shape: 'sharp',
    imageTreatment: 'square',
    headingFont: "'Arial Black', 'Helvetica Neue', Helvetica, sans-serif",
    upperHeadings: true,
  },
  blocks: [
    header('Entrenamiento en grupo', 'Aparta tu clase', 'Cupo de doce personas por clase. Se llena, así que aparta antes.'),
    booking(),
    b('services', 'cards', {
      heading: 'Las clases',
      intro: 'Todas duran 50 minutos. Si faltas sin cancelar dos veces, pierdes la reserva de la semana.',
      items: [
        { name: 'Fuerza', description: 'Barra, mancuerna y peso corporal, con progresión escrita.', price: 'Incluida', duration: '50 min' },
        { name: 'Metabólico', description: 'Circuitos de alta intensidad. La que más rápido se llena.', price: 'Incluida', duration: '50 min' },
        { name: 'Movilidad', description: 'Cadera, hombro y columna. Domingos.', price: 'Incluida', duration: '45 min' },
        { name: 'Personal', description: 'Uno a uno, con evaluación y plan de doce semanas.', price: '$550', duration: '60 min' },
      ],
    }, COLUMN),
    b('services', 'compact', {
      heading: 'Membresías',
      intro: 'Sin contrato forzoso. Cancelas avisando antes del corte del mes.',
      items: [
        { name: 'Clase suelta', description: '', price: '$180', duration: '' },
        { name: 'Ocho clases al mes', description: '', price: '$1,100', duration: '' },
        { name: 'Ilimitado', description: '', price: '$1,650', duration: '' },
        { name: 'Ilimitado + personal semanal', description: '', price: '$3,400', duration: '' },
      ],
    }, COLUMN),
    b('hours', 'default', {
      heading: 'Horario de clases',
      lines: ['Lunes a viernes: 5:00, 6:00, 7:00, 18:00, 19:00, 20:00, 21:00', 'Sábado: 8:00, 9:00, 10:00', 'Domingo: 9:00 (movilidad)'],
    }, COLUMN),
    b('location', 'default', { heading: 'Dónde estamos', address: 'Calle Zarco 220, Zona Centro, Durango', mapUrl: '' }, COLUMN),
  ],
};

// ────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────
// 07 · RESTAURANTE — reservar no cuesta: la mesa es el recurso y el
// "servicio" es el tamaño del grupo. La única vertical donde el precio
// del servicio es cero a propósito (ver formatPrice en
// components/booking/types.ts: cero no se pinta como "$0").
// ────────────────────────────────────────────────────────────────────
const restaurante = {
  design: {
    typeScale: 'editorial',
    rhythm: 'spacious',
    shape: 'soft',
    imageTreatment: 'arch',
    headingFont: "'Iowan Old Style', Georgia, serif",
    upperHeadings: false,
  },
  blocks: [
    header('Cocina de temporada', 'Reserva tu mesa', 'Dos turnos, comida y cena. Confirmamos al momento.'),
    booking(),
    b('services', 'editorial', {
      heading: 'La carta, en corto',
      intro: 'Cambia con lo que hay en el mercado. Esto es lo que casi siempre está.',
      items: [
        { name: 'Menú de degustación', description: 'Se pide al reservar, para toda la mesa.', price: '$890', duration: '2 h 30' },
        { name: 'Entradas', description: 'Para compartir.', price: '$120–$280', duration: '' },
        { name: 'Fuertes', description: 'Pesca del día, cordero, opciones vegetarianas.', price: '$290–$520', duration: '' },
        { name: 'Postres', description: 'De la casa.', price: '$140', duration: '' },
      ],
    }, COLUMN),
    b('faq', 'default', {
      heading: 'Antes de venir',
      items: [
        { question: '¿Cuánto tiempo tenemos la mesa?', answer: 'Hora y media para dos personas, dos horas de cuatro en adelante. Si el turno siguiente está libre, nadie te va a apurar.' },
        { question: '¿Somos un grupo grande?', answer: 'Reserva la mesa grande y dinos cuántos son en las notas.' },
        { question: '¿Puedo llegar tarde?', answer: 'Guardamos la mesa 15 minutos. Pasado eso la liberamos, porque el turno siguiente ya está reservado.' },
      ],
    }, COLUMN),
    b('hours', 'default', {
      heading: 'Turnos',
      lines: ['Miércoles a sábado: 13:30–17:00 y 19:00–23:00', 'Domingo: solo comida', 'Lunes y martes: cerrado'],
    }, COLUMN),
    b('location', 'default', { heading: 'Dónde estamos', address: 'Zona Centro, Durango', mapUrl: '' }, COLUMN),
  ],
};

const TEMPLATES = [
  {
    vertical: 'peluqueria',
    name: 'Peluquería / Estética',
    available: true,
    accent_color: '#B4785F',
    features: ['Reserva con estilista específica', 'Precios con duración', 'Confirmación por correo'],
    ...peluqueria,
  },
  {
    vertical: 'spa',
    name: 'Spa / Bienestar',
    available: true,
    accent_color: '#8A7B62',
    features: ['Reserva por cabina', 'Duración real del tratamiento', 'Avisos previos a la cita'],
    ...spa,
  },
  {
    vertical: 'padel',
    name: 'Club de pádel',
    available: true,
    accent_color: '#4F7A28',
    features: ['Disponibilidad de pistas', 'Clases y niveles', 'Cancelación hasta 4 h antes'],
    ...padel,
  },
  {
    vertical: 'dentista',
    name: 'Consultorio dental',
    available: true,
    accent_color: '#2E7D9A',
    features: ['Presupuesto por escrito', 'Doctores con cédula', 'Urgencias el mismo día'],
    ...dentista,
  },
  {
    vertical: 'doctor',
    name: 'Doctor / Clínica',
    available: true,
    accent_color: '#3F6C51',
    features: ['Consultas largas', 'Tipos de consulta con precio', 'Qué llevar a la cita'],
    ...doctor,
  },
  {
    vertical: 'restaurante',
    name: 'Restaurante',
    available: true,
    accent_color: '#B4812F',
    features: ['Reserva de mesa por turno', 'Sin costo por reservar', 'Avisos de cupo y horario'],
    ...restaurante,
  },
  {
    vertical: 'gimnasio',
    name: 'Gimnasio / Clases',
    available: true,
    accent_color: '#C2410C',
    features: ['Reserva de clase con cupo', 'Horario semanal', 'Membresías sin contrato'],
    ...gimnasio,
  },
];

for (const t of TEMPLATES) {
  const { error } = await db.from('templates').upsert(t, { onConflict: 'vertical' });
  if (error) {
    console.error(`✗ ${t.vertical}: ${error.message}`);
    process.exitCode = 1;
  } else {
    const bookingAt = t.blocks.findIndex((x) => x.type === 'booking') + 1;
    console.log(
      `✓ ${t.vertical.padEnd(11)} ${String(t.blocks.length).padStart(2)} bloques · reserva en posición ${bookingAt}`
    );
  }
}
