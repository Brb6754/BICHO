import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { addDaysKey, dayKey, instantFromLocal } from '@/lib/dates/tenantTime';

// La agenda del panel de demostración.
//
// Por qué NO sale de la base: la tabla de citas de un negocio guarda
// nombre y teléfono de personas, y este panel es público. Aquí las citas
// se INVENTAN a partir del catálogo real del negocio (sus servicios, sus
// recursos, su horario), así que el panel enseña la agenda de ESE
// negocio sin que exista una sola fila real detrás.
//
// Determinista a partir del slug: el mismo negocio enseña siempre la
// misma semana, así que una captura de pantalla no envejece mal y dos
// visitantes ven lo mismo. Las fechas sí son relativas a hoy — una demo
// con citas del mes pasado se lee como un producto abandonado.

const NOMBRES = [
  'María Fernanda L.',
  'Carlos Rentería',
  'Ana Sofía Trejo',
  'Jorge Nevárez',
  'Lucía Mendoza',
  'Rodrigo Salas',
  'Daniela Ibarra',
  'Héctor Quiñones',
  'Paulina Arreola',
  'Emilio Cháirez',
  'Ximena Durán',
  'Alejandro Soto',
];

const TELEFONOS = ['618 112 4590', '618 203 7781', '618 445 1120', '618 390 6634', '618 557 2048'];

/** Hash estable: el mismo slug produce siempre la misma semana. */
function semilla(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type CatalogoDemo = {
  slug: string;
  timezone: string;
  services: { id: string; name: string; duration_minutes: number }[];
  resources: { id: string; name: string }[];
};

/**
 * Una semana de citas plausibles: ayer y anteayer ya cerradas, hoy a
 * medias, y los días que vienen con hueco. Es lo que hace que el panel
 * se vea como un negocio en operación y no como una instalación nueva.
 */
export function demoAgendaDeNegocio({ slug, timezone, services, resources }: CatalogoDemo, now: Date): AgendaBooking[] {
  if (!services.length || !resources.length) return [];

  const base = semilla(slug);
  const hoy = dayKey(now, timezone);
  const citas: AgendaBooking[] = [];

  // Horas de arranque por día. No es una rejilla perfecta a propósito:
  // una agenda real tiene huecos, y una llena de 9 a 8 sin un espacio
  // libre dice justo lo contrario de lo que vende el producto.
  const PLAN: { offset: number; horas: string[] }[] = [
    { offset: -2, horas: ['10:00', '12:30', '16:00'] },
    { offset: -1, horas: ['09:30', '11:00', '13:00', '17:30'] },
    { offset: 0, horas: ['09:00', '10:30', '12:00', '16:30', '18:00'] },
    { offset: 1, horas: ['10:00', '11:30', '15:00', '17:00'] },
    { offset: 2, horas: ['09:30', '13:30', '16:00'] },
    { offset: 4, horas: ['11:00', '12:00'] },
    { offset: 6, horas: ['10:30'] },
  ];

  let n = 0;
  for (const { offset, horas } of PLAN) {
    const dia = addDaysKey(hoy, offset);
    for (const hora of horas) {
      const servicio = services[(base + n * 7) % services.length];
      const recurso = resources[(base + n * 3) % resources.length];
      const startsAt = instantFromLocal(dia, hora, timezone);
      const endsAt = new Date(new Date(startsAt).getTime() + servicio.duration_minutes * 60_000).toISOString();

      // Una cancelada y una no-show en la semana: los dos estados que el
      // dueño necesita ver de un vistazo, y que una demo siempre
      // perfecta nunca enseña.
      const estado =
        offset === -1 && n % 4 === 1 ? 'no_show' : offset === 1 && n % 5 === 2 ? 'cancelled' : offset < 0 ? 'completed' : 'confirmed';

      citas.push({
        id: `demo-${slug}-${n}`,
        starts_at: startsAt,
        ends_at: endsAt,
        status: estado,
        resource_id: recurso.id,
        service_type_id: servicio.id,
        resources: { name: recurso.name },
        service_types: { name: servicio.name },
        customers: { name: NOMBRES[(base + n * 5) % NOMBRES.length], phone: TELEFONOS[(base + n) % TELEFONOS.length] },
      });
      n++;
    }
  }

  return citas.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
