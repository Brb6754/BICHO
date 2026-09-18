'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Inbox, LayoutTemplate, Settings, Users, X } from 'lucide-react';
import { Text } from '@/components/ui/Text';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BichoLogo } from '@/components/marketing/BichoLogo';
import SignOutButton from './SignOutButton';

// Built from the CSS variables rather than imported hex constants, so
// the panel's palette lives in exactly one place (the `.admin-shell`
// token block in globals.css) — including the one-step lightening the
// brand fills get in dark mode, which a baked-in hex would miss.
const SIDEBAR_GRADIENT =
  'linear-gradient(to bottom, rgb(var(--color-primary)), rgb(var(--color-primary-dark)))';

const NAV_ITEMS = [
  { href: '/tenants', label: 'Negocios', icon: Building2 },
  { href: '/solicitudes', label: 'Solicitudes', icon: Inbox },
  { href: '/vendedores', label: 'Vendedores', icon: Users },
  { href: '/templates', label: 'Plantillas', icon: LayoutTemplate },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar({
  email,
  open,
  onClose,
  collapsed = false,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
  // Desktop-only: pulls the rail out of the layout entirely so the
  // canvas editor gets the width back. Mobile keeps using `open`.
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const initials = email.slice(0, 2).toUpperCase();

  useEffect(() => {
    onClose();
    // Only re-run when the route actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        style={{ background: SIDEBAR_GRADIENT }}
        className={`fixed inset-y-4 left-4 z-40 flex w-64 shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/15 text-white shadow-[0_20px_56px_rgba(30,27,75,0.35)] transition-transform duration-200 ${
          collapsed ? 'lg:hidden' : 'lg:static lg:my-4 lg:ml-4 lg:translate-x-0'
        } ${open ? 'translate-x-0' : '-translate-x-[120%]'}`}
      >
        <div className="flex items-start gap-3 px-6 pb-2 pt-6">
          {/* The real logo file, same mark the marketing site uses —
              this panel is bicho's own, so it should say so.
              items-start matters: BichoLogo is a block element sized by
              aspect-ratio from its height, and a stretched flex child
              gets width:100% instead, which throws the pixel crop
              completely out of frame (the mark disappears). */}
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <BichoLogo className="h-6" />
            <Text variant="label" as="p" className="mt-1.5 text-white/45">
              Panel interno
            </Text>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="shrink-0 rounded-full p-1 text-white/60 hover:bg-white/10 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href) ?? false;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-accent shadow-glow-accent" />
                )}
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                    isActive ? 'text-accent' : 'text-white/40 group-hover:text-white/70'
                  }`}
                />
                {item.label}
                {isActive && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-2.5 px-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
              {initials}
            </span>
            <p className="min-w-0 flex-1 truncate text-xs text-white/70">{email}</p>
            <ThemeToggle className="text-white/60 hover:bg-white/10 hover:text-white" />
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
