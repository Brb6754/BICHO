import type { Metadata } from 'next';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ItemList, ItemRow, ActiveSwitch } from '@/components/tenant-dash/ItemList';
import { DemoNote } from '@/components/demo/DemoNote';
import { DEMO_SERVICES } from '@/components/demo/fixtures';
import { formatPrice } from '@/components/booking/types';

export const metadata: Metadata = {
  title: 'Servicios · demo — bicho',
  robots: { index: false, follow: false },
};

// Mirrors app/t/[slug]/dashboard/services/page.tsx with the same
// components. The switches render because seeing them is the point —
// they're `type="submit"` with no form around them here, so pressing
// one does nothing rather than pretending to save.
export default function DemoServicesPage() {
  const activeCount = DEMO_SERVICES.length;

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Lo que tus clientes pueden reservar, con su duración y precio. Solo los activos aparecen en tu página."
      />

      <DemoNote>
        Aquí el dueño agrega, edita, apaga y borra servicios. En la demo los
        controles están a la vista pero no guardan nada.
      </DemoNote>

      <div className="mt-8">
        <p className="mb-3 px-1 text-sm text-muted">
          {activeCount} de {DEMO_SERVICES.length} {DEMO_SERVICES.length === 1 ? 'activo' : 'activos'}
        </p>
        <ItemList>
          {DEMO_SERVICES.map((s, i) => (
            <ItemRow
              key={s.id}
              first={i === 0}
              title={s.name}
              meta={<>{s.duration_minutes} min</>}
              trail={
                <>
                  <span className="mr-2 font-semibold tabular-nums text-ink">
                    {formatPrice(s.price_cents)}
                  </span>
                  <ActiveSwitch active label={s.name} />
                </>
              }
            />
          ))}
        </ItemList>
      </div>
    </div>
  );
}
