import { CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { cancelBooking } from './actions';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { EmptyState } from '@/components/ui/EmptyState';

type BookingRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  resources: { name: string } | null;
  service_types: { name: string } | null;
  customers: { name: string } | null;
};

export default async function CalendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single();

  const { data: bookingsRaw } = await supabase
    .from('bookings')
    .select('id, starts_at, ends_at, status, resources(name), service_types(name), customers(name)')
    .eq('tenant_id', tenant!.id)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(50);

  const bookings = bookingsRaw as unknown as BookingRow[] | null;

  return (
    <div>
      <Text variant="h1">Calendario</Text>
      <Text variant="body" className="mt-1 text-muted">
        Próximas citas (hasta 50).
      </Text>

      <ul className="mt-6 flex flex-col gap-3">
        {bookings?.map((b) => (
          <li key={b.id}>
            <Card padded={false} className="flex items-center justify-between px-6 py-4">
              <span className="text-ink">
                <span className="font-medium">
                  {new Date(b.starts_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>{' '}
                <span className="text-muted">
                  — {b.resources?.name} — {b.service_types?.name} — {b.customers?.name}
                </span>
                {b.status === 'cancelled' && (
                  <Badge tone="danger" className="ml-2">
                    cancelada
                  </Badge>
                )}
                {b.status === 'completed' && (
                  <Badge tone="muted" className="ml-2">
                    completada
                  </Badge>
                )}
              </span>
              {b.status === 'confirmed' && (
                <ConfirmForm
                  action={cancelBooking.bind(null, b.id, slug)}
                  confirmTitle="Cancelar cita"
                  confirmMessage="¿Seguro que quieres cancelar esta cita? Se notificará como cancelada y el horario quedará libre de nuevo."
                  confirmLabel="Cancelar cita"
                  triggerClassName="px-4 py-1.5 text-xs"
                >
                  Cancelar
                </ConfirmForm>
              )}
            </Card>
          </li>
        ))}
      </ul>
      {bookings?.length === 0 && (
        <Card className="mt-6">
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
