import type { Metadata } from 'next';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { DemoNote } from '@/components/demo/DemoNote';
import { DEMO_RESOURCES, DEMO_SCHEDULE } from '@/components/demo/fixtures';

export const metadata: Metadata = {
  title: 'Horario · demo — bicho',
  robots: { index: false, follow: false },
};

// Mirrors app/t/[slug]/dashboard/schedule/page.tsx: one week per
// person, Monday first, "Cerrado" on the days without a range. The real
// page puts a remove button inside each range pill — left out here for
// the same reason as the agenda's actions.
const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export default function DemoSchedulePage() {
  return (
    <div>
      <PageHeader
        title="Horario de atención"
        description="Cuándo puede reservarse cada persona o espacio. Tu página solo ofrece horas dentro de estos rangos."
      />

      <DemoNote>
        Este horario es lo que produce los huecos que ves en la página de
        reservas. Daniela trabaja sábados y Marco no — por eso el flujo ofrece
        horarios distintos según con quién quieras ir.
      </DemoNote>

      <div className="mt-10 flex flex-col gap-10">
        {DEMO_RESOURCES.map((r) => {
          const own = DEMO_SCHEDULE[r.id] ?? [];
          const openDays = DAYS.filter((d) => own.some((s) => s.day === d.value)).length;
          return (
            <section key={r.id} aria-label={'Horario de ' + r.name}>
              <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
                <h2 className="font-semibold text-ink">{r.name}</h2>
                <span className="text-sm tabular-nums text-muted">
                  {openDays === 0 ? 'Sin horario' : `${openDays} ${openDays === 1 ? 'día' : 'días'} a la semana`}
                </span>
              </div>

              <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
                {DAYS.map((d, i) => {
                  const slots = own.filter((s) => s.day === d.value);
                  return (
                    <li
                      key={d.value}
                      className={
                        'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5 ' +
                        (i > 0 ? 'border-t border-border' : '')
                      }
                    >
                      <span
                        className={'w-24 shrink-0 text-sm font-medium ' + (slots.length ? 'text-ink' : 'text-muted')}
                      >
                        {d.label}
                      </span>
                      {slots.length === 0 ? (
                        <span className="text-sm text-muted">Cerrado</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {slots.map((s) => (
                            <span
                              key={`${d.value}-${s.from}`}
                              className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm tabular-nums text-ink"
                            >
                              {s.from} – {s.to}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
