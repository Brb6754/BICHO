import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { cargarPanelDemo } from '@/lib/demo/panelData';

export const dynamic = 'force-dynamic';

// La semana empieza en LUNES, no en domingo. La columna de la base
// guarda 0=domingo porque es lo que devuelve Postgres, pero nadie en un
// negocio piensa su semana así.
const SEMANA = [
  { dia: 1, nombre: 'Lunes' },
  { dia: 2, nombre: 'Martes' },
  { dia: 3, nombre: 'Miércoles' },
  { dia: 4, nombre: 'Jueves' },
  { dia: 5, nombre: 'Viernes' },
  { dia: 6, nombre: 'Sábado' },
  { dia: 0, nombre: 'Domingo' },
];

/** "09:00:00" → "9:00". La base guarda segundos que a nadie le importan. */
function hora(valor: string): string {
  const [h, m] = valor.split(':');
  return `${Number(h)}:${m}`;
}

// Horario: real, el mismo que decide qué huecos ofrece la página de
// reservas. Es la pantalla que explica el producto sin explicarlo —
// cambiar una fila aquí cambia lo que un cliente puede reservar.
export default async function HorarioDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { resources, schedules, tenant } = datos;
  const etiqueta = tenant.resourceLabel ?? 'quien atiende';

  return (
    <div>
      <PageHeader
        title="Horario"
        description={`A qué hora abre cada ${etiqueta.toLowerCase()}. De aquí salen los huecos que el cliente ve al reservar.`}
      />

      <div className="mt-8 space-y-5">
        {resources.map((r) => {
          const suyo = schedules.filter((s) => s.resource_id === r.id);
          return (
            <section key={r.id} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
              <h2 className="border-b border-border px-5 py-3 text-[15px] font-semibold text-ink">{r.name}</h2>
              <dl className="divide-y divide-border">
                {SEMANA.map(({ dia, nombre }) => {
                  const rangos = suyo.filter((s) => s.day_of_week === dia);
                  return (
                    <div key={dia} className="flex items-baseline justify-between gap-6 px-5 py-2.5 text-[14px]">
                      <dt className="text-ink">{nombre}</dt>
                      <dd className={rangos.length ? 'tabular-nums font-medium text-ink' : 'text-muted'}>
                        {rangos.length
                          ? rangos.map((s) => `${hora(s.starts_at)}–${hora(s.ends_at)}`).join(' · ')
                          : 'Cerrado'}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
