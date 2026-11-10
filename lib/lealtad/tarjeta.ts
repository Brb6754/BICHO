// Las reglas de la tarjeta de sellos, sin base de datos (para probarlas).
//
// Los sellos son un libro (db/047): cada sello y cada canje es una fila.
// Lo que la tarjeta lleva HOY se deriva de los dos conteos.

export type EstadoTarjeta = {
  /** Sellos en la tarjeta actual (0..requeridos). */
  sellos: number;
  requeridos: number;
  /** Ya llenó la tarjeta: el dueño puede canjear. */
  completa: boolean;
  /** Premios pendientes de canjear (si acumuló de más sin canjear). */
  premiosPendientes: number;
};

export function estadoTarjeta(totalSellos: number, sellosCanjeados: number, requeridos: number): EstadoTarjeta {
  const req = Math.max(1, Math.floor(requeridos));
  // Clamp: si se borró un sello ya canjeado (cita corregida a "no vino"),
  // la tarjeta queda en cero, no en negativo.
  const disponibles = Math.max(0, totalSellos - sellosCanjeados);
  const premiosPendientes = Math.floor(disponibles / req);
  return {
    sellos: premiosPendientes > 0 ? req : disponibles,
    requeridos: req,
    completa: premiosPendientes > 0,
    premiosPendientes,
  };
}

// 128 bits, hex: el mismo formato que genera el trigger de db/047
// (gen_random_uuid sin guiones) y que exige el check de la columna.
export function nuevoToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function tokenValido(token: string): boolean {
  return /^[0-9a-f]{32}$/.test(token);
}

// "a la 6ª visita, la 7ª gratis" — lo que se le dice a la clienta.
export function textoRegla(requeridos: number, premio: string): string {
  return `Junta ${requeridos} sellos: ${premio.charAt(0).toLowerCase()}${premio.slice(1)}.`;
}

// wa.me quiere lada de país; 10 dígitos = México.
export function waNumero(tel: string | null | undefined): string | null {
  const d = (tel ?? '').replace(/\D/g, '');
  if (d.length === 10) return `52${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

export function waTarjetaHref(tel: string | null | undefined, negocio: string, nombre: string, url: string): string {
  const texto = `¡Hola ${nombre.split(' ')[0]}! Esta es tu tarjeta de lealtad de ${negocio}. Aquí ves tus sellos: ${url}`;
  const num = waNumero(tel);
  return `https://wa.me/${num ?? ''}?text=${encodeURIComponent(texto)}`;
}

// Promociones: vigente si hoy (día local del negocio, YYYY-MM-DD) cae
// en el rango. Comparar strings ISO de fecha es comparar fechas.
export function promoVigente(p: { active: boolean; starts_on: string; ends_on: string }, hoy: string): boolean {
  return p.active && p.starts_on <= hoy && hoy <= p.ends_on;
}
