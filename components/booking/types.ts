// Shared vocabulary for the booking flow's components.
//
// Nothing in here (or in any of the flow's components) names a colour.
// Every surface is a semantic token — primary / surface / paper / ink /
// muted / border / success / error — which resolve to each tenant's own
// palette through the CSS variables the page sets. Swapping the theme is
// how a business gets its identity; none of these files has to change.

export type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  // db/031. `undefined` = la columna todavia no existe en este
  // ambiente, y entonces vale lo de siempre: el precio se muestra.
  show_price?: boolean;
  // The schema has no description column today. The prop exists so a
  // card renders one the day it does, and collapses cleanly until then
  // rather than leaving a hole in the layout.
  description?: string | null;
};

export type Resource = {
  id: string;
  name: string;
  // db/032. Vacío o ausente = da TODOS los servicios.
  service_ids?: string[];
};

export type Slot = { slot_start: string; slot_end: string };

// 'any' is a real choice, not the absence of one: it books whichever
// resource is free, which is what opens up the most times.
export const ANY_RESOURCE = 'any' as const;
export type ResourceChoice = string | typeof ANY_RESOURCE;

export type StepId = 'service' | 'resource' | 'date' | 'time' | 'details';

export type StepDef = { id: StepId; label: string };

// The resource step disappears when the business has one bookable thing:
// asking someone to choose between a single option is a question with no
// information in it. The label is configurable because the same slot is
// a stylist, a dentist, a court or a room depending on the business.
export function stepsFor(resourceCount: number, resourceLabel: string): StepDef[] {
  const steps: StepDef[] = [{ id: 'service', label: 'Servicio' }];
  if (resourceCount > 1) steps.push({ id: 'resource', label: resourceLabel });
  steps.push({ id: 'date', label: 'Fecha' }, { id: 'time', label: 'Hora' }, { id: 'details', label: 'Datos' });
  return steps;
}

/**
 * Precio para el cliente. Cadena vacía cuando es cero, y quien la usa
 * no la pinta.
 *
 * Cero no es "gratis" en el sentido comercial: es un negocio donde
 * reservar no se cobra — una mesa de restaurante, una consulta de
 * valoración, una pista incluida en la membresía. "$0" junto a "Mesa
 * para dos" se lee como un error del sistema, no como una cortesía.
 */
// El precio TAL COMO se publica, que no es lo mismo que formatearlo.
//
// Tres estados y tres salidas, porque el negocio puede querer decir tres
// cosas distintas (db/031):
//   · no publica precio      -> '' (la ficha no se dibuja)
//   · publica y cuesta 0     -> '' tambien, pero quien llama pone
//                               'Sin costo': ahi SI es una afirmacion
//   · publica y cuesta algo  -> '$450'
export function publicPrice(service: Service): string {
  if (service.show_price === false) return '';
  return formatPrice(service.price_cents);
}

/** True cuando el negocio decidio no publicar el precio de este servicio. */
export function priceHidden(service: Service): boolean {
  return service.show_price === false;
}

export function formatPrice(cents: number): string {
  if (cents <= 0) return '';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
