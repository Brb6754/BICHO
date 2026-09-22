import { CalendarClock, Code2, Bot, LineChart } from 'lucide-react';

// The four things bicho does, as one suite — Bruno's framing: "que se
// sienta como un conjunto de servicios". They're ordered by how
// concrete the proof is, not by how impressive they sound: the first
// two have shipped work behind them in the portfolio below, the last
// two are the studio's own direction (Data Science/AI for business is
// what Bruno is training for, so they belong here, stated plainly and
// without pretending there's a case study that doesn't exist yet).
//
// `proof` is what the card can honestly claim today. Nothing here says
// "cientos de clientes" or invents a metric.
export type Service = {
  id: string;
  Icon: typeof CalendarClock;
  name: string;
  blurb: string;
  bullets: string[];
  proof: string;
};

export const SERVICES: Service[] = [
  {
    id: 'saas',
    Icon: CalendarClock,
    name: 'SaaS a la medida',
    blurb:
      'Productos de software completos, con su base de datos, sus permisos y su panel. bicho reservas es el nuestro, en producción.',
    bullets: ['Multi-tenant', 'Panel de administración', 'Pagos y suscripciones'],
    proof: 'Producto propio en producción',
  },
  {
    id: 'web',
    Icon: Code2,
    name: 'Páginas y apps web',
    blurb:
      'Sitios que se programan, no plantillas que se rellenan: rápidos, responsivos y con el contenido que tu negocio de verdad necesita.',
    bullets: ['Landing pages', 'Sitios corporativos', 'Integración con WhatsApp'],
    proof: 'Nova Solar, de cero a producción',
  },
  {
    id: 'ia',
    Icon: Bot,
    name: 'Agentes de IA',
    blurb:
      'Asistentes que contestan, clasifican y hacen el trabajo repetitivo: atención a clientes, seguimiento de leads y procesos internos.',
    bullets: ['Atención automatizada', 'Clasificación de leads', 'Automatización interna'],
    proof: 'Sobre tus propios datos',
  },
  {
    id: 'data',
    Icon: LineChart,
    name: 'Data Science para finanzas y marketing',
    blurb:
      'Tus números convertidos en decisiones: qué campaña deja dinero, qué cliente se va a ir y cuánto vas a vender el mes que entra.',
    bullets: ['Dashboards', 'Modelos de predicción', 'Análisis de campañas'],
    proof: 'Análisis y modelos a medida',
  },
];
