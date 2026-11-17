import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { cargarPanelDemo } from '@/lib/demo/panelData';

export const dynamic = 'force-dynamic';

// "Quién atiende" — o qué atiende, según el giro. La palabra sale de
// `tenants.resource_label` (db/024): un salón reserva estilistas, un
// club reserva pistas y un restaurante, mesas. Llamarles "recursos" al
// dueño sería hablarle en el idioma del esquema.
export default async function RecursosDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { tenant, resources, citas } = datos;
  // El título es el del menú ("Quién atiende"); la palabra del giro
  // (estilistas, barberos, consultorios) queda en la descripción.
  const giro = tenant.resourceLabel?.toLowerCase();

  return (
    <div>
      <PageHeader
        title="Quién atiende"
        description={`Las personas o lugares con los que tus clientas pueden reservar${giro ? ` (${giro})` : ''}. Cada uno lleva su agenda.`}
      />

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {resources.map((r) => {
          const suyas = citas.filter((c) => c.resource_id === r.id && c.status !== 'cancelled').length;
          return (
            <li key={r.id} className="rounded-2xl bg-surface p-5 ring-1 ring-border">
              <p className="text-[15px] font-medium text-ink">{r.name}</p>
              <p className="mt-1 text-[13px] text-muted">
                {suyas === 0 ? 'Agenda libre esta semana' : `${suyas} ${suyas === 1 ? 'cita esta semana' : 'citas esta semana'}`}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
