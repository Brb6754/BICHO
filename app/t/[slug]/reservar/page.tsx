import { createClient } from '@/lib/supabase/server';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import BookingFlow from '@/components/booking/BookingFlow';
import { googleFontsHref, isFontKey, FONT_OPTIONS, type FontKey } from '@/lib/branding/fonts';
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
import type { Block } from '@/lib/templates/blocks';

function resolveFontKey(value: unknown): FontKey {
  return typeof value === 'string' && isFontKey(value) ? value : 'inter';
}

export default async function ReservarPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  // Kept separate from the branding query on purpose: id/name/vertical
  // are core columns that have existed since 001; branding columns are
  // new (009) and might not be applied in every environment yet. If they
  // errored together, a missing branding column would take the whole
  // tenant lookup down with it.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, vertical')
    .eq('slug', params.slug)
    .single();

  const { data: branding_raw } = await supabase
    .from('tenants')
    .select(
      'primary_color, secondary_color, accent_color, background_color, text_color, font_heading, font_body, logo_url'
    )
    .eq('slug', params.slug)
    .maybeSingle();

  // Queried separately from branding_raw above, same defensive reason:
  // theme_mode (db/012) is newer than every other branding column and
  // might not be applied in every environment yet — if a missing column
  // errored the query, it should only cost us theme_mode (falls back to
  // 'light', today's only behavior), not every other branding field too.
  const { data: theme_mode_raw } = await supabase
    .from('tenants')
    .select('theme_mode')
    .eq('slug', params.slug)
    .maybeSingle();
  const isDark = theme_mode_raw?.theme_mode === 'dark';

  const { data: services } = await supabase
    .from('service_types')
    .select('id, name, duration_minutes, price_cents')
    .eq('tenant_id', tenant!.id)
    .eq('active', true)
    .order('name');

  const { data: resources } = await supabase
    .from('resources')
    .select('id, name')
    .eq('tenant_id', tenant!.id)
    .eq('active', true)
    .order('name');

  const { data: template } = await supabase
    .from('templates')
    .select('blocks')
    .eq('vertical', tenant?.vertical ?? 'general')
    .maybeSingle();

  const headingKey = resolveFontKey(branding_raw?.font_heading);
  const bodyKey = resolveFontKey(branding_raw?.font_body);

  const bookingData = {
    slug: params.slug,
    businessName: tenant?.name,
    services: services ?? [],
    resources: resources ?? [],
  };

  // Back to reading the tenant's own primary_color/accent_color: a fixed
  // platform palette looked wrong next to a tenant's actual logo (e.g. an
  // olive/gold spa logo against blue/violet glass). Every glass surface,
  // button, and the ambient background all derive from these two colors
  // now, so the whole page reads as THIS business's brand, not a
  // one-size-fits-all platform skin. Falls back to the platform's own
  // indigo/cyan only for a tenant that hasn't set custom colors yet.
  const secondaryColor = branding_raw?.secondary_color ?? PLATFORM_SECONDARY;
  const primaryColor = branding_raw?.primary_color ?? PLATFORM_PRIMARY;
  const accentColor = branding_raw?.accent_color ?? PLATFORM_ACCENT;
  const branding = {
    primaryColor,
    accentColor,
    logoUrl: branding_raw?.logo_url ?? null,
    // Every glass card (BlockRenderer) needs to know the page is dark
    // too, not just <main> — otherwise a block's own card keeps forcing
    // a white base and reads as a pale, off-brand card floating on the
    // dark page instead of belonging to it (that's the exact bug this
    // fixes). darkBase is only computed when actually needed.
    isDark,
    darkBase: isDark ? tenantDarkBase(primaryColor, secondaryColor, accentColor) : undefined,
  };

  return (
    <>
      {/* Runtime font choice → a real <link>, not next/font (which needs
          the family known at build time). Next.js hoists this into <head>
          even though it's rendered mid-tree. */}
      <link rel="stylesheet" href={googleFontsHref([headingKey, bodyKey])} />

      {/* "dark" below is a deliberate, self-contained class directly on
          <main> — not inherited from <html> (which the admin/dashboard's
          own ThemeToggle controls) — because this page's mode is an
          admin-panel setting, not the visitor's or a leftover staff
          member's OS/browser preference. Light mode keeps using
          force-light for the same reason it always has: pin the surface
          tokens regardless of whatever `.dark` state happens to be on an
          ancestor. tenant-shell + tenantColorCssVars/tenantDarkModeCssVars
          are the exact same mechanism already built for the tenant
          dashboard's own dark mode — reused as-is. */}
      <main
        className={`${isDark ? 'dark tenant-shell bg-paper text-ink' : 'force-light'} relative min-h-screen overflow-hidden`}
        style={
          isDark
            ? ({
                ...tenantColorCssVars(branding.primaryColor, secondaryColor, branding.accentColor),
                ...tenantDarkModeCssVars(branding.primaryColor, secondaryColor, branding.accentColor),
                fontFamily: FONT_OPTIONS[bodyKey].family,
                '--font-heading': FONT_OPTIONS[headingKey].family,
              } as React.CSSProperties)
            : ({
                backgroundColor: branding_raw?.background_color ?? '#F7F6F3',
                color: branding_raw?.text_color ?? '#1A1A1A',
                fontFamily: FONT_OPTIONS[bodyKey].family,
                '--font-heading': FONT_OPTIONS[headingKey].family,
              } as React.CSSProperties)
        }
      >
        {/* Ambient depth behind the page content — built from THIS
            tenant's own brand colors, same idea as the platform's own
            .ambient-glow but parameterized, since .ambient-glow's colors
            are baked into the stylesheet and can't take a runtime color.
            Fixed so it doesn't scroll away; content sits above it. */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute -left-[10%] -top-[15%] h-[55vw] w-[55vw] rounded-full"
            style={{ background: `radial-gradient(circle, ${withAlpha(branding.primaryColor, 0.2)}, transparent 70%)`, filter: 'blur(100px)' }}
          />
          <div
            className="absolute -bottom-[20%] -right-[10%] h-[60vw] w-[60vw] rounded-full"
            style={{ background: `radial-gradient(circle, ${withAlpha(branding.accentColor, 0.18)}, transparent 70%)`, filter: 'blur(100px)' }}
          />
        </div>

        <div className="relative z-10">
          {template?.blocks && (template.blocks as Block[]).length > 0 ? (
            <BlockRenderer blocks={template.blocks as Block[]} bookingData={bookingData} branding={branding} />
          ) : (
            // No template matched this tenant's vertical (e.g. "General
            // (sin plantilla)" in the tenant-creation form) — no content
            // blocks, but still the same premium treatment: gradient
            // header + glass booking card, not a bare unstyled page.
            <div className="mx-auto max-w-lg px-6 py-14">
              <div
                className={`relative overflow-hidden rounded-[32px] border ${isDark ? 'border-border' : 'border-white/60'} px-8 py-10 text-center shadow-card backdrop-blur-xl`}
                style={{ background: tenantGlassBackground(branding.primaryColor, branding.accentColor, 3, branding.darkBase) }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
                  style={{ backgroundColor: branding.accentColor }}
                />
                {branding.logoUrl && (
                  <span className="relative mx-auto mb-4 inline-block max-w-[240px]">
                    <img
                      src={branding.logoUrl}
                      alt={tenant?.name}
                      className="h-16 w-auto max-w-full object-contain"
                    />
                  </span>
                )}
                <h1
                  className="relative text-3xl font-bold tracking-tight text-ink sm:text-4xl"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {tenant?.name}
                </h1>
                <p className="relative mt-2 text-muted">Elige tu servicio y horario en unos segundos.</p>
              </div>
              <div
                className={`mt-8 rounded-[32px] border ${isDark ? 'border-border' : 'border-white/60'} p-6 shadow-card backdrop-blur-xl sm:p-8`}
                style={{ background: tenantGlassBackground(branding.primaryColor, branding.accentColor, 3, branding.darkBase) }}
              >
                <BookingFlow {...bookingData} accentColor={branding.accentColor} primaryColor={branding.primaryColor} />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
