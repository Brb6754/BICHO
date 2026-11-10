import { buildRoster, type RosterBooking } from '@/lib/customers/roster';
import { dayKey, dayLabel, formatTime } from '@/lib/dates/tenantTime';
import { esServicio } from '@/lib/meetings/kinds';
import { clientasInactivas, visitasParaResena, SEMANAS_POR_OMISION } from './clientas';
import { mensajeRegreso, mensajeResena } from './mensajes';
import { VENTANA_HORAS } from './recordatorios';
import type { FilaRegresan, ProximoRecordatorio } from '@/components/tenant-dash/RegresanBoard';

// De las citas del negocio a lo que pinta RegresanBoard. Una sola función
// para el panel real y la demo: si la demo armara sus listas por su
// cuenta, enseñaría un producto distinto al que se vende.

export type CitaRegresan = RosterBooking & {
  kind?: string | null;
  reminder_sent_at?: string | null;
};

export type AjustesRegresan = { semanas: number; linkResena: string | null };

/** Ajustes desde una fila de `tenants` leída con select('*'): sin db/046, los valores por omisión. */
export function ajustesDe(tenant: Record<string, unknown> | null | undefined): AjustesRegresan {
  const semanas = Number(tenant?.regresan_weeks);
  const link = tenant?.google_review_url;
  return {
    semanas: Number.isInteger(semanas) && semanas >= 1 ? semanas : SEMANAS_POR_OMISION,
    linkResena: typeof link === 'string' && link.startsWith('https://') ? link : null,
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function armarRegresan({
  citas,
  negocio,
  linkReservar,
  ajustes,
  canal,
  timezone,
  now,
}: {
  citas: CitaRegresan[];
  negocio: string;
  linkReservar: string;
  ajustes: AjustesRegresan;
  canal: 'whatsapp' | 'correo';
  timezone: string | null;
  now: Date;
}): { inactivas: FilaRegresan[]; resenas: FilaRegresan[]; proximos: ProximoRecordatorio[] } {
  const servicios = citas.filter(esServicio);
  const roster = buildRoster(servicios, now);

  const inactivas = clientasInactivas(roster, ajustes.semanas, now, timezone).map((c) => ({
    key: c.key,
    name: c.name,
    phone: c.phone,
    detalle: `Hace ${c.semanas} semanas${c.lastService ? ` · ${c.lastService}` : ''}`,
    mensaje: mensajeRegreso({ nombre: c.name, servicio: c.lastService, negocio, linkReservar }),
  }));

  const resenas = ajustes.linkResena
    ? visitasParaResena(servicios, now).map((v) => ({
        key: v.key,
        name: v.name,
        phone: v.phone,
        email: v.email,
        detalle: `${cap(dayLabel(dayKey(v.startsAt, timezone), now, timezone))}${v.service ? ` · ${v.service}` : ''}`,
        mensaje: mensajeResena({ nombre: v.name, negocio, linkResena: ajustes.linkResena as string }),
      }))
    : [];

  const hasta = now.getTime() + VENTANA_HORAS * 60 * 60 * 1000;
  const proximos = servicios
    .filter((c) => {
      const t = new Date(c.starts_at).getTime();
      return c.status === 'confirmed' && t > now.getTime() && t <= hasta;
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((c) => {
      const tieneCanal = Boolean(c.customers?.email) || (canal === 'whatsapp' && Boolean(c.customers?.phone));
      return {
        id: c.id,
        name: c.customers?.name ?? 'Cliente',
        cuando: `${dayLabel(dayKey(c.starts_at, timezone), now, timezone)} · ${formatTime(c.starts_at, timezone)}`,
        estado: c.reminder_sent_at ? 'enviado' : tieneCanal ? 'pendiente' : 'sin-canal',
      } satisfies ProximoRecordatorio;
    });

  return { inactivas, resenas, proximos };
}
