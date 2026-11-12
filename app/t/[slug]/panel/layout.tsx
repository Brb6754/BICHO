import { notFound } from 'next/navigation';
import { Sidebar } from '@/app/t/[slug]/dashboard/Sidebar';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { tenantColorCssVars, tenantDarkModeCssVars } from '@/lib/branding/colors';

// El armazón del panel abierto: el MISMO Sidebar que usa el panel real,
// con su menú desplegable en teléfono.
//
// Reusarlo y no copiarlo es la decisión importante. El sidebar del
// panel real ya resuelve el cajón móvil, el estado activo, el logo del
// negocio, el color de la marca y la tecla Escape; una segunda copia
// para la demo se habría separado de la original en una semana, y la
// demo habría empezado a enseñar un producto que ya no existe.
//
// `navBase` es la prop que existe justo para esto: cambia /dashboard
// por /panel en todos los enlaces sin tocar el componente.
export default async function PanelDemoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { tenant } = datos;

  return (
    <div
      className="tenant-shell tenant-dash relative flex min-h-screen bg-paper"
      style={
        {
          ...tenantColorCssVars(tenant.primaryColor, tenant.secondaryColor, tenant.accentColor),
          ...tenantDarkModeCssVars(tenant.primaryColor, tenant.secondaryColor, tenant.accentColor),
        } as React.CSSProperties
      }
    >
      <Sidebar
        tenantName={tenant.name}
        slug={slug}
        email="Datos de ejemplo"
        role="owner"
        primaryColor={tenant.primaryColor}
        logoUrl={tenant.logoUrl}
        navBase="/panel"
        regresanEnabled
        // La demo enseña la Caja con datos inventados (panel/caja).
        cajaEnabled
        // Y Lealtad, con clientas inventadas (panel/lealtad).
        lealtadEnabled
        // Y la Guía RESICO, con la Caja demo para la calculadora (panel/resico).
        resicoEnabled
        // Y Comisiones, con citas inventadas por persona (panel/comisiones).
        comisionesEnabled
        // Y el Inventario, con productos inventados (panel/inventario).
        inventarioEnabled
        bookingHref="/"
        footer={
          // El Sidebar ya trae arriba "Ver mi página de reservas", así
          // que repetirlo aquí abajo —como hacía la primera versión—
          // daba el mismo enlace dos veces en un cajón de seis. En el
          // panel real este espacio es el botón de cerrar sesión; en una
          // demo pública no hay sesión que cerrar.
          <p className="text-[12px] leading-snug text-[rgb(var(--sidebar-fg))]/60">
            Demo pública · solo lectura
          </p>
        }
      />

      <div className="relative z-10 min-w-0 flex-1 pb-24 pt-14 lg:pb-0 lg:pt-0">
        {/* La franja que dice qué es esto. Sin ella alguien podría creer
            que está viendo la agenda real de un negocio, y son citas
            inventadas. */}
        <div className="border-b border-border bg-surface px-5 py-3 sm:px-8">
          <p className="text-[13px] text-muted">
            <span className="font-semibold text-ink">Demo del panel.</span> Así ve su agenda el dueño
            de {tenant.name}. Datos de ejemplo, solo lectura.
          </p>
        </div>

        <div className="dash-page mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-10 lg:px-12">{children}</div>
      </div>
    </div>
  );
}
