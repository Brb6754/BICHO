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
  Sparkles,
  Palette,
  Gift,
  Wallet,
  Stamp,
  HeartHandshake,
  Megaphone,
  Landmark,
  HandCoins,
  Package,
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

// Con trece módulos posibles, una lista plana de quince renglones ya no
// se lee: se busca. Agrupados por el trabajo que hacen, el ojo salta al
// bloque y luego al renglón. El orden dentro de cada bloque es el de
// siempre (lo que más se abre, arriba).
type NavGroup = 'dinero' | 'clientes' | 'negocio';
const GROUP_LABELS: Record<NavGroup, string> = {
  dinero: 'Dinero',
  clientes: 'Clientes',
  negocio: 'Tu negocio',
};
const GROUP_ORDER: (NavGroup | undefined)[] = [undefined, 'dinero', 'clientes', 'negocio'];

// La barra de abajo en el teléfono: las tres secciones que más se abren
// de las que el negocio tenga, más "Menú" para todo lo demás.
const BOTTOM_PRIORITY = ['/dashboard', '/dashboard/calendar', '/dashboard/caja', '/dashboard/customers', '/dashboard/cotizaciones', '/dashboard/reuniones'];

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  requiresQuotes?: boolean;
  requiresFacturacion?: boolean;
  requiresReservas?: boolean;
  requiresReuniones?: boolean;
  requiresCopiloto?: boolean;
  requiresCaja?: boolean;
  requiresLealtad?: boolean;
  requiresRegresan?: boolean;
  requiresPosts?: boolean;
  requiresResico?: boolean;
  requiresComisiones?: boolean;
  requiresInventario?: boolean;
  /** Citas O reuniones: las dos agendan sobre las mismas personas y el mismo horario. */
  requiresAgenda?: boolean;
  /** Solo el dueño de un negocio real (los demos con navBase no tienen esta página). */
  ownerOnly?: boolean;
  /** Bloque del menú. Sin grupo: lo de todos los días, arriba y sin título. */
  group?: NavGroup;
}[] = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard, exact: true },
  // Arriba de todo lo demás: es una forma de leer las otras secciones,
  // no una sección más.
  { href: '/dashboard/copiloto', label: 'Copiloto', icon: Sparkles, requiresCopiloto: true },
  { href: '/dashboard/calendar', label: 'Agenda', icon: CalendarDays, requiresReservas: true },
  // Caja (db/045): justo después de la agenda, porque las citas completadas son sus ventas.
  { href: '/dashboard/caja', label: 'Caja', icon: Wallet, requiresCaja: true, group: 'dinero' },
  // Comisiones (db/050): junto a Caja, salen de las mismas citas completadas.
  { href: '/dashboard/comisiones', label: 'Comisiones', icon: HandCoins, requiresComisiones: true, group: 'dinero' },
  // Inventario (db/049): también área Números; una venta de producto puede caer en Caja.
  { href: '/dashboard/inventario', label: 'Inventario', icon: Package, requiresInventario: true, group: 'dinero' },
  // Above the catalogue on purpose: services and hours are setup, changed
  // a few times a year. Customers is something an owner looks up.
  { href: '/dashboard/customers', label: 'Clientes', icon: Contact, group: 'clientes' },
  // Lealtad (db/047): junto a Clientes, es sobre las mismas personas.
  { href: '/dashboard/lealtad', label: 'Lealtad', icon: Stamp, requiresLealtad: true, group: 'clientes' },
  // Clientes que regresan (db/046): también sobre las mismas personas.
  { href: '/dashboard/regresan', label: 'Clientes que regresan', icon: HeartHandshake, requiresRegresan: true, group: 'clientes' },
  // El segundo producto de bicho. Aparece solo si el negocio lo tiene
  // prendido: para quien solo agenda citas, un menú con una sección que
  // no usa es ruido permanente.
  // Posts con IA (db/048): para traer a esas mismas clientas desde redes.
  { href: '/dashboard/posts', label: 'Posts con IA', icon: Megaphone, requiresPosts: true, group: 'clientes' },
  { href: '/dashboard/cotizaciones', label: 'Cotizaciones', icon: FileText, requiresQuotes: true, group: 'dinero' },
  // Cuarto módulo. Arriba de cotizaciones no: primero se habla con el
  // prospecto y después se le pone precio, así que este es el orden
  // real del trabajo.
  { href: '/dashboard/reuniones', label: 'Reuniones', icon: Handshake, requiresReuniones: true },
  // Tercer producto. Debajo de cotizaciones porque ese es el orden
  // real del trabajo: se cotiza, se cobra, y al final se factura.
  { href: '/dashboard/facturas', label: 'Facturas', icon: ReceiptText, requiresFacturacion: true, group: 'dinero' },
  // Guía RESICO (db/051): junto a Facturas, es el camino para llegar a facturar.
  { href: '/dashboard/resico', label: 'Guía RESICO', icon: Landmark, requiresResico: true, group: 'dinero' },
  { href: '/dashboard/services', label: 'Servicios', icon: Tag, requiresReservas: true, group: 'negocio' },
  // "Quién atiende" y "Horario" son infraestructura compartida: una
  // reunión ocupa al mismo asesor y el mismo horario que una cita (ver
  // db/039). Un negocio que solo contrató reuniones los necesita igual,
  // y sin esto se quedaría sin dónde darlos de alta.
  { href: '/dashboard/resources', label: 'Quién atiende', icon: Users, requiresAgenda: true, group: 'negocio' },
  { href: '/dashboard/schedule', label: 'Horario', icon: Clock3, requiresAgenda: true, group: 'negocio' },
  { href: '/dashboard/marca', label: 'Mi marca', icon: Palette, ownerOnly: true, group: 'negocio' },
  // Referidos (db/052): todos los negocios, sin flag. El demo no tiene esta página.
  { href: '/dashboard/referidos', label: 'Referidos', icon: Gift, ownerOnly: true, group: 'negocio' },
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
  copilotoEnabled = false,
  cajaEnabled = false,
  lealtadEnabled = false,
  regresanEnabled = false,
  postsEnabled = false,
  resicoEnabled = false,
  comisionesEnabled = false,
  inventarioEnabled = false,
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
  copilotoEnabled?: boolean;
  /** Módulo Caja (db/045). */
  cajaEnabled?: boolean;
  lealtadEnabled?: boolean;
  regresanEnabled?: boolean;
  postsEnabled?: boolean;
  resicoEnabled?: boolean;
  /** Comisiones por empleado (db/050). */
  comisionesEnabled?: boolean;
  /** Inventario (db/049). */
  inventarioEnabled?: boolean;
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

  const visible = NAV_ITEMS.filter(
    (item) =>
      (!item.requiresQuotes || quotesEnabled) &&
      (!item.requiresReservas || reservasEnabled) &&
      (!item.requiresReuniones || reunionesEnabled) &&
      (!item.requiresCopiloto || copilotoEnabled) &&
      (!item.requiresCaja || cajaEnabled) &&
      (!item.requiresLealtad || lealtadEnabled) &&
      (!item.requiresRegresan || regresanEnabled) &&
      (!item.requiresPosts || postsEnabled) &&
      (!item.requiresResico || resicoEnabled) &&
      (!item.requiresComisiones || comisionesEnabled) &&
      (!item.requiresInventario || inventarioEnabled) &&
      (!item.requiresAgenda || reservasEnabled || reunionesEnabled) &&
      (!item.requiresFacturacion || facturacionEnabled) &&
      (!item.ownerOnly || (role === 'owner' && !navBase))
  ).map((item) => {
    const href = navBase ? `${navBase}${item.href.slice(DASHBOARD_ROOT.length)}` : item.href;
    const isActive = item.exact ? pathname === href : (pathname?.startsWith(href) ?? false);
    return { ...item, href, key: item.href, isActive };
  });

  const bottom = BOTTOM_PRIORITY.map((h) => visible.find((v) => v.key === h))
    .filter((v): v is (typeof visible)[number] => Boolean(v))
    .slice(0, 3);
  // "Menú" se pinta activo cuando estás en una sección que no está abajo.
  const menuActive = !bottom.some((b) => b.isActive);

  return (
    <>
      {/* Mobile top bar: content scrolls under it instead of colliding
          with a floating button. main's pt-20 reserves the space. */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2.5 border-b border-border bg-paper/85 px-3 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-ink/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Menu className="h-5 w-5" />
        </button>
        <BusinessMark name={tenantName} logoUrl={logoUrl} color={primaryColor} size="sm" />
        <p className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-ink">{tenantName}</p>
      </div>

      {/* Phone bottom bar. The owner holds the phone in one hand between
          clients; the three sections she opens all day sit under that
          thumb. Everything else lives behind "Menú" (the same drawer). */}
      <nav
        aria-label="Accesos rápidos"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {bottom.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={item.isActive ? 'page' : undefined}
                  className="group flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-200 group-active:scale-90 ${
                      item.isActive ? 'bg-primary text-[rgb(var(--color-cta-fg))] dark:ring-1 dark:ring-inset dark:ring-[rgb(var(--tenant-dark-glow)/0.55)]' : 'text-muted'
                    }`}
                  >
                    <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
                  </span>
                  <span className={`max-w-full truncate px-1 ${item.isActive ? 'font-semibold text-ink' : 'text-muted'}`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              className="group flex min-h-[3.75rem] w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-200 group-active:scale-90 ${
                  menuActive ? 'bg-primary text-[rgb(var(--color-cta-fg))] dark:ring-1 dark:ring-inset dark:ring-[rgb(var(--tenant-dark-glow)/0.55)]' : 'text-muted'
                }`}
              >
                <Menu className="h-[19px] w-[19px]" aria-hidden="true" />
              </span>
              <span className={menuActive ? 'font-semibold text-ink' : 'text-muted'}>Menú</span>
            </button>
          </li>
        </ul>
      </nav>

      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`dash-side fixed inset-y-0 left-0 z-40 flex w-[18.5rem] max-w-[85vw] shrink-0 flex-col border-r border-border bg-surface transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:bg-surface/55 lg:backdrop-blur-xl ${
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 pb-3 pt-5">
          <BusinessMark name={tenantName} logoUrl={logoUrl} color={primaryColor} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-ink">{tenantName}</p>
            <p className="mt-0.5 truncate text-xs text-muted">Panel del negocio</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Secciones" className="dash-scroll flex flex-1 flex-col overflow-y-auto px-3 pb-3">
          {GROUP_ORDER.map((group) => {
            const items = visible.filter((v) => v.group === group);
            if (!items.length) return null;
            return (
              <div key={group ?? 'top'} className={group ? 'mt-5' : 'mt-1'}>
                {group && <p className="px-3 pb-1.5 text-xs font-medium text-muted">{GROUP_LABELS[group]}</p>}
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          aria-current={item.isActive ? 'page' : undefined}
                          className={`dash-nav group flex min-h-[2.75rem] items-center gap-3 rounded-xl px-3 text-sm transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:min-h-[2.5rem] ${
                            item.isActive
                              ? // The brand as a solid pill, exactly where you are.
                                // Its text is computed against that same fill
                                // (--color-cta-fg), so a cream or a near-black
                                // brand both stay readable.
                                'bg-primary font-semibold text-[rgb(var(--color-cta-fg))] shadow-[0_1px_2px_rgb(0_0_0/0.08),0_6px_14px_-6px_rgb(var(--color-primary)/0.7)] dark:ring-1 dark:ring-inset dark:ring-[rgb(var(--tenant-dark-glow)/0.55)]'
                              : 'font-medium text-muted hover:bg-ink/[0.05] hover:text-ink'
                          }`}
                        >
                          <Icon
                            className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${
                              item.isActive ? '' : 'group-hover:scale-110'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* Sin citas ni reuniones no hay página pública que ver: el
              enlace llevaría a un 404 del propio negocio. Con las dos,
              gana la de reservas — es la que un negocio reparte. */}
          {(reservasEnabled || reunionesEnabled) && (
            <a
              href={
                bookingHref ??
                (reservasEnabled ? tenantBookingPageUrl(slug) : tenantMeetingsPageUrl(slug))
              }
              target="_blank"
              rel="noreferrer"
              className="group mt-5 flex min-h-[2.75rem] items-center gap-3 rounded-xl border border-dashed border-border-strong px-3 text-sm font-medium text-ink transition-colors hover:border-solid hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ArrowUpRight
                className="h-[18px] w-[18px] shrink-0 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
              {reservasEnabled ? 'Ver mi página de reservas' : 'Ver mi página de reuniones'}
            </a>
          )}
        </nav>

        {/* Solo se ve en el estilo Suave (globals.css: .dash-upgrade). */}
        {role === 'owner' && !navBase && (
          <Link href="/dashboard/plan" className="dash-upgrade mx-3 mb-3 rounded-[22px] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <span className="block text-[15px] font-semibold leading-snug">Mejora tu plan</span>
            <span className="mt-1 block text-[13px] leading-snug opacity-80">Suma módulos como Caja, Lealtad o Inventario.</span>
            <span className="mt-3 inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold dash-upgrade-btn">
              Ver planes
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </Link>
        )}

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
