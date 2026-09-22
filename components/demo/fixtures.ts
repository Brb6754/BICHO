import type { Resource, Service, Slot } from '@/components/booking/types';
import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { addDaysKey, dayKey, instantFromLocal } from '@/lib/dates/tenantTime';

// The business behind the public platform demo (/plataforma).
//
// Why fixtures and not a real tenant: this is linked from the landing's
// "Ver la plataforma" button, so anyone on the internet can open it. If
// it read a live tenant, editing that business would change what
// prospects see; if it wrote, strangers would be dropping real rows
// into a real salon's calendar. Nothing here touches Supabase — no
// reads, no writes, no keys needed — so the demo can't break a customer
// and a customer can't break the demo.
//
// Everything is generated RELATIVE TO TODAY, so the demo never shows a
// calendar full of last year's dates. That's the one thing that makes a
// seeded demo look abandoned.

export const DEMO = {
  slug: 'demo',
  name: 'Estudio Aurora',
  tagline: 'Estética y color · Durango',
  timezone: 'America/Mexico_City',
  // A real, plausible palette so the "cada negocio con su marca" claim
  // is visible rather than asserted. Not bicho's own colours: this is
  // supposed to look like a customer, not like us.
  primaryColor: '#2F5D50',
  secondaryColor: '#1E3F36',
  accentColor: '#C98A5E',
  ownerEmail: 'hola@estudioaurora.mx',
  location: 'Av. 20 de Noviembre 810, Centro, Durango',
  resourceLabel: 'Profesional',
} as const;

export const DEMO_SERVICES: Service[] = [
  { id: 'svc-corte', name: 'Corte y peinado', duration_minutes: 45, price_cents: 35000 },
  { id: 'svc-color', name: 'Color completo', duration_minutes: 120, price_cents: 120000 },
  { id: 'svc-barba', name: 'Barba y perfilado', duration_minutes: 30, price_cents: 18000 },
  { id: 'svc-tratamiento', name: 'Tratamiento de keratina', duration_minutes: 90, price_cents: 95000 },
];

export const DEMO_RESOURCES: Resource[] = [
  { id: 'res-daniela', name: 'Daniela' },
  { id: 'res-marco', name: 'Marco' },
];

// Weekly hours, per resource, as [openTime, closeTime] by weekday
// (0 = Sunday). Two different weeks on purpose: one professional works
// Saturdays and the other doesn't, which is what makes "¿con quién?"
// worth asking in the flow.
type DayRange = { day: number; from: string; to: string };

export const DEMO_SCHEDULE: Record<string, DayRange[]> = {
  'res-daniela': [
    { day: 1, from: '10:00', to: '19:00' },
    { day: 2, from: '10:00', to: '19:00' },
    { day: 3, from: '10:00', to: '19:00' },
    { day: 4, from: '10:00', to: '20:00' },
    { day: 5, from: '10:00', to: '20:00' },
    { day: 6, from: '09:00', to: '15:00' },
  ],
  'res-marco': [
    { day: 2, from: '11:00', to: '19:00' },
    { day: 3, from: '11:00', to: '19:00' },
    { day: 4, from: '11:00', to: '20:00' },
    { day: 5, from: '11:00', to: '20:00' },
  ],
};

export const DEMO_WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Appointments already on the books, as offsets from today — so the
// agenda always has something in it, today always has a "next", and the
// booking flow always shows some hours taken.
const BOOKED: {
  dayOffset: number;
  time: string;
  resourceId: string;
  serviceId: string;
  customer: string;
  phone: string;
  status?: string;
}[] = [
  { dayOffset: 0, time: '10:00', resourceId: 'res-daniela', serviceId: 'svc-corte', customer: 'Lucía Fernández', phone: '618 114 2290' },
  { dayOffset: 0, time: '12:00', resourceId: 'res-daniela', serviceId: 'svc-color', customer: 'Renata Ibáñez', phone: '618 220 7741' },
  { dayOffset: 0, time: '13:00', resourceId: 'res-marco', serviceId: 'svc-barba', customer: 'Óscar Medina', phone: '618 455 1183' },
  { dayOffset: 0, time: '16:30', resourceId: 'res-daniela', serviceId: 'svc-corte', customer: 'Paulina Ruvalcaba', phone: '618 309 6620' },
  { dayOffset: 0, time: '17:00', resourceId: 'res-marco', serviceId: 'svc-corte', customer: 'Diego Alcalá', phone: '618 771 0094', status: 'cancelled' },
  { dayOffset: 1, time: '11:00', resourceId: 'res-daniela', serviceId: 'svc-tratamiento', customer: 'Mariana Solís', phone: '618 118 3345' },
  { dayOffset: 1, time: '15:00', resourceId: 'res-marco', serviceId: 'svc-corte', customer: 'Javier Nuño', phone: '618 662 8810' },
  { dayOffset: 2, time: '10:30', resourceId: 'res-daniela', serviceId: 'svc-color', customer: 'Sofía Carrillo', phone: '618 907 4412' },
  { dayOffset: 3, time: '12:30', resourceId: 'res-marco', serviceId: 'svc-barba', customer: 'Emilio Tapia', phone: '618 553 2277' },
  { dayOffset: 4, time: '17:30', resourceId: 'res-daniela', serviceId: 'svc-corte', customer: 'Ana Villareal', phone: '618 240 9938' },
];

function serviceById(id: string) {
  return DEMO_SERVICES.find((s) => s.id === id)!;
}
function resourceById(id: string) {
  return DEMO_RESOURCES.find((r) => r.id === id)!;
}

// Appointments as the agenda components already expect them. Built from
// `now` so the caller decides the clock — a Server Component passes the
// request time, which keeps the render deterministic for that request.
export function demoBookings(now: Date): AgendaBooking[] {
  const today = dayKey(now, DEMO.timezone);
  return BOOKED.map((b, i) => {
    const day = addDaysKey(today, b.dayOffset);
    const service = serviceById(b.serviceId);
    const startsAt = instantFromLocal(day, b.time, DEMO.timezone);
    const endsAt = new Date(new Date(startsAt).getTime() + service.duration_minutes * 60_000).toISOString();
    return {
      id: `demo-booking-${i}`,
      starts_at: startsAt,
      ends_at: endsAt,
      status: b.status ?? 'confirmed',
      resource_id: b.resourceId,
      service_type_id: b.serviceId,
      resources: { name: resourceById(b.resourceId).name },
      service_types: { name: service.name },
      customers: { name: b.customer, phone: b.phone },
    };
  });
}

// The demo's stand-in for get_available_slots: walk each resource's
// weekly hours over the next `days`, step by the service's duration,
// and drop anything that collides with a booking or is already in the
// past. Same output shape the RPC returns, so BookingFlow can't tell
// the difference.
export function demoSlots(service: Service, now: Date, days = 45): Record<string, Slot[]> {
  const today = dayKey(now, DEMO.timezone);
  const taken = demoBookings(now)
    .filter((b) => b.status !== 'cancelled')
    .map((b) => ({
      resourceId: b.resource_id!,
      from: new Date(b.starts_at).getTime(),
      to: new Date(b.ends_at).getTime(),
    }));

  const out: Record<string, Slot[]> = {};

  for (const resource of DEMO_RESOURCES) {
    const slots: Slot[] = [];
    for (let i = 0; i < days; i++) {
      const day = addDaysKey(today, i);
      // Noon avoids the DST edge where midnight may not exist.
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      for (const range of DEMO_SCHEDULE[resource.id] ?? []) {
        if (range.day !== weekday) continue;
        const open = new Date(instantFromLocal(day, range.from, DEMO.timezone)).getTime();
        const close = new Date(instantFromLocal(day, range.to, DEMO.timezone)).getTime();
        const step = service.duration_minutes * 60_000;

        for (let start = open; start + step <= close; start += step) {
          const end = start + step;
          if (start <= now.getTime()) continue;
          const collides = taken.some(
            (t) => t.resourceId === resource.id && start < t.to && end > t.from
          );
          if (collides) continue;
          slots.push({
            slot_start: new Date(start).toISOString(),
            slot_end: new Date(end).toISOString(),
          });
        }
      }
    }
    out[resource.id] = slots;
  }

  return out;
}
