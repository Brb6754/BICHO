import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { ResumenHoy, alertaInventario, alertaRegresan, dineroDe, type Alerta } from '@/components/tenant-dash/ResumenHoy';
import { dayKey } from '@/lib/dates/tenantTime';
import { armarRegresan } from '@/lib/regresan/armar';
import { SEMANAS_POR_OMISION } from '@/lib/regresan/clientas';
import { DEMO_LINK_RESENA, demoCitasRegresan } from '@/lib/demo/regresanFixtures';
import { demoCaja } from '@/lib/caja/demo';
import { demoInventario } from '@/lib/inventario/demo';
import { seAcaba } from '@/lib/inventario/logica';
import { tenantBookingPageUrl } from '@/lib/urls';
import { tilesDe } from '@/lib/branding/moduloColores';
import { apartadoDe, conAnticiposDemo } from '@/lib/anticiposPanel';
import { ApartadosPorCobrar } from '@/components/tenant-dash/resumen/ApartadosPorCobrar';

// Los módulos que la demo enseña (los mismos que prende su Sidebar en panel/layout.tsx).
const PRODUCTOS_DEMO = {
  reservas: true,
  regresan: true,
  caja: true,
  lealtad: true,
  resico: true,
  comisiones: true,
  inventario: true,
  cotizaciones: false,
  facturacion: false,
  reuniones: false,
  copiloto: false,
  posts: false,
  // La demo enseña la recepcionista y Cotiza con pláticas inventadas (panel/whatsapp).
  whatsapp: true,
  // Boost de clientes con lista VIP y resultados de ejemplo (panel/boost).
  boost: true,
};

export const metadata: Metadata = {
  title: 'Panel del negocio · demo',
  robots: { index: false, follow: false },
};

// Las citas se generan relativas a `new Date()`, así que una página
// cacheada se volvería, poco a poco, la demo de la semana pasada.
export const dynamic = 'force-dynamic';

// EL PANEL DEL DUEÑO, ABIERTO.
//
// Vive en {slug}.bichomx.com/panel y no pide contraseña, que es justo
// lo que un panel real sí hace. Dos cosas lo vuelven seguro:
//
//  1. Solo existe para los ocho negocios de demostración (isDemoSlug).
//     Sobre cualquier otro slug devuelve 404 — un cliente real no
//     quiere que cualquiera vea cómo luce su agenda.
//  2. Las citas NO salen de la base. La tabla de citas guarda nombre y
//     teléfono de personas reales; aquí se inventan a partir del
//     catálogo público del negocio (sus servicios, sus recursos). El
//     panel enseña la agenda de ESE negocio sin que exista una sola
//     fila real detrás.
//
// Y es de solo lectura: ningún botón escribe. Un panel público con
// acciones sería una puerta abierta para cancelarle la agenda a alguien
// desde la calle.
export default async function PanelDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { tenant, services, resources, now } = datos;
  // Dos citas apartadas esperando anticipo y una pagada, igual que en la agenda demo.
  const citas = conAnticiposDemo(datos.citas, now);
  const apartados = citas.filter((c) => c.status === 'confirmed' && c.deposit_status === 'pending').map(apartadoDe);
  const tz = tenant.timezone;

  const hoyKey = dayKey(now, tz);
  const hoy = citas.filter((c) => dayKey(c.starts_at, tz) === hoyKey);
  const proximas = citas.filter((c) => dayKey(c.starts_at, tz) > hoyKey && c.status === 'confirmed');

  // Los mismos módulos que la demo enseña en el menú, con sus mismos
  // datos inventados: así el Resumen y cada pantalla cuentan lo mismo.
  const { inactivas } = armarRegresan({
    citas: demoCitasRegresan({ slug, timezone: tz, services, agenda: citas }, now),
    negocio: tenant.name,
    linkReservar: tenantBookingPageUrl(slug),
    ajustes: { semanas: SEMANAS_POR_OMISION, linkResena: DEMO_LINK_RESENA },
    canal: 'whatsapp',
    timezone: tz,
    now,
  });
  const bajos = demoInventario(slug, hoyKey).productos.filter(seAcaba).map((p) => p.nombre);
  const alertas = [
    alertaInventario(bajos, '/panel'),
    alertaRegresan(
      inactivas.map((c) => c.name),
      SEMANAS_POR_OMISION,
      '/panel'
    ),
  ].filter((a): a is Alerta => Boolean(a));

  return (
    <div>
      <ResumenHoy
        tenantName={tenant.name}
        now={now}
        timezone={tz}
        today={hoy}
        upcoming={proximas}
        dinero={dineroDe(demoCaja(slug, services, tz, now, citas), hoyKey)}
        alertas={alertas}
        base="/panel"
        modulos={tilesDe(PRODUCTOS_DEMO, '/panel', null, false)}
        apartados={<ApartadosPorCobrar apartados={apartados} slug={slug} timezone={tz} ahora={now.toISOString()} demo />}
        demo={{ servicios: services.map((s) => s.name), personas: resources.map((r) => r.name), hoyKey }}
      />

      <p className="mt-12 text-[13px] leading-relaxed text-muted">
        Es una demo: puedes tocar y probar todo, pero nada se guarda.
      </p>
    </div>
  );
}
