import { CalendarClock, FileText, ReceiptText } from 'lucide-react';

// La plataforma de bicho: tres módulos que se contratan por separado.
//
// Es contenido, no adorno: cada uno existe en el producto, tiene su
// interruptor por negocio y su sección en el panel. Lo que se dice aquí
// es lo que hace hoy — nada de "próximamente" disfrazado de presente, y
// nada de métricas inventadas.
//
// El orden es el del trabajo real de un negocio: primero agenda la
// cita, luego cotiza lo que no es una cita, y al final factura. Es
// también el orden en que se construyeron.
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
