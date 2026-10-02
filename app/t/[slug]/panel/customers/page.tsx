import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { buildRoster, customerTenure } from '@/lib/customers/roster';
import { dayLabel, dayKey } from '@/lib/dates/tenantTime';

export const dynamic = 'force-dynamic';

const ETIQUETA: Record<string, string> = {
  nuevo: 'Nuevo',
  recurrente: 'Frecuente',
  inactivo: 'No ha vuelto',
};

// Clientes: la MISMA función que arma la lista del panel real
// (buildRoster) sobre las citas de ejemplo. El conteo de visitas, la
// antigüedad y el "no ha vuelto" se calculan igual que en producción —
// si cambiara esa lógica, esta pantalla cambiaría con ella en vez de
// quedarse enseñando una versión vieja del producto.
export default async function ClientesDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { citas, now, tenant } = datos;
  const clientes = buildRoster(
    citas.map((c) => ({
      id: c.id,
      starts_at: c.starts_at,
      status: c.status,
      customers: c.customers,
      service_types: c.service_types,
    })),
    now
  );

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Quién ha venido, cuántas veces y quién lleva tiempo sin aparecer."
      />

      <ul className="mt-8 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
        {clientes.map((c) => {
          const tenure = customerTenure(c, now, tenant.timezone);
          return (
            <li key={c.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{c.name}</p>
                <p className="truncate text-[13px] text-muted">
                  {c.phone ?? 'Sin teléfono'}
                  {c.lastVisit && ` · última visita ${dayLabel(dayKey(c.lastVisit, tenant.timezone), now, tenant.timezone)}`}
                </p>
              </div>
              <span className="rounded-full bg-primary/[0.12] px-2.5 py-1 text-[12px] font-semibold text-ink">
                {ETIQUETA[tenure] ?? tenure}
              </span>
              <span className="text-[13px] tabular-nums text-muted">
                {c.visits} {c.visits === 1 ? 'visita' : 'visitas'}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-[13px] leading-relaxed text-muted">
        Esta lista se arma agrupando por teléfono al leer: el sistema guarda un cliente por cita, y
        juntarlos aquí evita fusionar a dos personas que compartan un número.
      </p>
    </div>
  );
}
