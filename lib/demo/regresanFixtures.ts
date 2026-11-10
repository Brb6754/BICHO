import { addDaysKey, dayKey, instantFromLocal } from '@/lib/dates/tenantTime';
import type { CitaRegresan } from '@/lib/regresan/armar';
import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';

// Historial inventado para la demo de "Clientes que regresan".
//
// La agenda de demostración (panelFixtures) solo cubre una semana, así
// que nadie saldría como "no ha vuelto". Aquí se agregan clientas cuya
// última visita fue hace 7–15 semanas, con servicios del catálogo REAL
// del negocio. Nombres distintos a los de la agenda para que nadie
// aparezca "sin venir" y "viene mañana" a la vez. Determinista.

const INACTIVAS = [
  { name: 'Valeria Cisneros', phone: '618 000 1101', semanas: 7 },
  { name: 'Karla Bermúdez', phone: '618 000 1102', semanas: 9 },
  { name: 'Mónica Villarreal', phone: '618 000 1103', semanas: 11 },
  { name: 'Fernanda Olvera', phone: '618 000 1104', semanas: 14 },
];

export const DEMO_LINK_RESENA = 'https://g.page/r/tu-negocio/review';

export function demoCitasRegresan(
  {
    slug,
    timezone,
    services,
    agenda,
  }: { slug: string; timezone: string; services: { id: string; name: string }[]; agenda: AgendaBooking[] },
  now: Date
): CitaRegresan[] {
  const hoy = dayKey(now, timezone);
  const historial: CitaRegresan[] = services.length
    ? INACTIVAS.flatMap((c, i) =>
        // Dos visitas: la última hace `semanas`, otra un mes antes.
        [c.semanas, c.semanas + 4].map((s, j) => ({
          id: `demo-${slug}-hist-${i}-${j}`,
          starts_at: instantFromLocal(addDaysKey(hoy, -s * 7 - i), j ? '11:00' : '17:00', timezone),
          status: 'completed',
          customers: { name: c.name, phone: c.phone },
          service_types: { name: services[(i + j) % services.length].name },
        }))
      )
    : [];

  // La agenda de la semana: lo de las próximas 24 h ya salió por WhatsApp.
  const unDia = now.getTime() + 24 * 60 * 60 * 1000;
  const semana: CitaRegresan[] = agenda.map((c) => ({
    id: c.id,
    starts_at: c.starts_at,
    status: c.status,
    customers: c.customers,
    service_types: c.service_types,
    reminder_sent_at: new Date(c.starts_at).getTime() <= unDia ? now.toISOString() : null,
  }));

  return [...historial, ...semana];
}
