import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { HeroSection } from '@/components/blocks/Sections';
import { BookingActions } from './BookingActions';
import {
  PLATFORM_PRIMARY,
  PLATFORM_SECONDARY,
  PLATFORM_ACCENT,
  tenantCtaStyle,
  tenantGlassBackground,
  tenantColorCssVars,
  tenantDarkModeCssVars,
  tenantDarkBase,
} from '@/lib/branding/colors';
import { googleFontsHref, isFontKey, FONT_OPTIONS, type FontKey } from '@/lib/branding/fonts';
import { normalizeDesign, templateDesignCssVars, type TemplateDesign } from '@/lib/templates/blocks';
import { appointmentWhen, dayKey, formatTime, minutesBetween } from '@/lib/dates/tenantTime';
import motion from '@/components/booking/motion.module.css';
import { tenantBookingPageUrl } from '@/lib/urls';

type BookingRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  resource_id: string;
  service_type_id: string;
  service_types: { name: string } | null;
  resources: { name: string } | null;
  customers: { name: string } | null;
};

function resolveFontKey(value: unknown): FontKey {
  return typeof value === 'string' && isFontKey(value) ? value : 'inter';
}

// A private page: the URL alone grants access to someone's appointment,
// so it must never end up in a search index.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; bookingId: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: tenant } = await createAdminClient().from('tenants').select('name').eq('slug', slug).maybeSingle();
  return {
    title: tenant?.name ? `Tu cita en ${tenant.name}` : 'Tu cita',
    robots: { index: false, follow: false },
  };
}

// Public, unauthenticated page reached via the "Ver mi cita" link in
// the confirmation email and on the booking confirmation screen. The
// booking's own UUID (unguessable) stands in for auth, same trust model
// as /api/reservar and this folder's own actions.ts. Uses the admin
// (service_role) client because anon has no RLS read access to
// `bookings` at all (db/002_rls_policies.sql). By design, nothing here
// trusts a logged-in session.
//
// It wears the same page as the business's booking page (identity
// header, template type, one raised card) so a customer arriving from
// an email recognises where they are. It used to be a centred 512px
// glass card with a diagonal brand-coloured wedge behind it: a
// different, older design than the page they booked on.
export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ slug: string; bookingId: string }>;
}) {
  const { slug, bookingId } = await params;
  const admin = createAdminClient();

  // Core columns only (001/003): these must never fail because a newer
  // column is missing in some environment.
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, vertical, timezone')
    .eq('slug', slug)
    .maybeSingle();
  if (!tenant) {
    notFound();
  }

  const [
    { data: brandingRow },
    { data: themeRow },
    { data: labelsRow },
    { data: pageRow },
    { data: templateRow },
    { data: bookingRaw },
  ] =
    await Promise.all([
      admin
        .from('tenants')
        .select('primary_color, secondary_color, accent_color, background_color, text_color, font_heading, font_body, logo_url')
        .eq('id', tenant.id)
        .maybeSingle(),
      admin.from('tenants').select('theme_mode').eq('id', tenant.id).maybeSingle(),
      // db/024, on its own query like every other late column here.
      admin.from('tenants').select('resource_label, location').eq('id', tenant.id).maybeSingle(),
      admin.from('tenants').select('page_design').eq('id', tenant.id).maybeSingle(),
      admin.from('templates').select('design').eq('vertical', tenant.vertical ?? 'general').maybeSingle(),
      admin
        .from('bookings')
        .select(
          'id, starts_at, ends_at, status, resource_id, service_type_id, service_types(name), resources(name), customers(name)'
        )
        .eq('id', bookingId)
        .eq('tenant_id', tenant.id)
        .maybeSingle(),
    ]);
  const booking = bookingRaw as unknown as BookingRow | null;

  const primaryColor = brandingRow?.primary_color ?? PLATFORM_PRIMARY;
  const secondaryColor = brandingRow?.secondary_color ?? PLATFORM_SECONDARY;
  const accentColor = brandingRow?.accent_color ?? PLATFORM_ACCENT;
  const isDark = themeRow?.theme_mode === 'dark';
  const darkBase = isDark ? tenantDarkBase(primaryColor, secondaryColor, accentColor) : undefined;
  const design = normalizeDesign(
    (pageRow?.page_design as Partial<TemplateDesign> | null) ?? (templateRow?.design as Partial<TemplateDesign> | null)
  );
  const headingKey = resolveFontKey(brandingRow?.font_heading);
  const bodyKey = resolveFontKey(brandingRow?.font_body);
  const timezone = tenant.timezone ?? null;

  const isPast = booking ? new Date(booking.starts_at).getTime() <= Date.now() : false;
  const canChange = booking?.status === 'confirmed' && !isPast;

  const status = !booking
    ? null
    : booking.status === 'cancelled'
      ? { label: 'Cancelada', dot: '#DC2626' }
      : booking.status === 'completed' || isPast
        ? { label: 'Ya pasó', dot: 'rgb(var(--color-muted))' }
        : { label: 'Confirmada', dot: accentColor };

  const headingStyle: React.CSSProperties = {
    fontFamily: 'var(--tpl-heading-font, var(--font-heading))',
    letterSpacing: 'var(--tpl-heading-tracking)',
  };
  const ctaLinkClass =
    'inline-flex items-center justify-center rounded-2xl border border-transparent px-5 py-3 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  return (
    <>
      <link rel="stylesheet" href={googleFontsHref([headingKey, bodyKey])} />
      <main
        className={`${isDark ? 'dark tenant-shell bg-paper text-ink' : 'force-light'} min-h-screen`}
        style={
          isDark
            ? ({
                ...tenantColorCssVars(primaryColor, secondaryColor, accentColor),
                ...tenantDarkModeCssVars(primaryColor, secondaryColor, accentColor),
                ...templateDesignCssVars(design),
                fontFamily: FONT_OPTIONS[bodyKey].family,
                '--font-heading': FONT_OPTIONS[headingKey].family,
              } as React.CSSProperties)
            : ({
                ...templateDesignCssVars(design),
                backgroundColor: brandingRow?.background_color ?? '#F7F6F3',
                color: brandingRow?.text_color ?? '#1A1A1A',
                fontFamily: FONT_OPTIONS[bodyKey].family,
                '--font-heading': FONT_OPTIONS[headingKey].family,
              } as React.CSSProperties)
        }
      >
        <HeroSection
          variant="header"
          props={{
            title: tenant.name,
            subtitle: '',
            eyebrow: '',
            backgroundImageUrl: '',
            align: 'left',
            ctaText: '',
            ctaLink: '',
          }}
          branding={{ primaryColor, accentColor, logoUrl: brandingRow?.logo_url ?? null, isDark, darkBase }}
          tucked
        />

        {/* Same sheet as the booking page: it rises into the band. */}
        <div className="relative mx-auto -mt-7 max-w-2xl sm:-mt-16 sm:px-6 sm:pb-14">
          <div
            className={`${motion.rise} rounded-t-[28px] border-t border-ink/[0.08] px-5 pb-8 pt-7 shadow-[0_-12px_32px_-18px_rgba(16,24,40,0.35)] sm:rounded-[28px] sm:border sm:p-8 sm:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_24px_48px_-20px_rgba(16,24,40,0.28)]`}
            style={{ background: tenantGlassBackground(primaryColor, accentColor, 3, darkBase) }}
          >
            {!booking ? (
              <div className="flex flex-col items-start gap-4">
                <h2 className="text-2xl font-semibold text-ink" style={headingStyle}>
                  No encontramos esta cita
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  Revisa que el enlace esté completo: a veces el correo lo corta en dos líneas. Si el problema sigue,
                  contacta directamente a {tenant.name}.
                </p>
                <a
                  href={tenantBookingPageUrl(slug)}
                  className={ctaLinkClass}
                  style={{ ...tenantCtaStyle(primaryColor, accentColor), ['--tw-ring-color' as string]: accentColor }}
                >
                  Ir a la página de reservas
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  {status && (
                    <p className="flex items-center gap-2 text-sm font-medium text-muted">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.dot }} aria-hidden="true" />
                      {status.label}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-4">
                    {/* The date as a tile, the way it reads on a ticket:
                        day number big, in the business's colour. Greyed
                        out once the appointment can't be changed. */}
                    <div
                      className={`flex w-[76px] shrink-0 flex-col items-center rounded-2xl py-2.5 ${canChange ? '' : 'opacity-50'}`}
                      style={tenantCtaStyle(primaryColor, accentColor)}
                      aria-hidden="true"
                    >
                      <span className="text-[2rem] font-bold leading-none tabular-nums" style={headingStyle}>
                        {Number(dayKey(booking.starts_at, timezone).slice(8, 10))}
                      </span>
                      <span className="mt-1 text-[11px] font-semibold tabular-nums">{formatTime(booking.starts_at, timezone)}</span>
                    </div>
                    <div className="min-w-0">
                      <h2
                        className={`text-[1.6rem] font-semibold leading-tight sm:text-[2rem] ${
                          canChange ? 'text-ink' : 'text-ink/60'
                        }`}
                        style={headingStyle}
                      >
                        {booking.service_types?.name ?? 'Tu cita'}
                      </h2>
                      <p className={`mt-1 text-base tabular-nums sm:text-lg ${canChange ? 'text-ink' : 'text-muted'}`}>
                        {appointmentWhen(booking.starts_at, timezone)}
                      </p>
                    </div>
                  </div>
                </div>

                <dl className="divide-y divide-ink/[0.07] border-y border-ink/[0.07] text-sm">
                  <div className="flex items-baseline justify-between gap-6 py-3">
                    <dt className="text-muted">Duración</dt>
                    <dd className="font-medium tabular-nums text-ink">{minutesBetween(booking.starts_at, booking.ends_at)} min</dd>
                  </div>
                  {booking.resources?.name && (
                    <div className="flex items-baseline justify-between gap-6 py-3">
                      <dt className="text-muted">{labelsRow?.resource_label || 'Te atiende'}</dt>
                      <dd className="text-right font-medium text-ink">{booking.resources.name}</dd>
                    </div>
                  )}
                  {booking.customers?.name && (
                    <div className="flex items-baseline justify-between gap-6 py-3">
                      <dt className="text-muted">A nombre de</dt>
                      <dd className="text-right font-medium text-ink">{booking.customers.name}</dd>
                    </div>
                  )}
                  {/* "Where do I go" — the one question this page could
                      never answer, because until db/024 a business had
                      nowhere to put its address. Links to Maps: on a
                      phone that opens the app with directions, which is
                      what someone reading this actually wants. */}
                  {labelsRow?.location && (
                    <div className="flex items-baseline justify-between gap-6 py-3">
                      <dt className="text-muted">Dónde</dt>
                      <dd className="text-right font-medium text-ink">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            labelsRow.location
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-sm underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
                        >
                          {labelsRow.location}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                {canChange ? (
                  <BookingActions
                    bookingId={booking.id}
                    slug={slug}
                    resourceId={booking.resource_id}
                    serviceTypeId={booking.service_type_id}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    timezone={timezone}
                  />
                ) : (
                  <div className="flex flex-col items-start gap-4">
                    <p className="text-sm leading-relaxed text-muted">
                      {booking.status === 'cancelled'
                        ? 'Esta cita se canceló y el horario quedó libre.'
                        : 'Esta cita ya pasó, así que no se puede cambiar.'}
                    </p>
                    <a
                      href={tenantBookingPageUrl(slug)}
                      className={ctaLinkClass}
                      style={{ ...tenantCtaStyle(primaryColor, accentColor), ['--tw-ring-color' as string]: accentColor }}
                    >
                      Agendar una nueva cita
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
