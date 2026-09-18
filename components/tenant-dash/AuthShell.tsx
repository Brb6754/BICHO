import { ArrowUpRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  PLATFORM_PRIMARY,
  PLATFORM_SECONDARY,
  PLATFORM_ACCENT,
  tenantColorCssVars,
  tenantDarkModeCssVars,
} from '@/lib/branding/colors';
import { tenantBookingPageUrl } from '@/lib/urls';
import { BusinessMark } from './BusinessMark';

// The frame around the business owner's sign-in and password pages.
//
// These used to be the platform's page: indigo button, two ambient glow
// blobs, a glass card and a bare "Iniciar sesión" with no hint of which
// business you were signing in to. For an owner this is the front door
// of THEIR tool, so it now opens with their mark and name, and their
// colors reach the primary button through the same CSS-var tokens the
// dashboard uses. Everything else stays quiet: one surface, one action.
export async function AuthShell({
  slug,
  title,
  description,
  children,
}: {
  slug: string;
  title?: string;
  description: string;
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, primary_color, secondary_color, accent_color, logo_url')
    .eq('slug', slug)
    .maybeSingle();

  const name = tenant?.name ?? slug;
  const primary = tenant?.primary_color ?? PLATFORM_PRIMARY;
  const secondary = tenant?.secondary_color ?? PLATFORM_SECONDARY;
  const accent = tenant?.accent_color ?? PLATFORM_ACCENT;

  return (
    <main
      className="tenant-shell tenant-dash min-h-screen bg-paper text-ink"
      style={
        {
          ...tenantColorCssVars(primary, secondary, accent),
          ...tenantDarkModeCssVars(primary, secondary, accent),
        } as React.CSSProperties
      }
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[400px] flex-col px-5 py-10 sm:py-16">
        <div className="animate-fade-in flex flex-1 flex-col justify-center">
          <div className="mb-8">
            <BusinessMark name={name} logoUrl={tenant?.logo_url} color={primary} size="lg" />
            <h1 className="mt-6 text-[1.625rem] font-semibold leading-tight tracking-tight text-ink">{title ?? name}</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{description}</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)] sm:p-7">
            {children}
          </div>
        </div>

        <a
          href={tenantBookingPageUrl(slug)}
          className="mt-10 inline-flex items-center gap-1.5 self-start rounded-md text-sm text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Ver la página de reservas de {name}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </main>
  );
}
