// The portfolio, as data. One object per project — adding the next one
// is adding an entry here, not writing another card component.
//
// Real screenshots (public/portfolio/), real links. Bruno's call, and
// the right one: a studio's portfolio is the pages it shipped. An
// earlier version embedded the live reservas hero in a browser frame
// instead — he had it removed, and it deserved removing: a second
// site's violet bleeding into this page fought with it, and a cropped
// live render is a worse picture of the work than a screenshot of it.
export type Project = {
  slug: string;
  name: string;
  tag: string;
  blurb: string;
  stack: string[];
  image: string;
  href: string;
  external?: boolean;
  // A second, separate action: "open the actual running product".
  demoHref?: string;
};

export const PROJECTS: Project[] = [
  {
    slug: 'reservas',
    name: 'bicho reservas',
    tag: 'Producto propio',
    blurb:
      'Plataforma de citas en línea para negocios de servicios: página de reservas con la marca de cada negocio, disponibilidad real y panel para el dueño.',
    stack: ['Next.js', 'Supabase', 'Postgres', 'Vercel'],
    image: '/portfolio/bicho-reservas.png',
    href: '/reservas',
    // The card's own link goes to the product's landing; this second
    // one goes straight into the working software. Only this project
    // has it, because it's the only one we can hand someone the keys to.
    demoHref: '/plataforma',
  },
  {
    slug: 'choose',
    name: 'Choose',
    tag: 'Plataforma EdTech',
    blurb:
      'Orientación vocacional para estudiantes de preparatoria: un test que perfila intereses y aptitudes, y cruza el resultado con carreras y universidades reales.',
    stack: ['Django', 'Next.js', 'React'],
    image: '/portfolio/choose.webp',
    // TODO(Bruno): mismo caso que Nova Solar — pásame la URL pública y
    // la cambio por el link real (con external: true).
    href: '#portafolio',
  },
  {
    slug: 'nova-solar',
    name: 'Nova Solar Durango',
    tag: 'Sitio a medida',
    blurb:
      'Rediseño completo del sitio de una empresa de paneles solares: identidad oscura, cotizador por recibo de CFE y contacto directo por WhatsApp.',
    stack: ['Astro', 'Tailwind', 'React'],
    image: '/portfolio/nova-solar.png',
    // TODO(Bruno): pásame la URL pública de Nova Solar y la cambio aquí
    // por el link real (con external: true) — hoy no la tengo.
    href: '#portafolio',
  },
];
