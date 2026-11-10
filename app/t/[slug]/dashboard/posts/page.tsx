import { redirect } from 'next/navigation';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { PostsVista } from '@/components/tenant-dash/PostsVista';
import { cargarPosts, type Pedido } from '@/lib/posts/datos';
import { generarPost } from './actions';

export const dynamic = 'force-dynamic';

const DESCRIPCION = 'Textos para tus redes con tus precios y horarios reales, y una imagen con tu marca lista para subir.';

// POSTS CON IA (db/048).
export default async function PostsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  if (!(await productosDe(slug)).posts) redirect('/dashboard');

  const datos = await cargarPosts(tenantId, timezone);
  const header = <PageHeader title="Posts con IA" description={DESCRIPCION} />;

  if (datos.falta) {
    return (
      <div>
        {header}
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/048_posts_ia.sql</code> en el SQL Editor de
            Supabase y recarga esta página.
          </p>
        </div>
      </div>
    );
  }

  async function generar(pedido: Pedido) {
    'use server';
    return generarPost(slug, pedido);
  }

  return (
    <div>
      {header}
      <PostsVista slug={slug} catalogo={datos} usadas={datos.usadas} historial={datos.historial} generar={generar} />
    </div>
  );
}
