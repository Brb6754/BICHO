import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { DemoNote } from '@/components/demo/DemoNote';
import { BoostVista, type ContactoVista } from '@/components/tenant-dash/BoostVista';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { ADDON_BOOST, TOPE_BOOST_MENSAJES_MES } from '@/lib/billing/planes';
import { resumirResultados } from '@/lib/boost/reglas';
import { tenantBookingPageUrl } from '@/lib/urls';

export const dynamic = 'force-dynamic';

// Boost en la demo pública: el MISMO componente del panel real, con una
// lista VIP y resultados de ejemplo (teléfonos 618 000 …) y sin acciones.
// Todo lo inventado lleva "Ejemplo:" para que nadie lo lea como un dato real.
export default async function BoostDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();
  const servicio = datos.services[0]?.name ?? 'Corte';
  const precio = Number((datos.services[0] as { price_cents?: number } | undefined)?.price_cents ?? 25000);

  const contactos: ContactoVista[] = [
    { id: 'd1', nombre: 'Ejemplo: Daniela R.', telefono: '526180002301', servicio, dias: [2, 4], franjas: ['tarde'], promos: true, baja: false },
    { id: 'd2', nombre: 'Ejemplo: Sofía M.', telefono: '526180002302', servicio: null, dias: [], franjas: ['manana'], promos: false, baja: false },
    { id: 'd3', nombre: 'Ejemplo: Paola G.', telefono: '526180002303', servicio, dias: [6], franjas: [], promos: true, baja: false },
    { id: 'd4', nombre: 'Ejemplo: Karla V.', telefono: '526180002304', servicio: null, dias: [], franjas: [], promos: false, baja: true },
  ];
  // Cifras de ejemplo armadas con el precio del catálogo demo, no un dato de ningún negocio real.
  const resultados = resumirResultados(
    [
      { resource_id: 'r', starts_at: '1' },
      { resource_id: 'r', starts_at: '2' },
      { resource_id: 'r', starts_at: '3' },
    ],
    [
      { status: 'confirmed', boost_precio_cents: precio },
      { status: 'completed', boost_precio_cents: Math.round(precio * 0.85) },
    ],
    [
      { tipo: 'vip', status: 'sent' },
      { tipo: 'vip', status: 'sent' },
      { tipo: 'vip', status: 'sent' },
      { tipo: 'flojas', status: 'sent' },
      { tipo: 'flojas', status: 'sent' },
    ]
  );

  return (
    <div>
      <PageHeader
        title={ADDON_BOOST.nombre}
        description="Llena los huecos de tu agenda con clientas que ya te conocen: avisos cuando se cancela una cita y promociones en tus horas flojas."
      />
      <BoostVista
        usados={5}
        tope={TOPE_BOOST_MENSAJES_MES}
        resultados={resultados}
        vipPrendido
        flojasPrendido
        config={{ descuento: 15, aviso: 4, dias: [1, 2, 3, 4], desde: 11, hasta: 17 }}
        contactos={contactos}
        linkPublico={tenantBookingPageUrl(slug)}
        aviso="Ejemplo: lista, mensajes y resultados inventados para la demo. Los botones no envían nada."
      />
      <DemoNote>Datos de ejemplo: nombres, teléfonos (618 000 …) y cifras inventados. Ningún mensaje sale de esta demo.</DemoNote>
    </div>
  );
}
