// SEO de bichomx.com: la URL canónica del sitio, los demos y el JSON-LD.
// Puro (sin React ni red) para poder probarlo (sitio.test.ts).

import { PLANES, PLAN_IDS } from '@/lib/billing/planes';

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'bichomx.com';
const ESQUEMA = ROOT.startsWith('localhost') ? 'http' : 'https';

/** "https://bichomx.com" — la base de toda canonical, sin importar el host que sirvió la página. */
export const SITE_URL = `${ESQUEMA}://${ROOT}`;

export function urlAbsoluta(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** La página pública de un demo: su subdominio, igual que la de un cliente. */
export function urlDemo(slug: string, path = ''): string {
  return `${ESQUEMA}://${slug}.${ROOT}${path}`;
}

// TODO(Bruno): el número de WhatsApp de bicho, solo dígitos con lada de país
// (ej. '5216181234567'). Mientras sea null, el botón flotante no se pinta.
export const WHATSAPP_CONTACTO: string | null = null;
export const CORREO_CONTACTO = 'nonameynk@gmail.com';

export function urlWhatsApp(numero: string, texto: string): string {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
}

/** La imagen OG generada (app/og/route.tsx) para un título. */
export function urlOg(titulo: string): string {
  return urlAbsoluta(`/og?t=${encodeURIComponent(titulo.replace(/ · bicho$/, '').slice(0, 90))}`);
}

/** Metadata estándar de una página de marketing: canonical absoluta + OG + Twitter. */
export function metaPagina({ titulo, descripcion, path }: { titulo: string; descripcion: string; path: string }) {
  const url = urlAbsoluta(path);
  const images = [{ url: urlOg(titulo), width: 1200, height: 630, alt: titulo }];
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: { title: titulo, description: descripcion, url, siteName: 'bicho', locale: 'es_MX', type: 'website' as const, images },
    twitter: { card: 'summary_large_image' as const, title: titulo, description: descripcion, images: images.map((i) => i.url) },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────────

export type Faq = { q: string; a: string };

export function ldOrganizacion() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'bicho',
    url: SITE_URL,
    logo: urlAbsoluta('/logo.png'),
    email: CORREO_CONTACTO,
    areaServed: 'MX',
    sameAs: ['https://www.instagram.com/bichomx_ai/'],
  };
}

export function ldSoftware(descripcion: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'bicho',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'es-MX',
    url: SITE_URL,
    description: descripcion,
    offers: PLAN_IDS.map((id) => ({
      '@type': 'Offer',
      name: `Plan ${PLANES[id].nombre}`,
      price: PLANES[id].precio.toFixed(2),
      priceCurrency: 'MXN',
      description: PLANES[id].resumen,
      url: urlAbsoluta(`/registro?plan=${id}`),
    })),
  };
}

export function ldFaq(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function ldMigas(migas: { nombre: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: migas.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.nombre, item: urlAbsoluta(m.path) })),
  };
}

export function ldArticulo({ titulo, descripcion, path, fecha }: { titulo: string; descripcion: string; path: string; fecha: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: titulo,
    description: descripcion,
    inLanguage: 'es-MX',
    datePublished: fecha,
    dateModified: fecha,
    mainEntityOfPage: urlAbsoluta(path),
    author: { '@type': 'Organization', name: 'bicho', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'bicho', logo: { '@type': 'ImageObject', url: urlAbsoluta('/logo.png') } },
    image: urlOg(titulo),
  };
}
