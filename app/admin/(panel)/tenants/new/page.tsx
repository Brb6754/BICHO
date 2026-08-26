import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { NewTenantForm } from './NewTenantForm';

export default async function NewTenantPage() {
  const admin = createAdminClient();
  const { data: templates } = await admin.from('templates').select('vertical, name').order('name');

  return (
    <div>
      <Link href="/tenants" className="text-sm text-muted hover:underline">
        ← Tenants
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Nuevo tenant</h1>
      <p className="mt-1 text-muted">
        Elige la plantilla (vertical) que va a usar su página pública de reserva. Recursos, servicios y
        horarios se configuran después, desde el dashboard del negocio.
      </p>

      <div className="mt-6">
        <NewTenantForm verticals={templates ?? []} />
      </div>
    </div>
  );
}
