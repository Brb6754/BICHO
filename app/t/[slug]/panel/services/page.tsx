import { notFound } from 'next/navigation';
import { Clock3 } from 'lucide-react';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { formatDuration, formatPrice } from '@/components/booking/types';

export const dynamic = 'force-dynamic';

// Servicios: estos SÍ son reales — son el catálogo público del negocio,
// el mismo que alimenta la página de reservas. Es la pantalla donde se
// ve que el panel y la página de reservas son el mismo sistema y no dos
// listas que alguien mantiene a mano.
export default async function ServiciosDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Lo que el negocio ofrece, con su duración y su precio. Es la misma lista que ve el cliente al reservar."
      />

      <ul className="mt-8 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
        {datos.services.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-ink">{s.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDuration(s.duration_minutes)}
              </p>
            </div>
            <span className="rounded-full bg-primary/[0.14] px-3 py-1 text-sm font-bold tabular-nums text-ink">
              {formatPrice(s.price_cents) || 'Sin costo'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
