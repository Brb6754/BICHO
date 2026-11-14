import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { reglasRobots } from '@/lib/seo/robots';
import { urlAbsoluta } from '@/lib/seo/sitio';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') ?? '';
  return reglasRobots(host, process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000', urlAbsoluta('/sitemap.xml'));
}
