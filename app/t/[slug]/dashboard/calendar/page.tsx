import { productosDe } from '@/lib/products';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { NewBookingForm } from './NewBookingForm';
import { AgendaCalendario } from './AgendaCalendario';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { tenantBookingPageUrl } from '@/lib/urls';
import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { conAnticipo } from '@/lib/anticiposPanel';
import { addDaysKey, dayKey, instantFromLocal } from '@/lib/dates/tenantTime';
import { fechaDeParam, rangoDeCarga } from '@/lib/agenda/calendario';
import { esServicio } from '@/lib/meetings/kinds';

// AGENDA: calendario Día / Semana / Mes (AgendaCalendario). El servidor
// manda el mes entero de ?fecha= (o de hoy); el resto pasa en el cliente.
// Las horas siempre en la zona del negocio (lib/dates/tenantTime), nunca la
// del servidor (UTC en Vercel).
export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ nueva?: string; fecha?: string; dia?: string; hora?: string; quien?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  // ?nueva=1 abre "Agendar una cita" ya desplegado: es a donde llevan el
  // botón de esta página, el del inicio y el atajo del teléfono. Tocar
  // una hora libre del calendario suma &dia=&hora=&quien=.
  const abrirNueva = Boolean(sp.nueva);
  // Sin el producto de citas, esta pantalla no aplica. Redirige en vez
  // de 404: un 404 dentro del propio panel se lee como un error del
  // sistema, no como "no contrataste esto".
  const productos = await productosDe(slug);
  if (!productos.reservas) redirect('/dashboard');

  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id, name, timezone').eq('slug', slug).single();

  const now = new Date();
  const tz = tenant?.timezone ?? null;

  // El mes del calendario (semanas completas), en la zona del negocio.
  const hoy = dayKey(now, tz);
  const fecha = fechaDeParam(sp.fecha, hoy);
  const rango = rangoDeCarga(fecha);
  const { data: raw } = await supabase
    .from('bookings')
    .select(
      'id, starts_at, ends_at, status, resource_id, service_type_id, resources(name), service_types(name), customers(name, phone)'
    )
    .eq('tenant_id', tenant!.id)
    .gte('starts_at', instantFromLocal(rango.desde, '00:00', tz))
    .lt('starts_at', instantFromLocal(addDaysKey(rango.hasta, 1), '00:00', tz))
    .order('starts_at')
    .limit(1000);

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

  // Anticipo de cada cita (db/061), en consulta aparte: sin la migración falla sola y la agenda sigue igual.
  const { data: anticipos } = await supabase
    .from('bookings')
    .select('id, deposit_status, hold_expires_at')
    .eq('tenant_id', tenant!.id)
    .not('deposit_status', 'is', null)
    .gte('starts_at', instantFromLocal(rango.desde, '00:00', tz))
    .lt('starts_at', instantFromLocal(addDaysKey(rango.hasta, 1), '00:00', tz));

  const bookings = conAnticipo((raw ?? []) as unknown as AgendaBooking[], anticipos);

  // Una columna por persona: las activas, más quien ya no está activa pero
  // tiene citas en este mes (si no, esas citas no tendrían dónde dibujarse).
  const personas = [...(resources ?? [])];
  for (const b of bookings) {
    if (b.resource_id && !personas.some((p) => p.id === b.resource_id)) {
      personas.push({ id: b.resource_id, name: b.resources?.name ?? 'Sin nombre' });
    }
  }

  const puedeAgendar = services.length > 0 && (resources ?? []).length > 0;
  const fechaValida = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const botonAgendar = (texto: string) => (
    <Link
      href="?nueva=1#agendar"
      scroll={false}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <Plus className="h-5 w-5" aria-hidden="true" />
      {texto}
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Tus citas en calendario. Toca una para moverla, cancelarla, anotar si vino o cobrarla."
        help={
          <HelpTip title="¿Qué hago con cada cita?">
            Toca la cita. Antes de la hora puedes <strong>Mover</strong>la o <strong>Cancelar</strong>la: la hora
            queda libre otra vez en tu página. Cuando ya pasó, toca <strong>Vino</strong> o{' '}
            <strong>No vino</strong>. Eso solo se anota en la ficha de la clienta; a ella no le llega ningún
            mensaje. Si vino y tienes Caja, de ahí la <strong>cobras</strong>.
          </HelpTip>
        }
        action={puedeAgendar ? botonAgendar('Agendar cita') : undefined}
      />

      {!puedeAgendar && (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-3 text-base leading-relaxed text-muted">
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
        <NewBookingForm
          slug={slug}
          services={services}
          resources={resources ?? []}
          timezone={tz}
          quien={sp.quien}
          dia={fechaValida(sp.dia)}
          hora={sp.hora && /^\d{2}:\d{2}$/.test(sp.hora) ? sp.hora : undefined}
        />
      )}

      <div className="mt-6">
        <AgendaCalendario
          citas={bookings}
          personas={personas}
          timezone={tz}
          ahora={now.toISOString()}
          fecha={fecha}
          rango={rango}
          slug={slug}
          negocio={tenant?.name ?? ''}
          linkReservas={tenantBookingPageUrl(slug)}
          puedeAgendar={puedeAgendar}
          cajaHref={productos.caja ? '/dashboard/caja' : null}
        />
      </div>
    </div>
  );
}
