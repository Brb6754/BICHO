import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { AbrirHoja, HojaFormulario } from '@/components/tenant-dash/fichas/Hoja';
import { PersonaCard, FichasServicios } from '@/components/tenant-dash/fichas/PersonaCard';
import { CAMPO, Campo } from '@/components/tenant-dash/fichas/visual';

export const dynamic = 'force-dynamic';

// "Quién atiende" de la demo: las mismas tarjetas del panel. Tocar a
// alguien abre su agenda de la semana con las citas de ejemplo; agregar
// se puede probar y solo confirma "Ejemplo: …".
export default async function RecursosDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { tenant, resources, schedules, citas, now } = datos;
  const giro = tenant.resourceLabel?.toLowerCase();

  return (
    <div>
      <PageHeader
        title="Quién atiende"
        description={`Las personas o lugares con los que te reservan${giro ? ` (${giro})` : ''}. Toca a alguien para ver su agenda.`}
        action={
          <AbrirHoja id="nueva-persona">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Agregar persona o lugar
          </AbrirHoja>
        }
      />

      <ul className="mt-6 grid gap-3 lg:grid-cols-2">
        {resources.map((r) => (
          <PersonaCard
            key={r.id}
            persona={r}
            franjas={schedules.filter((s) => s.resource_id === r.id)}
            citas={citas
              .filter((c) => c.resource_id === r.id && c.status !== 'cancelled')
              .map((c) => ({ id: c.id, starts_at: c.starts_at, status: c.status, servicio: c.service_types?.name ?? null, cliente: c.customers?.name ?? null }))}
            servicios={<FichasServicios nombres={null} />}
            timezone={tenant.timezone}
            now={now}
            base="/panel"
          />
        ))}
      </ul>

      <HojaFormulario id="nueva-persona" titulo="Agregar a quien atiende" success="persona agregada" enviar="Agregar">
        <Campo label="¿Cómo se llama?" ayuda="Una persona o un lugar: Renata, Silla 2, Cabina 1.">
          <input type="text" name="name" required maxLength={80} placeholder="Ej. Renata" className={CAMPO} />
        </Campo>
      </HojaFormulario>
    </div>
  );
}
