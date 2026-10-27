import { CalendarClock, FileText, Handshake, ReceiptText } from 'lucide-react';

// La plataforma de bicho: cuatro módulos que se contratan por separado.
//
// Es contenido, no adorno: cada uno existe en el producto, tiene su
// interruptor por negocio y su sección en el panel. Lo que se dice aquí
// es lo que hace hoy — nada de "próximamente" disfrazado de presente, y
// nada de métricas inventadas.
//
// Los íconos son LOS MISMOS del menú del panel, a propósito: quien vio
// la landing y después entra a su panel reconoce cada sección.
//
// El orden es el del trabajo real de un negocio: primero alguien
// agenda —una cita si viene a que lo atiendan, una reunión si te quiere
// comprar algo—, después se cotiza lo que no tiene precio fijo, y al
// final se factura.
export type Modulo = {
  id: string;
  Icon: typeof CalendarClock;
  name: string;
  claim: string;
  blurb: string;
  bullets: string[];
};

export const MODULOS: Modulo[] = [
  {
    id: 'reservas',
    Icon: CalendarClock,
    name: 'Reservas',
    claim: 'Tu agenda deja de vivir en WhatsApp',
    blurb:
      'Tu propia página de citas, con tus servicios, tus horarios y tu marca. Tu cliente reserva solo y le llega su confirmación.',
    bullets: ['Página de reservas propia', 'Confirmación automática', 'Agenda en tu panel'],
  },
  {
    id: 'reuniones',
    Icon: Handshake,
    name: 'Reuniones',
    claim: 'Quien te quiere comprar, agenda solo',
    blurb:
      'Una página para agendar videollamadas, visitas o juntas en tu oficina. Después de cada una anotas en qué quedó, y ves qué tan seguido cierras.',
    // "Sin choques" es literal: una reunión y una cita viven en la misma
    // agenda del mismo asesor, y la base no deja encimarlas (db/039).
    bullets: [
      'Videollamada, visita o en oficina',
      'Nunca choca con tu agenda de citas',
      'Seguimiento de en qué quedó',
    ],
  },
  {
    id: 'cotizaciones',
    Icon: FileText,
    name: 'Cotizaciones',
    claim: 'Sabes quién la abrió y no te ha contestado',
    blurb:
      'Armas la cotización en un minuto, con el IVA calculado. Tu cliente la ve con tu marca, la descarga en PDF y la acepta con un clic.',
    bullets: ['PDF con tu marca', 'Aceptación en línea', 'Seguimiento de quién la vio'],
  },
  {
    id: 'facturacion',
    Icon: ReceiptText,
    name: 'Facturación',
    claim: 'Del sí del cliente al CFDI, sin salir de aquí',
    blurb:
      'Timbras la cotización que tu cliente aceptó y sale su factura, con su folio fiscal. Sin capturar los mismos datos dos veces.',
    bullets: ['CFDI 4.0', 'Desde la cotización aceptada', 'PDF y XML para tu cliente'],
  },
];

// El papel de cada módulo. Es SU color en toda la página: el mismo en la
// pieza del hero y en su tarjeta de la plataforma, para que quien vio la
// pieza lima de Reservas arriba la reconozca abajo sin leer el nombre.
//
// Solo colores de la marca, y cada par de texto pasa contraste sobre su
// papel. Las opacidades son de la escala de Tailwind (70, 75): una que no
// está en la escala (/72) no genera la clase y el texto hereda blanco —
// pasó, y la pieza de Cotizaciones salió en blanco sobre lila.
export type Papel = {
  fondo: string;
  texto: string;
  sutil: string;
  /** Color del ícono de check y de los detalles. */
  marca: string;
  /** Solo la pieza blanca: sobre la hoja blanca necesita su orilla. */
  orilla?: string;
};

export const PAPEL_DEL_MODULO: Record<string, Papel> = {
  reservas: {
    fondo: 'bg-[#D4F23A]',
    texto: 'text-[#14092E]',
    sutil: 'text-[#14092E]/75',
    marca: 'text-[#14092E]',
  },
  reuniones: {
    fondo: 'bg-white',
    texto: 'text-[#14092E]',
    sutil: 'text-[#14092E]/70',
    marca: 'text-[#5B34E8]',
    orilla: 'ring-2 ring-inset ring-[#14092E]',
  },
  cotizaciones: {
    fondo: 'bg-[#DDD0F6]',
    texto: 'text-[#14092E]',
    sutil: 'text-[#14092E]/75',
    marca: 'text-[#5B34E8]',
  },
  facturacion: {
    fondo: 'bg-[#1B1040]',
    texto: 'text-white',
    sutil: 'text-[#C9C2EE]',
    marca: 'text-[#D4F23A]',
  },
};
