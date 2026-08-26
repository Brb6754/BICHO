'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Armchair, Tag, Clock3, CalendarDays, Menu, X, Sparkles } from 'lucide-react';
import { Text } from '@/components/ui/Text';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { tenantSidebarGradient, tenantSidebarFg } from '@/lib/branding/colors';
import SignOutButton from './SignOutButton';

// These hrefs are the PUBLIC paths as seen on the tenant's subdomain
// (e.g. test-salon.localhost:3000/dashboard/resources) — middleware.ts
// rewrites that internally to /t/{slug}/dashboard/resources, but a
// <Link> has to target the public path, not the rewrite target, or
// clicking it 404s (the rewrite would double-prefix it).
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/resources', label: 'Recursos', icon: Armchair },
  { href: '/dashboard/services', label: 'Servicios', icon: Tag },
  { href: '/dashboard/schedule', label: 'Horarios', icon: Clock3 },
  { href: '/dashboard/calendar', label: 'Calendario', icon: CalendarDays },
];

export function Sidebar({
  tenantName,
  email,
  role,
  primaryColor,
  secondaryColor,
  accentColor,
  logoUrl,
}: {
  tenantName: string;
  email: string;
  role: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = email.slice(0, 2).toUpperCase();
  // A tenant can pick ANY color, including light ones (cream, pale gold)
  // that a hardcoded text-white would go invisible against — this is the
  // triplet readableFgRgb() picks for the sidebar's own background, reused
  // everywhere the sidebar previously assumed "white always reads".
  const sidebarFg = tenantSidebarFg(primaryColor);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-secondary text-[rgb(var(--color-cta-fg))] shadow-glow-primary lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        style={{
          background: tenantSidebarGradient(primaryColor, secondaryColor),
          '--sidebar-fg': sidebarFg,
        } as React.CSSProperties}
        className={`fixed inset-y-4 left-4 z-40 flex w-64 shrink-0 flex-col overflow-hidden rounded-[28px] border border-[rgb(var(--sidebar-fg)/0.15)] text-[rgb(var(--sidebar-fg))] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_25px_60px_rgba(30,27,75,0.35)] backdrop-blur-3xl transition-transform duration-200 lg:static lg:my-4 lg:ml-4 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-[120%]'
        }`}
      >
        <div className="flex items-center gap-2.5 px-6 pb-2 pt-6">
          {logoUrl ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/95 p-1">
              <img src={logoUrl} alt={tenantName} className="h-full w-full object-contain" />
            </span>
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/95" style={{ color: primaryColor }}>
              <Sparkles className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">{tenantName}</p>
            <Text variant="label" as="p" className="text-[rgb(var(--sidebar-fg)/0.5)]">
              Panel de negocio
            </Text>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="shrink-0 rounded-full p-1 text-[rgb(var(--sidebar-fg)/0.6)] hover:bg-[rgb(var(--sidebar-fg)/0.1)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : (pathname?.startsWith(item.href) ?? false);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[rgb(var(--sidebar-fg)/0.1)] text-[rgb(var(--sidebar-fg))] shadow-[inset_0_0_0_1px_rgb(var(--sidebar-fg)/0.08)]'
                    : 'text-[rgb(var(--sidebar-fg)/0.6)] hover:bg-[rgb(var(--sidebar-fg)/0.05)] hover:text-[rgb(var(--sidebar-fg))]'
                }`}
              >
                {isActive && (
                  <span
                    className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: accentColor, boxShadow: `0 0 12px ${accentColor}` }}
                  />
                )}
                <Icon
                  className="h-4 w-4 shrink-0 transition-colors duration-150 text-[rgb(var(--sidebar-fg)/0.4)] group-hover:text-[rgb(var(--sidebar-fg)/0.7)]"
                  style={isActive ? { color: accentColor } : undefined}
                />
                {item.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[rgb(var(--sidebar-fg)/0.1)] px-4 py-4">
          <div className="mb-3 flex items-center gap-2.5 px-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--sidebar-fg)/0.1)] text-xs font-semibold">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-[rgb(var(--sidebar-fg)/0.7)]">{email}</p>
              <p className="truncate text-[11px] capitalize text-[rgb(var(--sidebar-fg)/0.4)]">{role}</p>
            </div>
            <ThemeToggle className="text-[rgb(var(--sidebar-fg)/0.6)] hover:bg-[rgb(var(--sidebar-fg)/0.1)] hover:text-[rgb(var(--sidebar-fg))]" />
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
