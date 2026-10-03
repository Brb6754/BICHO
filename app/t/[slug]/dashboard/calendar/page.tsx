import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cancelBooking } from './actions';
import { NewBookingForm } from './NewBookingForm';
import { RescheduleButton } from './RescheduleButton';
import { AttendanceButtons } from './AttendanceButtons';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AgendaList, type AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { dayKey } from '@/lib/dates/tenantTime';

// AGENDA. Same AgendaList as the Resumen — one component for "a list of
// appointments" across the whole dashboard, so a booking reads the same
// wherever you meet it. The old page was one card per booking with the
// date repeated on every row and the times formatted in the server's
// timezone (UTC on Vercel).
export default async function CalendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Sin el producto de citas, esta pantalla no aplica. Redirige en vez
  // de 404: un 404 dentro del propio panel se lee como un error del
  // sistema, no como "no contrataste esto".
  const productos = await productosDe(slug);
  if (!productos.reservas) redirect('/dashboard');

  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id, timezone').eq('slug', slug).single();

  const now = new Date();
  const tz = tenant?.timezone ?? null;

  // Start 24h back so the rest of TODAY (including appointments that
  // already started) is still on the agenda — the old query began at
  // "now" and silently dropped everything earlier in the same day.
  const { data: raw } = await supabase
    .from('bookings')
    .select(
      'id, starts_at, ends_at, status, resource_id, service_type_id, resources(name), service_types(name), customers(name, phone)'
    )
    .eq('tenant_id', tenant!.id)
    .gte('starts_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .order('starts_at')
    .limit(150);

  // The catalog the "agendar una cita" form works from. Only active rows:
  // the form must offer exactly what the public page offers.
  const [{ data: services }, { data: resources }] = await Promise.all([
    supabase
      .from('service_types')
      .select('id, name, duration_minutes')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('resources')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
  ]);

  const todayKey = dayKey(now, tz);
  const bookings = ((raw ?? []) as unknown as AgendaBooking[]).filter((b) => dayKey(b.starts_at, tz) >= todayKey);
  const active = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={
          active > 0
            ? `${active} ${active === 1 ? 'cita confirmada' : 'citas confirmadas'} de hoy en adelante.`
            : 'Todas tus citas, de hoy en adelante, en el orden del día.'
        }
      />

      <div className="mt-6">
        <NewBookingForm
          slug={slug}
          services={services ?? []}
          resources={resources ?? []}
          timezone={tz}
        />
      </div>

      <div className="mt-8">
        <AgendaList
          bookings={bookings}
          timezone={tz}
          now={now}
          emptyTitle="No hay citas próximas"
          emptyHint="En cuanto un cliente reserve desde tu página, va a aparecer aquí agrupada por día."
          renderAction={(b) => {
            // An appointment that has already ended asks a different
            // question than one that hasn't. Before it happens the
            // owner may need to move or call it off; after it happens
            // the only thing left to record is whether the customer
            // turned up. Showing both sets at once put four buttons on
            // a phone row and offered "cancelar" for an hour that is
            // already over.
            const over = new Date(b.ends_at) <= now;

            if (over) {
              return (
                <AttendanceButtons
                  bookingId={b.id}
                  slug={slug}
                  customerName={b.customers?.name ?? 'El cliente'}
                />
              );
            }

            return (
              <div className="flex flex-wrap items-center gap-2">
                {b.service_type_id && b.resource_id && (
                  <RescheduleButton
                    bookingId={b.id}
                    slug={slug}
                    serviceId={b.service_type_id}
                    serviceName={b.service_types?.name ?? 'La cita'}
                    resourceId={b.resource_id}
                    currentStart={b.starts_at}
                    timezone={tz}
                  />
                )}
                <ConfirmForm
                  action={cancelBooking.bind(null, b.id, slug)}
                  confirmTitle="Cancelar cita"
                  confirmMessage={`¿Cancelar ${b.service_types?.name ?? 'la cita'} de ${
                    b.customers?.name ?? 'este cliente'
                  }? El horario quedará libre de nuevo.`}
                  confirmLabel="Cancelar cita"
                  triggerClassName="px-3 py-1.5 text-xs"
                >
                  Cancelar
                </ConfirmForm>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
