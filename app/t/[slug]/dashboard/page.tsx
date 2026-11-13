import { productosDe } from '@/lib/products';
import { ResumenCotizaciones } from './ResumenCotizaciones';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { CopyLinkButton } from '@/components/tenant-dash/CopyLinkButton';
import { createClient } from '@/lib/supabase/server';
import { type AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { dayKey } from '@/lib/dates/tenantTime';
import { tenantBookingPageUrl } from '@/lib/urls';
import { esServicio } from '@/lib/meetings/kinds';
import { productosPorAcabarse } from '@/components/tenant-dash/AvisoInventario';
import { ResumenHoy, alertaInventario, alertaRegresan, dineroDe, type Alerta } from '@/components/tenant-dash/ResumenHoy';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { cargarCaja } from '@/lib/caja/datos';
import { createAdminClient } from '@/lib/supabase/admin';
import { estiloDe } from '@/lib/branding/dashEstilo';
import { ajustesDe, armarRegresan, type CitaRegresan } from '@/lib/regresan/armar';

// RESUMEN — rebuilt around the one question an owner has when they open
// this page: "what do I have today?"
//
// It used to open with three identical count cards — upcoming bookings,
// active resources, services in the catalogue. Two of those three are
// setup facts that don't change from one day to the next, so the most
// prominent thing on the home screen was information nobody needs forty
// times a day. Today's agenda is now the page.
//
// The counts didn't disappear, they changed job: if a business has no
// active service, no resource or no schedule, its public page literally
// cannot produce a bookable slot. That's not a statistic, it's a broken
// setup — so it's shown as a checklist of what's missing, and only when
// something IS missing.
export default async function DashboardOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('id, name, timezone').eq('slug', slug).single();

  // Un negocio que solo contrató cotizaciones no tiene agenda, ni
  // servicios, ni horario — y este Resumen está escrito entero
  // alrededor de "¿qué tengo hoy?". Enseñarle una agenda vacía y un
  // checklist pidiéndole que configure horarios que nunca va a usar
  // sería un panel roto el primer día.
  const productos = await productosDe(slug);
  if (!productos.reservas) {
    return <ResumenCotizaciones slug={slug} tenantName={tenant?.name ?? ''} now={new Date()} />;
  }

  const now = new Date();
  // Window wide enough to contain all of "today" in any timezone
  // (starting 24h back) and the week ahead. Which bookings belong to
  // today is decided afterwards by the tenant's LOCAL calendar day —
  // doing that arithmetic in the query would mean hand-computing UTC
  // offsets, which is exactly how the old page got days wrong.
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: raw }, { data: servicios }, { count: resourceCount }, { count: scheduleCount }, { data: conEstilo }] =
    await Promise.all([
      supabase
        .from('bookings')
        .select('id, starts_at, ends_at, status, resources(name), service_types(name), customers(name, phone)')
        .eq('tenant_id', tenant!.id)
        .gte('starts_at', from)
        .lte('starts_at', to)
        .order('starts_at'),
      // Se traen las filas en vez de pedir un count: el catálogo de un
      // negocio son unas cuantas, y un `count` no puede descontar los
      // tipos de reunión, que viven en la misma tabla (db/039). Un
      // "4 servicios en catálogo" que incluya "Visita técnica" manda a
      // alguien a buscar un servicio que no existe.
      supabase
        .from('service_types')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('active', true),
      supabase
        .from('resources')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant!.id)
        .eq('active', true),
      supabase.from('resource_schedules').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant!.id),
      // Estilo del panel (db/054), aparte: sin la columna esta consulta
      // falla sola, data queda null y el Resumen sale en clásico.
      supabase.from('tenants').select('dashboard_estilo').eq('id', tenant!.id).maybeSingle(),
    ]);

  const bookings = (raw ?? []) as unknown as AgendaBooking[];
  const tz = tenant?.timezone ?? null;
  const todayKey = dayKey(now, tz);

  const today = bookings.filter((b) => dayKey(b.starts_at, tz) === todayKey);
  const upcoming = bookings.filter((b) => dayKey(b.starts_at, tz) > todayKey && b.status === 'confirmed');

  const serviceCount = (servicios ?? []).filter(esServicio).length;

  const setup = [
    { done: serviceCount > 0, label: 'Agrega al menos un servicio', href: '/dashboard/services' },
    { done: (resourceCount ?? 0) > 0, label: 'Agrega quién o qué atiende', href: '/dashboard/resources' },
    { done: (scheduleCount ?? 0) > 0, label: 'Define tu horario de atención', href: '/dashboard/schedule' },
  ];
  const setupComplete = setup.every((s) => s.done);

  // Lo que pide atención y el dinero del día. Cada pieza solo si el
  // módulo está prendido, y cada una tolerante: sin su migración (o con
  // cualquier error) simplemente no aparece — el Resumen nunca se cae
  // por un módulo extra. Caja y Regresan leen con service_role, así que
  // pasan primero por requireTenantStaff, igual que sus propias páginas.
  const staff = productos.caja || productos.regresan ? await requireTenantStaff(slug).catch(() => null) : null;
  const [porAcabarse, dinero, regresan] = await Promise.all([
    productos.inventario && tenant ? productosPorAcabarse(tenant.id) : Promise.resolve([] as string[]),
    productos.caja && staff
      ? cargarCaja(staff.tenantId, staff.timezone, now)
          .then((d) => ('faltaMigracion' in d ? null : dineroDe(d.movimientos, d.hoy)))
          .catch(() => null)
      : Promise.resolve(null),
    productos.regresan && staff ? clientasPorRegresar(slug, staff.tenantId, staff.timezone, now).catch(() => null) : Promise.resolve(null),
  ]);

  const alertas = [
    alertaInventario(porAcabarse, '/dashboard'),
    regresan && alertaRegresan(regresan.nombres, regresan.semanas, '/dashboard'),
  ].filter((a): a is Alerta => Boolean(a));

  return (
    <ResumenHoy
      estilo={estiloDe((conEstilo as { dashboard_estilo?: unknown } | null)?.dashboard_estilo)}
      tenantName={tenant?.name ?? 'Tu negocio'}
      now={now}
      timezone={tz}
      today={today}
      upcoming={upcoming}
      dinero={dinero}
      alertas={alertas}
      base="/dashboard"
      action={<CopyLinkButton url={tenantBookingPageUrl(slug)} />}
      setup={
        setupComplete ? undefined : (
          // Only shown when the page can't take bookings yet. It sits above
          // everything because nothing below it can happen until it's done.
          <section
            className="mt-7 rounded-2xl border border-warning/30 bg-warning-soft px-5 py-5 sm:px-6"
            aria-label="Configuración pendiente"
          >
            <p className="font-semibold text-ink">Tu página todavía no puede recibir citas</p>
            <p className="mt-1 text-sm text-muted">
              Faltan {setup.filter((s) => !s.done).length} de 3 pasos. Sin ellos no hay horarios que ofrecer.
            </p>
            <ol className="mt-3 flex flex-col">
              {setup.map((s) => (
                <li key={s.label}>
                  {s.done ? (
                    <span className="flex min-h-[2.75rem] items-center gap-2.5 text-sm text-muted line-through">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {s.label}
                    </span>
                  ) : (
                    <Link
                      href={s.href}
                      className="group flex min-h-[2.75rem] items-center gap-2.5 rounded-sm text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="h-5 w-5 rounded-full border-2 border-ink/25" />
                      <span className="underline-offset-4 group-hover:underline">{s.label}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )
      }
    />
  );
}

// Las clientas que no han vuelto, con la MISMA consulta y la MISMA
// armarRegresan que la pantalla "Clientes que regresan", para que el
// número del Resumen y la lista de esa pantalla nunca difieran.
async function clientasPorRegresar(slug: string, tenantId: string, timezone: string | null, now: Date) {
  const db = createAdminClient();
  const [{ data: t }, { data: raw }] = await Promise.all([
    db.from('tenants').select('*').eq('id', tenantId).maybeSingle(),
    db
      .from('bookings')
      .select('*, customers(name, phone, email), service_types(name)')
      .eq('tenant_id', tenantId)
      .order('starts_at', { ascending: false })
      .limit(4000),
  ]);
  const ajustes = ajustesDe(t);
  const { inactivas } = armarRegresan({
    citas: (raw ?? []) as unknown as CitaRegresan[],
    negocio: (t?.name as string) ?? '',
    linkReservar: tenantBookingPageUrl(slug),
    ajustes,
    canal: 'correo',
    timezone,
    now,
  });
  return { nombres: inactivas.map((c) => c.name), semanas: ajustes.semanas };
}
