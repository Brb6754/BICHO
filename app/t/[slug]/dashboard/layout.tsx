import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  PLATFORM_PRIMARY,
  PLATFORM_SECONDARY,
  PLATFORM_ACCENT,
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
  // Qué productos tiene contratado el negocio. Consulta aparte y
  // tolerante: si db/027 y db/028 no están corridas, el panel se
  // comporta como siempre (citas sí, cotizaciones no) en vez de caerse.
  const { data: ajustes } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  const quotesEnabled = ajustes?.quotes_enabled === true;
  // Sin la columna, true: todos los negocios de hoy contrataron citas.
  const reservasEnabled = ajustes?.reservas_enabled !== false;
  // Tercer producto (db/035). Sin la columna, apagado.
  const facturacionEnabled = ajustes?.facturacion_enabled === true;

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
      className="tenant-shell tenant-dash relative flex min-h-screen bg-paper"
      style={
        {
          ...tenantColorCssVars(primaryColor, secondaryColor, accentColor),
          ...tenantDarkModeCssVars(primaryColor, secondaryColor, accentColor),
        } as React.CSSProperties
      }
    >
      {/* No decorative wedges. The clip-path shapes that used to sit
          here cut a hard diagonal across the whole panel and spread the
          brand colour over everything — the same problem already fixed
          on the public booking page. This is a tool someone opens forty
          times a day; it should be quiet, and colour should mean
          something when it appears. */}
      <Sidebar
        tenantName={tenant.name}
        slug={slug}
        email={user.email ?? ''}
        role={membership.role}
        primaryColor={primaryColor}
        logoUrl={tenant.logo_url}
        quotesEnabled={quotesEnabled}
        facturacionEnabled={facturacionEnabled}
        reservasEnabled={reservasEnabled}
      />
      <main className="relative z-10 min-w-0 flex-1 px-5 pb-16 pt-20 sm:px-8 lg:px-12 lg:pt-12">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
