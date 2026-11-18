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
  House,
  Ellipsis,
  MessageCircle,
  Zap,
  Lock,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { BusinessMark } from '@/components/tenant-dash/BusinessMark';
import { tenantBookingPageUrl, tenantMeetingsPageUrl } from '@/lib/urls';
import SignOutButton from './SignOutButton';
import { ShareLink, ShareLinkCompact } from '@/components/tenant-dash/ui/ShareLink';
import type { TileModulo } from '@/lib/branding/moduloColores';

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
// se lee: se busca. Agrupados por INTENCIÓN —lo que la dueña viene a
// hacer— el ojo salta al bloque y luego al renglón (docs/UX-PANEL.md →
// "Navegación"). Dentro de cada bloque, lo que más se abre va arriba.
// Lo que su plan no incluye no estorba aquí: va al final, con candado.
type NavGroup = 'agenda' | 'clientes' | 'dinero' | 'crecer' | 'ajustes';
const GROUP_LABELS: Record<NavGroup, string> = {
  agenda: 'Agenda',
  clientes: 'Clientes',
  dinero: 'Dinero',
  crecer: 'Crecer',
  ajustes: 'Ajustes',
};
const GROUP_ORDER: (NavGroup | undefined)[] = [undefined, 'agenda', 'clientes', 'dinero', 'crecer', 'ajustes'];

// La barra de abajo en el teléfono, como la de una app: Inicio / Agenda /
// Clientes / Más. Si el negocio no tiene agenda, el hueco lo toma la
// siguiente sección que sí tenga. "Más" abre el cajón con todo lo demás.
const BOTTOM_PRIORITY = ['/dashboard', '/dashboard/calendar', '/dashboard/customers', '/dashboard/cotizaciones', '/dashboard/reuniones', '/dashboard/caja'];
// En la barra se llaman como en una app; en el cajón, como el título de cada página.
const BOTTOM_LABEL: Record<string, { label: string; icon?: typeof LayoutDashboard }> = {
  '/dashboard': { label: 'Inicio', icon: House },
};

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
  requiresWhatsapp?: boolean;
  /** Llena tus huecos (Boost de clientes): add-on de Negocio/Pro (con candado en Esencial). */
  requiresBoost?: boolean;
  /** Citas O reuniones: las dos agendan sobre las mismas personas y el mismo horario. */
  requiresAgenda?: boolean;
  /** Solo el dueño de un negocio real (los demos con navBase no tienen esta página). */
  ownerOnly?: boolean;
  /** Bloque del menú. Sin grupo: lo de todos los días, arriba y sin título. */
  group?: NavGroup;
}[] = [
  { href: '/dashboard', label: 'Inicio', icon: House, exact: true },
  // Arriba de todo lo demás: es una forma de leer las otras secciones,
  // no una sección más.
  { href: '/dashboard/copiloto', label: 'Copiloto', icon: Sparkles, requiresCopiloto: true },

  // AGENDA — las citas y lo que las hace posibles. Servicios, quién
  // atiende y horario se configuran pocas veces, pero son de la agenda:
  // buscarlos en "Tu negocio" era adivinar.
  { href: '/dashboard/calendar', label: 'Agenda', icon: CalendarDays, requiresReservas: true, group: 'agenda' },
  // Una reunión ocupa a la misma persona en el mismo calendario (db/039).
  { href: '/dashboard/reuniones', label: 'Reuniones', icon: Handshake, requiresReuniones: true, group: 'agenda' },
  { href: '/dashboard/services', label: 'Servicios', icon: Tag, requiresReservas: true, group: 'agenda' },
  // Infraestructura compartida: citas O reuniones (ver db/039).
  { href: '/dashboard/resources', label: 'Quién atiende', icon: Users, requiresAgenda: true, group: 'agenda' },
  { href: '/dashboard/schedule', label: 'Horario', icon: Clock3, requiresAgenda: true, group: 'agenda' },

  // CLIENTES — las mismas personas, vistas desde distintos lados.
  { href: '/dashboard/customers', label: 'Clientes', icon: Contact, group: 'clientes' },
  { href: '/dashboard/regresan', label: 'Clientes que regresan', icon: HeartHandshake, requiresRegresan: true, group: 'clientes' },
  { href: '/dashboard/lealtad', label: 'Lealtad', icon: Stamp, requiresLealtad: true, group: 'clientes' },
  // Recepcionista y Cotiza por WhatsApp: habla con esas mismas personas.
  { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: MessageCircle, requiresWhatsapp: true, group: 'clientes' },

  // DINERO — en el orden real del trabajo: se cobra (Caja), se reparte
  // (Comisiones), se repone (Inventario); y para quien vende por
  // proyecto: se cotiza, se factura, y la guía para poder facturar.
  { href: '/dashboard/caja', label: 'Caja', icon: Wallet, requiresCaja: true, group: 'dinero' },
  { href: '/dashboard/comisiones', label: 'Comisiones', icon: HandCoins, requiresComisiones: true, group: 'dinero' },
  { href: '/dashboard/inventario', label: 'Inventario', icon: Package, requiresInventario: true, group: 'dinero' },
  { href: '/dashboard/cotizaciones', label: 'Cotizaciones', icon: FileText, requiresQuotes: true, group: 'dinero' },
  { href: '/dashboard/facturas', label: 'Facturas', icon: ReceiptText, requiresFacturacion: true, group: 'dinero' },
  { href: '/dashboard/resico', label: 'Impuestos (RESICO)', icon: Landmark, requiresResico: true, group: 'dinero' },

  // CRECER — traer clientas nuevas y llenar huecos.
  { href: '/dashboard/boost', label: 'Llena tus huecos', icon: Zap, requiresBoost: true, group: 'crecer' },
  { href: '/dashboard/posts', label: 'Posts con IA', icon: Megaphone, requiresPosts: true, group: 'crecer' },

  // AJUSTES — lo que se toca una vez. Solo el dueño de un negocio real.
  { href: '/dashboard/marca', label: 'Mi marca', icon: Palette, ownerOnly: true, group: 'ajustes' },
  { href: '/dashboard/plan', label: 'Mi plan', icon: Settings2, ownerOnly: true, group: 'ajustes' },
  // Referidos (db/052): todos los negocios, sin flag.
  { href: '/dashboard/referidos', label: 'Gana meses gratis', icon: Gift, ownerOnly: true, group: 'ajustes' },
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
  whatsappEnabled = false,
  boost,
  bloqueados = [],
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
  /** WhatsApp: plan Pro o recepcionista/Cotiza prendidos (lib/products whatsappVisible). */
  whatsappEnabled?: boolean;
  /** Boost: 'on' = abre su página; 'locked' = el plan no lo incluye, candado a /dashboard/plan; sin valor = oculto. */
  boost?: 'on' | 'locked';
  /** Módulos que el plan no incluye (tilesDe con `bloqueado`): al final del menú, con candado. */
  bloqueados?: TileModulo[];
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
      (!item.requiresWhatsapp || whatsappEnabled) &&
      (!item.requiresBoost || boost === 'on') &&
      (!item.requiresAgenda || reservasEnabled || reunionesEnabled) &&
      (!item.requiresFacturacion || facturacionEnabled) &&
      (!item.ownerOnly || (role === 'owner' && !navBase))
  ).map((item) => {
    const href = navBase ? `${navBase}${item.href.slice(DASHBOARD_ROOT.length)}` : item.href;
    const isActive = item.exact ? pathname === href : (pathname?.startsWith(href) ?? false);
    return { ...item, href, key: item.href, isActive };
  });

  // El link que la dueña reparte. Sin citas ni reuniones no hay página
  // pública: el enlace llevaría a un 404 del propio negocio. Con las dos,
  // gana la de reservas — es la que un negocio reparte.
  const linkPublico =
    reservasEnabled || reunionesEnabled
      ? (bookingHref ?? (reservasEnabled ? tenantBookingPageUrl(slug) : tenantMeetingsPageUrl(slug)))
      : null;
  // La demo no deja seña de "link compartido": no es el teléfono de una dueña.
  const slugSena = navBase ? undefined : slug;

  const bottom = BOTTOM_PRIORITY.map((h) => visible.find((v) => v.key === h))
    .filter((v): v is (typeof visible)[number] => Boolean(v))
    .slice(0, 3);
  // "Más" se pinta activo cuando estás en una sección que no está abajo.
  const menuActive = !bottom.some((b) => b.isActive);

  return (
    <>
      {/* Mobile top bar, in the business's own color like an app's. The
          menu lives in the bottom bar ("Más"), so there's no hamburger
          up here. main's pt-20 reserves the space. */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2.5 bg-primary px-4 text-[rgb(var(--color-cta-fg))] shadow-[0_1px_0_rgb(0_0_0/0.08)] lg:hidden">
        <span className="rounded-[0.6rem] ring-2 ring-[rgb(var(--color-cta-fg)/0.3)]">
          <BusinessMark name={tenantName} logoUrl={logoUrl} color={primaryColor} size="sm" />
        </span>
        <p className="min-w-0 truncate text-[16px] font-semibold tracking-tight">{tenantName}</p>
        {/* La acción #1 de valor, siempre a un toque en el teléfono. */}
        {linkPublico && <ShareLinkCompact url={linkPublico} slug={slugSena} negocio={tenantName} />}
      </div>

      {/* Phone bottom bar. The owner holds the phone in one hand between
          clients; the three sections she opens all day sit under that
          thumb. Everything else lives behind "Más" (the same drawer). */}
      <nav
        aria-label="Accesos rápidos"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {bottom.map((item) => {
            const alias = BOTTOM_LABEL[item.key];
            const Icon = alias?.icon ?? item.icon;
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
                    {alias?.label ?? item.label}
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
                <Ellipsis className="h-[19px] w-[19px]" aria-hidden="true" />
              </span>
              <span className={menuActive ? 'font-semibold text-ink' : 'text-muted'}>Más</span>
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

          {/* Lo que el plan no incluye: al final, plegado, sin estorbar.
              Cerrado por omisión; quien lo abre ve qué gana subiendo. */}
          {bloqueados.length > 0 && (
            <details className="group/mas mt-5">
              <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center gap-3 rounded-xl px-3 text-xs font-medium text-muted hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Más con otro plan ({bloqueados.length})
                <ChevronRight
                  className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-open/mas:rotate-90 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <ul className="mt-0.5 flex flex-col gap-0.5">
                {bloqueados.map((t) => (
                  <li key={t.clave}>
                    <Link
                      href={navBase ? `${navBase}${t.href.slice(DASHBOARD_ROOT.length)}` : t.href}
                      className="flex min-h-[2.75rem] items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:min-h-[2.5rem]"
                    >
                      <span className="truncate">{t.label}</span>
                      {t.bloqueado && <span className="ml-auto shrink-0 text-xs">Plan {t.bloqueado.plan}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </nav>

        {linkPublico && (
          // En el teléfono ya está en la barra de arriba; en el cajón solo estorbaría.
          <div className="mx-3 mb-3 hidden rounded-2xl border border-border p-3 lg:block">
            <p className="px-1 text-[13px] font-semibold text-ink">
              {reservasEnabled ? 'Tu link de reservas' : 'Tu link de reuniones'}
            </p>
            <ShareLink
              url={linkPublico}
              slug={slugSena}
              negocio={tenantName}
              corto
              className="mt-2 !flex-nowrap [&>*]:flex-1 [&>*]:justify-center [&>*]:px-2"
            />
            <a
              href={linkPublico}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium text-muted lg:min-h-[2.25rem] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Ver cómo la ven tus clientas
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
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
          </div>
          {footer ?? <SignOutButton />}
        </div>
      </aside>
    </>
  );
}
