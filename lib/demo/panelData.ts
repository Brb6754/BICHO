import { createClient } from '@/lib/supabase/server';
import { isDemoSlug } from '@/lib/domains';
import { demoAgendaDeNegocio } from '@/lib/demo/panelFixtures';
import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';

// Todo lo que las seis pantallas del panel de demostración necesitan,
// cargado una vez y en el mismo sitio.
//
// Las cinco pantallas que no son el Resumen podrían leer esto por su
// cuenta, pero entonces cada una decidiría por separado qué es "el
// catálogo" y qué cuenta como cita — y la primera vez que una difiriera
// de otra, el panel enseñaría dos verdades distintas del mismo negocio
// en dos pestañas.

export type PanelDemo = {
  tenant: {
    id: string;
    name: string;
    timezone: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl: string | null;
    resourceLabel: string | null;
    location: string | null;
  };
  services: { id: string; name: string; duration_minutes: number; price_cents: number }[];
  resources: { id: string; name: string }[];
  schedules: { resource_id: string; day_of_week: number; starts_at: string; ends_at: string }[];
  citas: AgendaBooking[];
  now: Date;
};

export async function cargarPanelDemo(slug: string): Promise<PanelDemo | null> {
  if (!isDemoSlug(slug)) return null;

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, timezone, primary_color, secondary_color, accent_color, logo_url, resource_label, location')
    .eq('slug', slug)
    .maybeSingle();
  if (!tenant) return null;

  const [{ data: services }, { data: resources }, { data: schedules }] = await Promise.all([
    supabase
      .from('service_types')
      .select('id, name, duration_minutes, price_cents')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('name'),
    supabase.from('resources').select('id, name').eq('tenant_id', tenant.id).eq('active', true).order('name'),
    supabase
      .from('resource_schedules')
      .select('resource_id, day_of_week, starts_at, ends_at')
      .eq('tenant_id', tenant.id)
      .order('day_of_week'),
  ]);

  const timezone = tenant.timezone ?? 'America/Mexico_City';
  const now = new Date();

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      timezone,
      primaryColor: tenant.primary_color ?? '#4F46E5',
      secondaryColor: tenant.secondary_color ?? '#7C3AED',
      accentColor: tenant.accent_color ?? '#22D3EE',
      logoUrl: tenant.logo_url ?? null,
      resourceLabel: tenant.resource_label ?? null,
      location: tenant.location ?? null,
    },
    services: services ?? [],
    resources: resources ?? [],
    schedules: schedules ?? [],
    citas: demoAgendaDeNegocio(
      { slug, timezone, services: services ?? [], resources: resources ?? [] },
      now
    ),
    now,
  };
}
