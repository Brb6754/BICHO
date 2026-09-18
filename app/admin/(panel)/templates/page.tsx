import { createAdminClient } from '@/lib/supabase/admin';
import { TemplateCard } from '@/components/admin/TemplateCard';

export default async function TemplatesPage() {
  const admin = createAdminClient();

  // select('*') on purpose: the card now also wants `blocks` (for the
  // live miniature) and `cover_image_url` (db/022). Naming them would
  // make the whole query fail in an environment where the migration
  // hasn't been run, taking the gallery down with it.
  const { data: templates } = await admin.from('templates').select('*').order('created_at');

  const { data: tenants } = await admin.from('tenants').select('vertical');
  const countByVertical = (tenants ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.vertical] = (acc[t.vertical] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Plantillas</h1>
      <p className="mt-1 max-w-prose text-muted">
        El punto de partida de cada negocio. Al dar de alta uno, su página arranca con una copia
        de la plantilla de su giro — y a partir de ahí se edita por separado, sin afectar a los
        demás.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {templates?.map((t) => (
          <TemplateCard key={t.id} template={t} tenantCount={countByVertical[t.vertical] ?? 0} />
        ))}
      </div>
    </div>
  );
}
