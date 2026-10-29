import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { productosDe } from '@/lib/products';
import ReservarPage, {
  generateMetadata as metadataReservar,
  generateViewport as viewportReservar,
} from './reservar/page';
import ReunionesPublicPage, {
  generateMetadata as metadataReuniones,
  generateViewport as viewportReuniones,
} from './reuniones/page';

// The root of a business's address ({slug}.dominio/) IS its public page.
// Rendered in place rather than redirected: a redirect to "/reservar" is
// only correct on the subdomain, and would 404 when the page is reached
// through the path-based /t/{slug} form.
//
// WHICH public page depends on what the business has. It used to always
// be the booking page, which 404s for a business without citas (Nova
// Solar only books reuniones): the bare address — the one a customer
// types after hearing the name — was a dead end.
type Props = { params: Promise<{ slug: string }> };

async function cual(params: Props['params']): Promise<'reservar' | 'reuniones' | null> {
  const { slug } = await params;
  const p = await productosDe(slug);
  if (p.reservas) return 'reservar';
  if (p.reuniones) return 'reuniones';
  return null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return (await cual(props.params)) === 'reuniones' ? metadataReuniones(props) : metadataReservar(props);
}

export async function generateViewport(props: Props): Promise<Viewport> {
  return (await cual(props.params)) === 'reuniones' ? viewportReuniones(props) : viewportReservar(props);
}

export default async function TenantRoot(props: Props) {
  const pagina = await cual(props.params);
  if (pagina === 'reservar') return ReservarPage(props);
  if (pagina === 'reuniones') return ReunionesPublicPage(props);
  notFound();
}
