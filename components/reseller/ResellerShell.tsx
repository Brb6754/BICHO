'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Plus, Menu, X, LogOut, Loader2, CreditCard } from 'lucide-react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BichoLogo } from '@/components/marketing/BichoLogo';
import { signOut } from '@/app/vendedor/actions';

// Hrefs are PUBLIC paths (vendedores.dominio/negocios), never the
// /vendedor/... rewrite target — the same rule that already bit this
// codebase once in the tenant sidebar (see CLAUDE.md).
const NAV_ITEMS = [
  { href: '/', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/negocios/nuevo', label: 'Dar de alta un negocio', icon: Plus },
  // What the rep OWES bicho, and where they keep their card current.
  { href: '/suscripcion', label: 'Mi suscripción', icon: CreditCard },
];

// The rep's own shell. Wears `admin-shell` (bicho's palette): a rep
// represents bicho, not any one business, so this panel never takes a
// tenant's colors — unlike the business dashboard, which does.
export function ResellerShell({
  name,
  email,
  children,
}: {
  name: string;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="admin-shell relative flex min-h-screen bg-paper">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2.5 border-b border-border bg-paper/90 px-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-ink/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex items-center rounded-lg bg-primary px-2.5 py-1.5">
          <BichoLogo className="h-4" />
        </span>
        <p className="min-w-0 truncate text-sm font-semibold text-ink">Vendedor</p>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0 lg:bg-paper ${
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <span className="flex shrink-0 items-center rounded-xl bg-primary px-3 py-2">
            <BichoLogo className="h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-ink">{name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">Vendedor</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Secciones" className="mt-2 flex flex-1 flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : (pathname?.startsWith(item.href) ?? false);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? 'bg-ink/[0.06] font-semibold text-ink'
                    : 'font-medium text-muted hover:bg-ink/[0.035] hover:text-ink'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary" aria-hidden="true" />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}

          <div className="my-3 h-px bg-border" aria-hidden="true" />
          <p className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs leading-relaxed text-muted">
            <Store className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            Cada negocio que das de alta queda a tu nombre.
          </p>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-xs font-semibold text-ink"
              aria-hidden="true"
            >
              {email.slice(0, 1).toUpperCase()}
            </span>
            <p className="min-w-0 flex-1 truncate text-[13px] text-muted">{email}</p>
            <ThemeToggle className="text-muted hover:bg-ink/[0.06] hover:text-ink" />
          </div>
          <button
            type="button"
            disabled={signingOut}
            onClick={() =>
              startSignOut(async () => {
                await signOut();
                router.push('/login');
                router.refresh();
              })
            }
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-ink/[0.035] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
          >
            {signingOut ? (
              <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            )}
            {signingOut ? 'Saliendo' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      <main className="relative z-10 min-w-0 flex-1 px-5 pb-16 pt-20 sm:px-8 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
