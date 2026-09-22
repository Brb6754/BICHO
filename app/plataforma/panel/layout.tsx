import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Sidebar } from '@/app/t/[slug]/dashboard/Sidebar';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { DEMO } from '@/components/demo/fixtures';
import { tenantColorCssVars, tenantDarkModeCssVars } from '@/lib/branding/colors';

// The owner's panel, as a public demo.
//
// This is the REAL shell: the same Sidebar component the live dashboard
// renders, the same `tenant-shell tenant-dash` classes, the same brand
// CSS variables. Only three things differ, and all three are
// deliberate:
//   1. No auth gate — the real layout redirects to /login without a
//      session, which is exactly what this page must not do.
//   2. No Supabase — the tenant comes from fixtures, so the demo can't
//      show (or damage) a real business's data.
//   3. Nav points at /plataforma/panel/* instead of the subdomain's
//      /dashboard/*, via the Sidebar's `navBase` prop. That prop exists
//      for this: the alternative was a second copy of the sidebar that
//      would drift from the real one within a week.
export default function DemoPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBanner current="panel" />
      <div
        className="tenant-shell tenant-dash relative flex min-h-screen bg-paper"
        style={
          {
            ...tenantColorCssVars(DEMO.primaryColor, DEMO.secondaryColor, DEMO.accentColor),
            ...tenantDarkModeCssVars(DEMO.primaryColor, DEMO.secondaryColor, DEMO.accentColor),
          } as React.CSSProperties
        }
      >
        <Sidebar
          tenantName={DEMO.name}
          slug={DEMO.slug}
          email={DEMO.ownerEmail}
          role="owner"
          primaryColor={DEMO.primaryColor}
          navBase="/plataforma/panel"
          bookingHref="/plataforma/reservar"
          footer={
            <Link
              href="/plataforma/reservar"
              className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Ver la página del cliente
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />
        <main className="relative z-10 min-w-0 flex-1 px-5 pb-16 pt-20 sm:px-8 lg:px-12 lg:pt-12">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
    </>
  );
}
