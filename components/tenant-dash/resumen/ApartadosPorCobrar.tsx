'use client';

import { useState } from 'react';
import { Hourglass } from 'lucide-react';
import { appointmentWhen } from '@/lib/dates/tenantTime';
import { textoVence, type Apartado } from '@/lib/anticiposPanel';
import { AccionesAnticipo, avisarDemo } from '@/app/t/[slug]/dashboard/calendar/AccionesAnticipo';

// "APARTADOS POR COBRAR" — en el inicio, solo si hay alguno. Citas que la
// recepcionista apartó y esperan su anticipo: sin cobro en línea la
// clienta paga por transferencia o en el local, y si nadie lo marca el
// horario se libera solo. Aquí se marca sin tener que buscar la cita.
//
// En la demo los botones solo quitan la tarjeta de la página.

export function ApartadosPorCobrar({
  apartados,
  slug,
  timezone,
  ahora,
  demo = false,
}: {
  apartados: Apartado[];
  slug: string;
  timezone: string | null;
  ahora: string;
  demo?: boolean;
}) {
  const [quitados, setQuitados] = useState<string[]>([]);
  const lista = apartados.filter((a) => !quitados.includes(a.id));
  if (!lista.length) return null;
  const now = new Date(ahora);

  return (
    <section aria-labelledby="inicio-apartados" className="mt-6">
      <h2 id="inicio-apartados" className="text-[19px] font-semibold tracking-tight text-ink">
        Apartados por cobrar
      </h2>
      <p className="mb-3 mt-1 text-[15px] leading-relaxed text-muted">
        Esperan su anticipo. Si ya te pagaron, márcalo para que el horario no se libere solo.
      </p>
      <ul className="grid gap-3 lg:grid-cols-2">
        {lista.map((a) => (
          <li key={a.id} className="flex flex-col gap-3 rounded-3xl border-2 border-warning/40 bg-warning-soft p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning text-white" aria-hidden="true">
                <Hourglass className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold leading-snug text-ink">{a.nombre}</p>
                <p className="text-[15px] text-ink/75">
                  {a.servicio} · {appointmentWhen(a.startsAt, timezone)}
                </p>
              </div>
              {a.montoMxn > 0 && (
                <span className="shrink-0 text-xl font-bold tabular-nums text-ink">${a.montoMxn.toLocaleString('es-MX')}</span>
              )}
            </div>
            <p className="text-[14px] font-medium text-ink/80">{textoVence(a.venceEn, now, timezone)}</p>
            <AccionesAnticipo
              slug={slug}
              bookingId={a.id}
              nombre={a.nombre}
              montoMxn={a.montoMxn}
              demo={
                demo
                  ? (accion) => {
                      if (accion !== 'tiempo') setQuitados((q) => [...q, a.id]);
                      avisarDemo(accion);
                    }
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
