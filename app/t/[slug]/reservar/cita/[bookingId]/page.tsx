import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createAdminClient } from '@/lib/supabase/admin';
import { Badge } from '@/components/ui/Badge';
import { BookingActions } from './BookingActions';
import {
  PLATFORM_PRIMARY,
  PLATFORM_SECONDARY,
  PLATFORM_ACCENT,
  tenantGlassBackground,
  tenantColorCssVars,
  tenantDarkModeCssVars,
  tenantDarkBase,
  withAlpha,
} from '@/lib/branding/colors';

type BookingRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  resource_id: string;
  service_type_id: string;
  service_types: { name: string } | null;
  resources: { name: string } | null;
};

// Public, unauthenticated page reached via the "Ver mi cita" link in
// the confirmation email — the booking's own UUID (unguessable) stands
// in for auth, same trust model as /api/reservar and this folder's own
// actions.ts. Uses the admin (service_role) client because anon has no
// RLS read access to `bookings` at all (db/002_rls_policies.sql) — by
// design, nothing here trusts a logged-in session.
export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ slug: string; bookingId: string }>;
}) {
  const { slug, bookingId } = await params;
  const admin = createAdminClient();

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, primary_color, secondary_color, accent_color, theme_mode')
    .eq('slug', slug)
    .single();
  if (!tenant) {
    notFound();
  }

  const { data: bookingRaw } = await admin
    .from('bookings')
    .select('id, starts_at, ends_at, status, resource_id, service_type_id, service_types(name), resources(name)')
    .eq('id', bookingId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();
  const booking = bookingRaw as unknown as BookingRow | null;

  const primaryColor = tenant.primary_color ?? PLATFORM_PRIMARY;
  const secondaryColor = tenant.secondary_color ?? PLATFORM_SECONDARY;
  const accentColor = tenant.accent_color ?? PLATFORM_ACCENT;
  const isDark = tenant.theme_mode === 'dark';
  const darkBase = isDark ? tenantDarkBase(primaryColor, secondaryColor, accentColor) : undefined;

  return (
    <main
      className={`${isDark ? 'dark tenant-shell bg-paper text-ink' : 'force-light'} relative min-h-screen overflow-hidden`}
      style={
        isDark
          ? ({
              ...tenantColorCssVars(primaryColor, secondaryColor, accentColor),
              ...tenantDarkModeCssVars(primaryColor, secondaryColor, accentColor),
            } as React.CSSProperties)
          : ({ backgroundColor: '#F7F6F3', color: '#1A1A1A' } as React.CSSProperties)
      }
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -left-[10%] -top-[15%] h-[55vw] w-[55vw] rounded-full"
          style={{ background: `radial-gradient(circle, ${withAlpha(primaryColor, 0.2)}, transparent 70%)`, filter: 'blur(100px)' }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-6 py-14">
        <h1 className="text-center text-2xl font-bold tracking-tight text-ink">{tenant.name}</h1>

        <div
          className={`mt-8 rounded-[32px] border ${isDark ? 'border-border' : 'border-white/60'} p-6 text-center shadow-card backdrop-blur-xl sm:p-8`}
          style={{ background: tenantGlassBackground(primaryColor, accentColor, 3, darkBase) }}
        >
          {!booking ? (
            <>
              <p className="text-lg font-semibold text-ink">No encontramos esa cita.</p>
              <p className="mt-2 text-sm text-muted">
                Revisá que el enlace esté completo, o contactá directamente al negocio.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-muted">Tu cita</p>
              <p className="mt-1 text-xl font-semibold text-ink">{booking.service_types?.name}</p>
              <p className="mt-1 text-ink">
                {format(new Date(booking.starts_at), "EEEE d 'de' MMMM, h:mm a", { locale: es })}
              </p>
              {booking.resources?.name && <p className="mt-1 text-sm text-muted">{booking.resources.name}</p>}
              <div className="mt-3 flex justify-center">
                {booking.status === 'confirmed' && <Badge tone="default">Confirmada</Badge>}
                {booking.status === 'cancelled' && <Badge tone="danger">Cancelada</Badge>}
                {booking.status === 'completed' && <Badge tone="muted">Completada</Badge>}
              </div>

              {booking.status === 'confirmed' && (
                <div className="mt-6">
                  <BookingActions
                    bookingId={booking.id}
                    slug={slug}
                    resourceId={booking.resource_id}
                    serviceTypeId={booking.service_type_id}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                  />
                </div>
              )}
              {booking.status === 'cancelled' && (
                <p className="mt-6 text-sm text-muted">
                  Esta cita fue cancelada. Si querés agendar una nueva, contactá al negocio.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
