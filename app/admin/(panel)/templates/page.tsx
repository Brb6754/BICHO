import { createAdminClient } from '@/lib/supabase/admin';
import { TemplateCard } from '@/components/admin/TemplateCard';

export default async function TemplatesPage() {
  const admin = createAdminClient();

  const { data: templates } = await admin
    .from('templates')
    .select('id, vertical, name, features, available, accent_color')
    .order('created_at');

  const { data: tenants } = await admin.from('tenants').select('vertical');
  const countByVertical = (tenants ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.vertical] = (acc[t.vertical] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Plantillas por vertical</h1>
      <p className="mt-1 text-muted">
        Configuración por defecto que cada tenant hereda al elegir su tipo de negocio.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {templates?.map((t) => (
          <TemplateCard key={t.id} template={t} tenantCount={countByVertical[t.vertical] ?? 0} />
        ))}
      </div>
    </div>
  );
}
