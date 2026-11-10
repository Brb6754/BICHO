import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { PostsVista } from '@/components/tenant-dash/PostsVista';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { catalogoDemo, contextoDemo, generacionDemo, historialDemo } from '@/lib/posts/demo';
import type { Pedido, RespGenerar } from '@/lib/posts/datos';

export const dynamic = 'force-dynamic';

// Posts con IA en el panel de demostración: la MISMA vista del panel
// real, con textos pre-escritos (sin Claude) e imagen real.
export default async function PostsDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  async function generar(pedido: Pedido): Promise<RespGenerar> {
    'use server';
    const d = await cargarPanelDemo(slug);
    if (!d) return { ok: false, error: 'Demo no disponible.' };
    const ctx = contextoDemo(d, slug, pedido);
    return { ok: true, restantes: 30, generacion: generacionDemo(ctx, `demo-${d.now.getTime()}`, d.now.toISOString()) };
  }

  return (
    <div>
      <PageHeader
        title="Posts con IA"
        description="Textos para tus redes con tus precios y horarios reales, y una imagen con tu marca lista para subir."
      />
      <PostsVista slug={slug} catalogo={catalogoDemo(datos)} usadas={0} historial={historialDemo(datos, slug)} generar={generar} demo />
    </div>
  );
}
