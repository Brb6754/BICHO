import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { DemoNote } from '@/components/demo/DemoNote';
import { AnticiposVista, AyudaAnticipos } from '@/components/tenant-dash/AnticiposVista';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { CONFIG_APAGADA } from '@/lib/anticipos/config';

export const dynamic = 'force-dynamic';

// Anticipos en la demo pública: el MISMO componente del panel real, sin
// `guardar` (todo en memoria). Los servicios salen del catálogo del negocio demo.
export default async function AnticiposDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();
  const { tenant, services } = datos;

  return (
    <div>
      <PageHeader title="Anticipos" description="Pide un anticipo para apartar la cita y que no te dejen plantada." help={<AyudaAnticipos />} />
      {/* El primer servicio sin anticipo (0) y el más caro pide más que el general. */}
      <AnticiposVista
        slug={slug}
        config={{
          ...CONFIG_APAGADA,
          activado: true,
          montoGeneralMxn: 100,
          politica: 'El anticipo se descuenta del total. Si cancelas con menos de 24 horas, no se devuelve.',
          instrucciones: `Transferencia a la CLABE 0000 0000 0000 0000 00 (ejemplo) a nombre de ${tenant.name}, o en efectivo en el local.`,
        }}
        servicios={services.map((s, i) => ({ id: s.id, name: s.name, deposit_mxn: i === 0 ? 0 : s.price_cents >= 60000 ? 200 : null }))}
        // Fase 1, igual que las cuentas reales hoy: sin cobro en línea, con instrucciones y «Ya pagó».
        mp={{ habilitado: false, conexion: null }}
        timezone={tenant.timezone}
        puedeCambiar
      />
      <DemoNote>Anticipos de ejemplo: puedes moverle a todo, pero no se guarda ni se conecta nada.</DemoNote>
    </div>
  );
}
