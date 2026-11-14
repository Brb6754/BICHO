import type { MetadataRoute } from 'next';
import { PREFIXED_SUBDOMAINS, ROOT_ALIAS_SUBDOMAINS } from '@/lib/domains';

// robots.txt depende del host: proxy.ts no reescribe archivos con
// extensión, así que /robots.txt de CUALQUIER subdominio llega a
// app/robots.ts, y cada tipo de host necesita reglas distintas.

const PRIVADO_NEGOCIO = ['/dashboard', '/panel', '/login', '/reset-password', '/auth', '/cotizacion', '/tarjeta', '/reservar/cita'];
const PRIVADO_RAIZ = ['/admin', '/vendedor', '/t/', '/plataforma/', '/api/', '/dashboard', '/panel'];

export function reglasRobots(host: string, rootDomain: string, sitemapUrl: string): MetadataRoute.Robots {
  const hostname = host.split(':')[0].toLowerCase();
  const root = rootDomain.split(':')[0].toLowerCase();
  const nada: MetadataRoute.Robots = { rules: { userAgent: '*', disallow: '/' } };

  if (hostname === root || hostname === `www.${root}`) {
    return { rules: { userAgent: '*', allow: '/', disallow: PRIVADO_RAIZ }, sitemap: sitemapUrl };
  }
  // Previews de Vercel u otro host ajeno: que no compitan con producción.
  if (!hostname.endsWith(`.${root}`)) return nada;

  const sub = hostname.slice(0, -(root.length + 1));
  if (PREFIXED_SUBDOMAINS[sub]) return nada; // admin.*, vendedores.*
  if (ROOT_ALIAS_SUBDOMAINS[sub]) return { rules: { userAgent: '*', allow: '/', disallow: PRIVADO_RAIZ } };
  // La página pública de un negocio sí se indexa; su panel y sus links privados no.
  return { rules: { userAgent: '*', allow: '/', disallow: PRIVADO_NEGOCIO } };
}
