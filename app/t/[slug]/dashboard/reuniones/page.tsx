import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ReunionesBoard } from '@/components/tenant-dash/ReunionesBoard';
import type { MeetingEntry } from '@/lib/meetings/pipeline';
import type { Resultado } from '@/lib/meetings/kinds';

export const dynamic = 'force-dynamic';

// REUNIONES — el pipeline comercial.
//
// Lee con service_role por el mismo motivo que cotizaciones: las
// reuniones viven en `bookings`, que tiene RLS con CERO policies, y
// guardan teléfono, empresa y el domicilio de un prospecto. Con el
// cliente atado a la cookie no habría error, habría cero filas — el
// silencio que ya mordió a este proyecto con `templates`.
//
// El orden de la pantalla es una opinión: primero lo que ya pasó y
// nadie capturó. Un embudo con huecos no es un embudo, y la única
// persona que puede taparlos es la que está viendo esta pantalla.

export default async function ReunionesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone } = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.reuniones) redirect('/dashboard');

  const db = createAdminClient();

  const { data: raw, error } = await db
    .from('bookings')
    .select(
      'id, starts_at, ends_at, status, kind, modality, address, company, outcome, quote_id, service_types(name), customers(name, phone, contact_id)'
    )
    .eq('tenant_id', tenantId)
    .eq('kind', 'reunion')
    .order('starts_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <PageHeader title="Reuniones" />
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/039_reuniones.sql</code>{' '}
            en el SQL Editor de Supabase y recarga esta página.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: tipos }, { data: asesores }] = await Promise.all([
    db
      .from('service_types')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('kind', 'reunion')
      .eq('active', true)
      .order('name'),
    db
      .from('resources')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('name'),
  ]);

  const entries: MeetingEntry[] = (
    (raw ?? []) as unknown as {
      id: string;
      starts_at: string;
      ends_at: string;
      status: string;
      modality: string | null;
      address: string | null;
      company: string | null;
      outcome: Resultado | null;
      quote_id: string | null;
      service_types: { name: string } | null;
      customers: { name: string; phone: string | null; contact_id: string | null } | null;
    }[]
  ).map((b) => ({
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    status: b.status,
    tipo: b.service_types?.name ?? 'Reunión',
    modality: b.modality,
    contactName: b.customers?.name ?? 'Sin nombre',
    contactId: b.customers?.contact_id ?? null,
    company: b.company,
    phone: b.customers?.phone ?? null,
    address: b.address,
    outcome: b.outcome,
    quoteId: b.quote_id,
  }));

  return (
    <ReunionesBoard
      slug={slug}
      timezone={timezone}
      entries={entries}
      tipos={(tipos ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        duration_minutes: t.duration_minutes,
        modality: t.modality ?? null,
      }))}
      asesores={asesores ?? []}
      now={new Date()}
    />
  );
}
