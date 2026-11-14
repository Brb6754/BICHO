import type { MetadataRoute } from 'next';
import { FUNCIONES } from '@/lib/seo/funciones';
import { GIROS } from '@/lib/seo/giros';
import { GUIAS } from '@/lib/seo/guias';
import { urlAbsoluta, urlDemo } from '@/lib/seo/sitio';
import { slugDirectorio } from '@/lib/directorio/directorio';
import { negociosDelDirectorio } from '@/lib/directorio/servidor';

// Una vez por hora: el directorio crece con cada negocio que se publica.
export const revalidate = 3600;

// Los demos viven en subdominios. Google los acepta en este sitemap solo si
// Search Console tiene la propiedad de DOMINIO (bichomx.com, verificada por
// DNS), que cubre todos los subdominios.
const DEMOS = ['lima-laca', 'agua-serena', 'casa-luma', 'burbujas-bigotes', 'dental-nova', 'alto-padel', 'don-ramon', 'casa-norte'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pagina = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' = 'monthly') => ({
    url: urlAbsoluta(path),
    changeFrequency,
    priority,
  });

  let directorio: MetadataRoute.Sitemap = [];
  try {
    const negocios = await negociosDelDirectorio();
    const rutas = new Set<string>();
    for (const n of negocios) {
      const ciudad = slugDirectorio(n.ciudad);
      if (!ciudad) continue;
      rutas.add(`/negocios/${ciudad}`);
      rutas.add(`/negocios/${ciudad}/${slugDirectorio(n.vertical)}`);
    }
    directorio = [...rutas].map((p) => pagina(p, 0.5, 'weekly'));
  } catch (e) {
    // Sin base (build sin variables, red caída): el resto del sitemap igual sale.
    console.error('sitemap: directorio', e);
  }

  return [
    pagina('/', 1, 'weekly'),
    pagina('/registro', 0.8),
    pagina('/funciones', 0.8),
    ...FUNCIONES.map((f) => pagina(`/funciones/${f.slug}`, 0.8)),
    ...GIROS.map((g) => pagina(`/para/${g.slug}`, 0.9)),
    pagina('/guias', 0.6),
    ...GUIAS.map((g) => ({ ...pagina(`/guias/${g.slug}`, 0.7), lastModified: g.fecha })),
    pagina('/negocios', 0.6, 'weekly'),
    ...directorio,
    pagina('/estudio', 0.4),
    pagina('/privacidad', 0.2),
    pagina('/terminos', 0.2),
    ...DEMOS.map((s) => ({ url: urlDemo(s), changeFrequency: 'monthly' as const, priority: 0.4 })),
  ];
}
