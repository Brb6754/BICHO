import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { PostsVista } from '@/components/tenant-dash/PostsVista';
import { cargarPosts, type Pedido } from '@/lib/posts/datos';
import { generarPost } from './actions';
import { Bloqueado } from '../plan/Bloqueado';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DESCRIPCION = 'Textos e imágenes para tus redes, con tus precios y horarios reales.';

// POSTS CON IA (db/048).
export default async function PostsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  if (!(await productosDe(slug)).posts) {
    const { data: t } = await createAdminClient().from('tenants').select('plan').eq('id', tenantId).maybeSingle();
    return (
      <div>
        <PageHeader title="Posts con IA" description={DESCRIPCION} />
        <Bloqueado
          modulo="posts"
          plan={t?.plan}
          ejemplo="/panel/posts"
          ganas={[
            'Tres textos listos para Instagram, Facebook o WhatsApp en segundos.',
            'Con tus precios y tus horarios libres de verdad, no inventados.',
            'Una imagen con tus colores, lista para descargar y subir.',
          ]}
        />
      </div>
    );
  }

  const datos = await cargarPosts(tenantId, timezone);
  const header = <PageHeader title="Posts con IA" description={DESCRIPCION} />;

  if (datos.falta) {
    return (
      <div>
        {header}
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          {/* Sin db/048_posts_ia.sql corrida. */}
          <p className="text-[15px] font-medium text-ink">Estamos terminando de activar esto en tu cuenta</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Falta un paso de nuestro lado. Escríbenos y te avisamos en cuanto quede listo.
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
