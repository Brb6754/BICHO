'use client';

import Link from 'next/link';
import { CalendarDays, Clock3, Trash2 } from 'lucide-react';
import { ActionForm } from '@/components/tenant-dash/ui/ActionForm';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { addDaysKey, dayKey, dayLabel, formatTime } from '@/lib/dates/tenantTime';
import { ConHoja } from './Hoja';
import { Avatar, BOTON_BORRAR, Chip, InterruptorPagina, TARJETA } from './visual';
import { SEMANA, hora, resumirHorario, type Franja } from './horario';

export type CitaPersona = {
  id: string;
  starts_at: string;
  status: string;
  servicio: string | null;
  cliente: string | null;
};

type Accion = (formData: FormData) => unknown | Promise<unknown>;

// QUIÉN ATIENDE — una persona como tarjeta: sus iniciales a color, qué
// servicios da (fichas) y su horario en una línea. Tocarla abre su agenda
// de la semana: qué días abre, cuántas citas tiene cada día y las que
// siguen. Sin `acciones` es la demo (se ve todo, no se cambia nada).
export function PersonaCard({
  persona,
  franjas,
  citas,
  servicios,
  timezone,
  now,
  base,
  acciones,
}: {
  persona: { id: string; name: string; active?: boolean };
  franjas: Franja[];
  /** Sus citas de los próximos 7 días (sin canceladas). */
  citas: CitaPersona[];
  /** Las fichas de servicios; en el panel trae su botón para cambiarlas. */
  servicios: React.ReactNode;
  timezone: string | null;
  now: Date;
  base: string;
  acciones?: { alternar: Accion; borrar: Accion };
}) {
  const activa = persona.active !== false;
  const hoy = dayKey(now, timezone);
  const proximas = citas.filter((c) => new Date(c.starts_at) >= now).slice(0, 8);
  const resumen = resumirHorario(franjas);

  return (
    <li className={`${TARJETA} flex flex-col`}>
      <ConHoja
        titulo={`Agenda de ${persona.name}`}
        etiqueta={`Ver la agenda de ${persona.name}`}
        className="-m-2 rounded-2xl p-2"
        boton={
          <span className={`flex items-center gap-4 transition-opacity ${activa ? '' : 'opacity-55'}`}>
            <Avatar nombre={persona.name} tamano="grande" />
            <span className="min-w-0 flex-1">
              <span className="block text-[19px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{persona.name}</span>
              <span className="mt-1 flex items-start gap-1.5 text-[15px] text-muted">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {resumen}
              </span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink underline underline-offset-4">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {proximas.length ? `${proximas.length} ${proximas.length === 1 ? 'cita' : 'citas'} esta semana` : 'Ver su agenda'}
              </span>
            </span>
          </span>
        }
      >
        {() => (
          <div className="flex flex-col gap-6">
            <section aria-label="Su semana">
              <h3 className="text-[16px] font-semibold text-ink">Su semana</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {Array.from({ length: 7 }, (_, i) => addDaysKey(hoy, i)).map((key) => {
                  const [y, m, d] = key.split('-').map(Number);
                  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
                  const delDia = franjas.filter((f) => f.day_of_week === dow).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                  const n = citas.filter((c) => dayKey(c.starts_at, timezone) === key).length;
                  return (
                    <li key={key} className={`flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-2 ${key === hoy ? 'bg-primary/[0.08]' : 'bg-ink/[0.03]'}`}>
                      <span className="w-24 shrink-0 text-[15px] font-semibold capitalize text-ink">
                        {key === hoy ? 'Hoy' : `${SEMANA.find((s) => s.dow === dow)!.corto} ${d}`}
                      </span>
                      <span className={`min-w-0 flex-1 text-[15px] tabular-nums ${delDia.length ? 'text-ink' : 'text-muted'}`}>
                        {delDia.length ? delDia.map((f) => `${hora(f.starts_at)}–${hora(f.ends_at)}`).join(' y ') : 'No atiende'}
                      </span>
                      {n > 0 && (
                        <span className="shrink-0 rounded-full bg-ink px-2.5 py-0.5 text-[13px] font-semibold tabular-nums text-white">
                          {n} {n === 1 ? 'cita' : 'citas'}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-label="Sus próximas citas">
              <h3 className="text-[16px] font-semibold text-ink">Sus próximas citas</h3>
              {proximas.length === 0 ? (
                <p className="mt-2 rounded-2xl border border-dashed border-border px-4 py-4 text-[15px] text-muted">
                  Tiene la semana libre. Comparte tu link para que le reserven.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                  {proximas.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-20 shrink-0">
                        <span className="block text-[17px] font-bold tabular-nums text-ink">{formatTime(c.starts_at, timezone)}</span>
                        <span className="block text-[13px] text-muted first-letter:uppercase">
                          {dayLabel(dayKey(c.starts_at, timezone), now, timezone).split(' ').slice(0, 2).join(' ')}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{c.servicio ?? 'Cita'}</span>
                        <span className="block truncate text-[14px] text-muted">con {c.cliente ?? 'cliente'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`${base}/calendar`}
                className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-5 text-[15px] font-medium text-ink hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Abrir la agenda completa
              </Link>
            </section>
          </div>
        )}
      </ConHoja>

      <div className="mt-3">{servicios}</div>

      {acciones && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
          <ActionForm action={acciones.alternar} success={activa ? `${persona.name}: oculto de tu página` : `${persona.name}: ya se ofrece en tu página`}>
            <InterruptorPagina active={activa} label={persona.name} />
          </ActionForm>
          <ConfirmForm
            action={acciones.borrar}
            success={`${persona.name} se borró`}
            confirmTitle={`¿Borrar a ${persona.name}?`}
            // bookings.resource_id es ON DELETE CASCADE (db/001): borrar se lleva sus citas. Se dice antes.
            confirmMessage={`Se borran también su horario y todas sus citas, las pasadas y las que vienen. No se puede deshacer. Si ${persona.name} solo deja de atender un tiempo, mejor apaga el interruptor.`}
            confirmLabel="Sí, borrar todo"
            dismissLabel="No, conservarlo"
            triggerVariant="danger"
            triggerClassName={BOTON_BORRAR}
          >
            <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
            Borrar
          </ConfirmForm>
        </div>
      )}
    </li>
  );
}

/** Fichas de servicios sin edición (la demo, o cuando no hay catálogo todavía). */
export function FichasServicios({ nombres }: { nombres: string[] | null }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {nombres === null ? <Chip>Da todos los servicios</Chip> : nombres.map((n) => <Chip key={n}>{n}</Chip>)}
    </div>
  );
}
