// Lógica pura del directorio (bichomx.com/negocios): slugs de ciudad y
// giro, nombres para los títulos, y orden por distancia. Sin Supabase,
// para que se pruebe sola y la use también el cliente.

/** Lo que el directorio publica de un negocio. Nada más sale de la base. */
export type NegocioDirectorio = {
  slug: string;
  name: string;
  vertical: string;
  logoUrl: string | null;
  ciudad: string;
  colonia: string | null;
  lat: number | null;
  lng: number | null;
};

/** El giro es el `vertical` del tenant, que ya es un slug. */
const GIROS: Record<string, { uno: string; varios: string }> = {
  peluqueria: { uno: 'Estética', varios: 'Estéticas' },
  spa: { uno: 'Spa', varios: 'Spas' },
  dentista: { uno: 'Dentista', varios: 'Dentistas' },
  doctor: { uno: 'Consultorio', varios: 'Consultorios' },
  padel: { uno: 'Club de pádel', varios: 'Clubes de pádel' },
  gimnasio: { uno: 'Gimnasio', varios: 'Gimnasios' },
  restaurante: { uno: 'Restaurante', varios: 'Restaurantes' },
  inmobiliaria: { uno: 'Inmobiliaria', varios: 'Inmobiliarias' },
  general: { uno: 'Negocio', varios: 'Negocios' },
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function giroNombre(vertical: string, plural = false): string {
  const g = GIROS[vertical];
  if (g) return plural ? g.varios : g.uno;
  return capitalizar(vertical.replace(/-/g, ' '));
}

/** "San Juan del Río" → "san-juan-del-rio". Mismo criterio para ciudad y giro. */
export function slugDirectorio(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Distancia en km entre dos puntos (haversine). */
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Más cerca primero; los que no tienen pin van al final, en su orden. */
export function ordenarPorDistancia<T extends { lat: number | null; lng: number | null }>(
  negocios: T[],
  origen: { lat: number; lng: number }
): (T & { km: number | null })[] {
  // sort es estable: los empates (y los sin pin) conservan su orden.
  return negocios
    .map((n) => ({ ...n, km: n.lat != null && n.lng != null ? distanciaKm(origen, { lat: n.lat, lng: n.lng }) : null }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
}

export function filtrarDirectorio(
  negocios: NegocioDirectorio[],
  { ciudad, giro }: { ciudad?: string | null; giro?: string | null }
): NegocioDirectorio[] {
  return negocios.filter(
    (n) => (!ciudad || slugDirectorio(n.ciudad) === ciudad) && (!giro || slugDirectorio(n.vertical) === giro)
  );
}

/** Ciudades y giros que existen, para el buscador y los enlaces SEO. */
export function opcionesDirectorio(negocios: NegocioDirectorio[]) {
  const ciudades = new Map<string, { slug: string; nombre: string; total: number }>();
  const giros = new Map<string, { slug: string; nombre: string; total: number }>();
  for (const n of negocios) {
    const c = slugDirectorio(n.ciudad);
    if (c) ciudades.set(c, { slug: c, nombre: ciudades.get(c)?.nombre ?? n.ciudad.trim(), total: (ciudades.get(c)?.total ?? 0) + 1 });
    const g = slugDirectorio(n.vertical);
    if (g) giros.set(g, { slug: g, nombre: giroNombre(n.vertical, true), total: (giros.get(g)?.total ?? 0) + 1 });
  }
  const porNombre = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, 'es');
  return { ciudades: [...ciudades.values()].sort(porNombre), giros: [...giros.values()].sort(porNombre) };
}

/** Menos de esto en pantalla: la lista manda y el mapa va colapsado. */
export const MIN_PINES_MAPA = 5;

export function urlReservar(slug: string): string {
  return `https://${slug}.bichomx.com/reservar`;
}
