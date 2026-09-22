import type { Metadata } from 'next';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ItemList, ItemRow, ActiveSwitch } from '@/components/tenant-dash/ItemList';
import { DemoNote } from '@/components/demo/DemoNote';
import { DEMO_RESOURCES, DEMO_SCHEDULE, DEMO_WEEKDAYS } from '@/components/demo/fixtures';

export const metadata: Metadata = {
  title: 'Quién atiende · demo — bicho',
  robots: { index: false, follow: false },
};

// Mirrors app/t/[slug]/dashboard/resources/page.tsx. The meta line
// shows each person's working days, which the real page doesn't — here
// it earns its place: without it, two rows that read just "Daniela" and
// "Marco" say nothing about why the booking flow offers different hours
// for each.
export default function DemoResourcesPage() {
  return (
    <div>
      <PageHeader
        title="Quién atiende"
        description="Las personas, sillas, consultorios o pistas que se pueden reservar. Solo los activos aparecen en tu página."
      />

      <DemoNote>
        Un negocio puede tener una silla o veinte consultorios. Cada uno lleva
        su propio horario, y la página de reservas solo ofrece horas donde
        alguien está disponible.
      </DemoNote>

      <div className="mt-8">
        <ItemList>
          {DEMO_RESOURCES.map((r, i) => {
            const days = (DEMO_SCHEDULE[r.id] ?? []).map((d) => DEMO_WEEKDAYS[d.day].slice(0, 3));
            return (
              <ItemRow
                key={r.id}
                first={i === 0}
                title={r.name}
                meta={days.length > 0 ? days.join(' · ') : 'Sin horario asignado'}
                trail={<ActiveSwitch active label={r.name} />}
              />
            );
          })}
        </ItemList>
      </div>
    </div>
  );
}
