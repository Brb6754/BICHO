import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { AbrirHoja, HojaFormulario } from '@/components/tenant-dash/fichas/Hoja';
import { CamposServicio, ServicioCard } from '@/components/tenant-dash/fichas/ServicioCard';

export const dynamic = 'force-dynamic';

// Servicios de la demo: el catálogo REAL del negocio (el mismo que ve la
// página de reservas), con las mismas tarjetas y hojas del panel. Agregar
// y editar se pueden probar: la hoja se llena igual, pero al guardar solo
// confirma "Ejemplo: …" (la demo es de solo lectura).
export default async function ServiciosDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Lo que tus clientas pueden reservar. Toca uno para editarlo."
        action={
          <AbrirHoja id="nuevo-servicio">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Agregar servicio
          </AbrirHoja>
        }
      />

      <ul className="mt-6 grid gap-3 lg:grid-cols-2">
        {datos.services.map((s) => (
          <ServicioCard key={s.id} s={s} />
        ))}
      </ul>

      <HojaFormulario id="nuevo-servicio" titulo="Agregar servicio" success="servicio agregado" enviar="Agregar servicio">
        <CamposServicio />
      </HojaFormulario>
    </div>
  );
}
