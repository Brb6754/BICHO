import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  PLATFORM_PRIMARY,
  PLATFORM_SECONDARY,
  PLATFORM_ACCENT,
  withAlpha,
  tenantColorCssVars,
  tenantDarkModeCssVars,
} from '@/lib/branding/colors';
import { Sidebar } from './Sidebar';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, primary_color, secondary_color, accent_color, logo_url')
    .eq('slug', slug)
    .single();

  if (!tenant) {
    notFound();
  }

  // The dashboard is staff-facing (the business owner logging into
  // their own tool), but Bruno wants it branded too — same colors and
  // logo as their public booking page, not the platform's fixed
  // indigo/violet. Falls back to the platform palette for a tenant that
  // hasn't set custom colors yet, same as the public page.
  const primaryColor = tenant.primary_color ?? PLATFORM_PRIMARY;
  const secondaryColor = tenant.secondary_color ?? PLATFORM_SECONDARY;
  const accentColor = tenant.accent_color ?? PLATFORM_ACCENT;

  // A valid Supabase Auth session only proves who the user is — it says
  // nothing about whether they belong to THIS tenant. That has to be
  // checked explicitly against business_users on every request, and every
  // page under /dashboard shares this check via this layout.
  const { data: membership } = await supabase
    .from('business_users')
    .select('role')
    .eq('tenant_id', tenant.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    redirect('/login?error=No%20tienes%20acceso%20a%20este%20negocio');
  }

  return (
    <div
      className="tenant-shell relative flex min-h-screen bg-paper"
      style={
        {
          ...tenantColorCssVars(primaryColor, secondaryColor, accentColor),
          ...tenantDarkModeCssVars(primaryColor, secondaryColor, accentColor),
        } as React.CSSProperties
      }
    >
      {/* Same ambient-glow structure as the admin shell, just tinted with
          this tenant's own colors instead of the platform's fixed ones —
          .ambient-glow's own gradient colors are baked into the
          stylesheet and can't take a runtime color, so the two blobs are
          painted directly here instead. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-paper" aria-hidden="true">
        <div
          className="absolute -left-[12%] -top-[20%] h-[62vw] w-[62vw] rounded-full"
          style={{ background: `radial-gradient(circle, ${withAlpha(primaryColor, 0.11)}, transparent 70%)`, filter: 'blur(90px)' }}
        />
        <div
          className="absolute -bottom-[25%] -right-[15%] h-[68vw] w-[68vw] rounded-full"
          style={{ background: `radial-gradient(circle, ${withAlpha(accentColor, 0.08)}, transparent 70%)`, filter: 'blur(90px)' }}
        />
      </div>
      <Sidebar
        tenantName={tenant.name}
        email={user.email ?? ''}
        role={membership.role}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentColor={accentColor}
        logoUrl={tenant.logo_url}
      />
      <main className="relative z-10 min-w-0 flex-1 px-6 pb-10 pt-20 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
