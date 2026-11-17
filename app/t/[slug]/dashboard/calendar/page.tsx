import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { cancelBooking } from './actions';
import { NewBookingForm } from './NewBookingForm';
import { RescheduleButton } from './RescheduleButton';
import { AttendanceButtons } from './AttendanceButtons';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { ShareLink } from '@/components/tenant-dash/ui/ShareLink';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { tenantBookingPageUrl } from '@/lib/urls';
import { AgendaList, type AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { dayKey, formatTime } from '@/lib/dates/tenantTime';
import { esServicio } from '@/lib/meetings/kinds';

// AGENDA. Same AgendaList as the Resumen — one component for "a list of
// appointments" across the whole dashboard, so a booking reads the same
// wherever you meet it. The old page was one card per booking with the
// date repeated on every row and the times formatted in the server's
// timezone (UTC on Vercel).
export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ nueva?: string }>;
}) {
  const { slug } = await params;
  // ?nueva=1 abre "Agendar una cita" ya desplegado: es a donde llevan el
  // botón de esta página, el del inicio y el atajo del teléfono.
  const abrirNueva = Boolean((await searchParams).nueva);
  // Sin el producto de citas, esta pantalla no aplica. Redirige en vez
  // de 404: un 404 dentro del propio panel se lee como un error del
  // sistema, no como "no contrataste esto".
  const productos = await productosDe(slug);
  if (!productos.reservas) redirect('/dashboard');

  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id, name, timezone').eq('slug', slug).single();

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
  const [{ data: services_raw }, { data: resources }] = await Promise.all([
    supabase
      .from('service_types')
      // `*` y no la lista de columnas, para poder separar servicios de
      // tipos de reunión (db/039) aunque la migración no esté corrida.
      .select('*')
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

  // Un tipo de reunión no se agenda desde aquí: tiene su propia
  // pantalla, con los campos que una reunión necesita (empresa,
  // dirección) y que este formulario no pide.
  const services = (services_raw ?? []).filter(esServicio) as unknown as {
    id: string;
    name: string;
    duration_minutes: number;
  }[];

  const todayKey = dayKey(now, tz);
  const bookings = ((raw ?? []) as unknown as AgendaBooking[]).filter((b) => dayKey(b.starts_at, tz) >= todayKey);
  const active = bookings.filter((b) => b.status === 'confirmed').length;

  const puedeAgendar = services.length > 0 && (resources ?? []).length > 0;
  const botonAgendar = (texto: string) => (
    <Link
      href="?nueva=1#agendar"
      scroll={false}
      className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {texto}
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Agenda"
        eyebrow={
          active > 0 ? `${active} ${active === 1 ? 'cita' : 'citas'} de hoy en adelante` : undefined
        }
        description="Tus citas día por día. Muévelas, cancélalas o anota si la clienta vino."
        help={
          <HelpTip title="¿Qué hago con cada cita?">
            Antes de la cita puedes <strong>Mover</strong>la a otra hora o <strong>Cancelar</strong>la:
            la hora queda libre otra vez en tu página. Cuando ya pasó, toca <strong>Vino</strong> o{' '}
            <strong>No vino</strong>. Eso solo se anota en la ficha de la clienta, para que sepas quién
            falta seguido; a ella no le llega ningún mensaje.
          </HelpTip>
        }
        action={puedeAgendar && !abrirNueva ? botonAgendar('Agendar cita') : undefined}
      />

      {!puedeAgendar && (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-3 text-sm leading-relaxed text-muted">
          Para agendar citas a mano primero necesitas{' '}
          {services.length === 0 ? (
            <Link href="/dashboard/services" className="font-medium text-ink underline underline-offset-4">
              un servicio
            </Link>
          ) : (
            <Link href="/dashboard/resources" className="font-medium text-ink underline underline-offset-4">
              alguien que atienda
            </Link>
          )}
          .
        </p>
      )}

      {puedeAgendar && abrirNueva && (
        <div className="mt-6">
          <NewBookingForm
            slug={slug}
            services={services}
            resources={resources ?? []}
            timezone={tz}
          />
        </div>
      )}

      <div className="mt-8">
        <AgendaList
          bookings={bookings}
          timezone={tz}
          now={now}
          emptyTitle="No tienes citas próximas"
          emptyHint="Cuando una clienta reserve desde tu link, aparece aquí, día por día. Si alguien te llama, agéndala tú."
          emptyAction={
            <>
              {puedeAgendar && botonAgendar('Agendar una cita')}
              <ShareLink url={tenantBookingPageUrl(slug)} slug={slug} negocio={tenant?.name} />
            </>
          }
          renderAction={(b) => {
            // An appointment that has already ended asks a different
            // question than one that hasn't. Before it happens the
            // owner may need to move or call it off; after it happens
            // the only thing left to record is whether the customer
            // turned up.
            const over = new Date(b.ends_at) <= now;

            if (over) {
              return (
                <AttendanceButtons
                  bookingId={b.id}
                  slug={slug}
                  customerName={b.customers?.name ?? 'La clienta'}
                />
              );
            }

            const quien = b.customers?.name ?? 'esta clienta';
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
                  success="Cita cancelada: la hora quedó libre"
                  confirmTitle={`¿Cancelar la cita de ${quien}?`}
                  confirmMessage={`${b.service_types?.name ?? 'La cita'}, ${formatTime(b.starts_at, tz)}. La hora vuelve a quedar libre en tu página. A ${quien} no le avisamos nosotros: si no lo sabe, escríbele.`}
                  confirmLabel="Sí, cancelar cita"
                  dismissLabel="No, dejarla"
                  triggerClassName="min-h-[2.75rem] px-4 text-[13px]"
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
