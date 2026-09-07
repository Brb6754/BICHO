import Link from 'next/link';
import { CalendarDays, Armchair, Tag, ArrowUpRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { MetricCard } from '@/components/admin/MetricCard';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';

type UpcomingBooking = {
  id: string;
  starts_at: string;
  resources: { name: string } | null;
  service_types: { name: string } | null;
  customers: { name: string } | null;
};

export default async function DashboardOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();

  const [{ count: resourceCount }, { count: serviceCount }, { count: upcomingCount }, { data: upcomingRaw }] =
    await Promise.all([
      supabase.from('resources').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant!.id),
      supabase.from('service_types').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant!.id),
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant!.id)
        .eq('status', 'confirmed')
        .gte('starts_at', new Date().toISOString()),
      supabase
        .from('bookings')
        .select('id, starts_at, resources(name), service_types(name), customers(name)')
        .eq('tenant_id', tenant!.id)
        .eq('status', 'confirmed')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(5),
    ]);

  const upcoming = upcomingRaw as unknown as UpcomingBooking[] | null;

  return (
    <div>
      <Text variant="h1">Resumen</Text>
      <Text variant="body" className="mt-1 text-muted">
        Lo esencial de tu negocio, de un vistazo.
      </Text>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Próximas citas" value={String(upcomingCount ?? 0)} icon={CalendarDays} emphasis />
        <MetricCard label="Recursos activos" value={String(resourceCount ?? 0)} icon={Armchair} />
        <MetricCard label="Servicios en catálogo" value={String(serviceCount ?? 0)} icon={Tag} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Text variant="h3">Próximas citas</Text>
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline dark:text-accent"
        >
          Ver todas
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {upcoming && upcoming.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-3">
          {upcoming.map((b) => (
            <li key={b.id}>
              <Card padded={false} className="flex items-center justify-between px-6 py-4">
                <span className="text-ink">
                  <span className="font-medium">
                    {new Date(b.starts_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>{' '}
                  <span className="text-muted">
                    — {b.resources?.name} — {b.service_types?.name} — {b.customers?.name}
                  </span>
                </span>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="mt-3">
          <EmptyState
            icon={CalendarDays}
            title="No hay citas próximas"
            description="En cuanto un cliente reserve desde tu página pública, va a aparecer aquí."
          />
        </Card>
      )}
    </div>
  );
}
