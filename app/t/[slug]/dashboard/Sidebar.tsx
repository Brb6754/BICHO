'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Contact,
  Tag,
  Users,
  Clock3,
  Menu,
  X,
  ArrowUpRight,
  FileText,
  ReceiptText,
  Handshake,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BusinessMark } from '@/components/tenant-dash/BusinessMark';
import { tenantBookingPageUrl, tenantMeetingsPageUrl } from '@/lib/urls';
import SignOutButton from './SignOutButton';

// These hrefs are the PUBLIC paths as seen on the tenant's subdomain
// (e.g. test-salon.localhost:3000/dashboard/resources) — proxy.ts
// rewrites that internally to /t/{slug}/dashboard/resources, but a
// <Link> has to target the public path, not the rewrite target, or
// clicking it 404s (the rewrite would double-prefix it).
//
// Ordered by how often an owner needs each one (the agenda is opened
// all day, the weekly hours almost never), and labelled with the SAME
// words as each page's own title. The menu used to say "Recursos" and
// "Calendario" for pages titled "Quién atiende" and "Agenda".
// The segment navBase swaps out. NAV_ITEMS all start with it.
const DASHBOARD_ROOT = '/dashboard';

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  requiresQuotes?: boolean;
  requiresFacturacion?: boolean;
  requiresReservas?: boolean;
  requiresReuniones?: boolean;
  /** Citas O reuniones: las dos agendan sobre las mismas personas y el mismo horario. */
  requiresAgenda?: boolean;
}[] = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/calendar', label: 'Agenda', icon: CalendarDays, requiresReservas: true },
  // Above the catalogue on purpose: services and hours are setup, changed
  // a few times a year. Customers is something an owner looks up.
  { href: '/dashboard/customers', label: 'Clientes', icon: Contact },
  // El segundo producto de bicho. Aparece solo si el negocio lo tiene
  // prendido: para quien solo agenda citas, un menú con una sección que
  // no usa es ruido permanente.
  { href: '/dashboard/cotizaciones', label: 'Cotizaciones', icon: FileText, requiresQuotes: true },
  // Cuarto módulo. Arriba de cotizaciones no: primero se habla con el
  // prospecto y después se le pone precio, así que este es el orden
  // real del trabajo.
  { href: '/dashboard/reuniones', label: 'Reuniones', icon: Handshake, requiresReuniones: true },
  // Tercer producto. Debajo de cotizaciones porque ese es el orden
  // real del trabajo: se cotiza, se cobra, y al final se factura.
  { href: '/dashboard/facturas', label: 'Facturas', icon: ReceiptText, requiresFacturacion: true },
  { href: '/dashboard/services', label: 'Servicios', icon: Tag, requiresReservas: true },
  // "Quién atiende" y "Horario" son infraestructura compartida: una
  // reunión ocupa al mismo asesor y el mismo horario que una cita (ver
  // db/039). Un negocio que solo contrató reuniones los necesita igual,
  // y sin esto se quedaría sin dónde darlos de alta.
  { href: '/dashboard/resources', label: 'Quién atiende', icon: Users, requiresAgenda: true },
  { href: '/dashboard/schedule', label: 'Horario', icon: Clock3, requiresAgenda: true },
];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  staff: 'Equipo',
};

// The owner's sidebar.
//
// It was a floating glass panel: 28px corners, an indigo drop shadow, a
// full gradient in the brand colors and a glowing accent bar. It was the
// loudest thing in a tool someone opens forty times a day, and it read as
// a 2021 dribbble shot rather than as software. Now it's a calm surface
// flush to the edge. The business still owns it: its mark and name sit
// at the top, and its primary color marks where you are.
export function Sidebar({
  tenantName,
  slug,
  email,
  role,
  primaryColor,
  logoUrl,
  navBase = '',
  quotesEnabled = false,
  facturacionEnabled = false,
  reservasEnabled = true,
  reunionesEnabled = false,
  bookingHref,
  footer,
}: {
  tenantName: string;
  slug: string;
  email: string;
  role: string;
  primaryColor: string;
  logoUrl?: string | null;
  // What stands in for "/dashboard" in the nav hrefs. Empty for a real
  // tenant, where proxy.ts serves the dashboard at the subdomain root
  // and NAV_ITEMS are already the public paths. The public platform
  // demo lives at a plain path instead (/plataforma/panel), so it
  // passes that and gets the same nav without a second copy of this
  // component.
  //
  // It REPLACES the segment rather than prefixing it. Prefixing is what
  // this prop did when it was written, and it produced
  // /plataforma/panel/dashboard/calendar — every link in the demo's
  // menu was a 404 from the day it shipped.
  navBase?: string;
  /** El extra de cotizaciones, prendido por negocio. */
  quotesEnabled?: boolean;
  facturacionEnabled?: boolean;
  /** El producto de citas. Apagado, el menú pierde agenda y servicios. */
  reservasEnabled?: boolean;
  /** El módulo de reuniones. */
  reunionesEnabled?: boolean;
  // Same reason: the demo's booking page isn't on a tenant subdomain.
  bookingHref?: string;
  // Defaults to the real sign-out. The demo has no session to end.
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes the drawer, and the page behind it doesn't scroll
  // while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar: content scrolls under it instead of colliding
          with a floating button. main's pt-20 reserves the space. */}
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
        <BusinessMark name={tenantName} logoUrl={logoUrl} color={primaryColor} size="sm" />
        <p className="min-w-0 truncate text-sm font-semibold text-ink">{tenantName}</p>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0 lg:bg-transparent ${
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <BusinessMark name={tenantName} logoUrl={logoUrl} color={primaryColor} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-ink">{tenantName}</p>
            <p className="mt-0.5 truncate text-xs text-muted">Panel del negocio</p>
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
          {NAV_ITEMS.filter(
            (item) =>
              (!item.requiresQuotes || quotesEnabled) &&
              (!item.requiresReservas || reservasEnabled) &&
              (!item.requiresReuniones || reunionesEnabled) &&
              (!item.requiresAgenda || reservasEnabled || reunionesEnabled) &&
              (!item.requiresFacturacion || facturacionEnabled)
          ).map((item) => {
            const href = navBase ? `${navBase}${item.href.slice(DASHBOARD_ROOT.length)}` : item.href;
            const isActive = item.exact ? pathname === href : (pathname?.startsWith(href) ?? false);
            const Icon = item.icon;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? 'bg-ink/[0.06] font-semibold text-ink'
                    : 'font-medium text-muted hover:bg-ink/[0.035] hover:text-ink'
                }`}
              >
                {/* The one place the brand color appears in the chrome:
                    where you are. A bar, not text, so a pale or dark
                    brand color can never make a label hard to read. */}
                {isActive && (
                  <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary dark:bg-[rgb(var(--tenant-dark-glow))]" aria-hidden="true" />
                )}
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-ink' : 'text-muted'}`} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}

          {/* Sin citas ni reuniones no hay página pública que ver: el
              enlace llevaría a un 404 del propio negocio. Con las dos,
              gana la de reservas — es la que un negocio reparte. */}
          {(reservasEnabled || reunionesEnabled) && (
            <>
              <div className="my-3 h-px bg-border" aria-hidden="true" />

              <a
                href={
                  bookingHref ??
                  (reservasEnabled ? tenantBookingPageUrl(slug) : tenantMeetingsPageUrl(slug))
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-ink/[0.035] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <ArrowUpRight className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {reservasEnabled ? 'Ver mi página de reservas' : 'Ver mi página de reuniones'}
              </a>
            </>
          )}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-xs font-semibold text-ink"
              aria-hidden="true"
            >
              {email.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{email}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABELS[role] ?? role}</p>
            </div>
            <ThemeToggle className="text-muted hover:bg-ink/[0.06] hover:text-ink" />
          </div>
          {footer ?? <SignOutButton />}
        </div>
      </aside>
    </>
  );
}
