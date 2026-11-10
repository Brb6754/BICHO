import { toE164Mx } from '@/lib/whatsapp/phone';

// Los mensajes prellenados de "Clientes que regresan".
//
// Sin envío automático a propósito: un número de negocio que manda
// mensajes masivos a gente que no le escribió primero termina baneado
// por WhatsApp. El dueño abre el chat (wa.me), revisa el texto y lo
// manda él. Este archivo solo arma el texto y el link; corre igual en
// el servidor y en el navegador.

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre.trim();
}

export function mensajeRegreso({
  nombre,
  servicio,
  negocio,
  linkReservar,
}: {
  nombre: string;
  servicio: string | null;
  negocio: string;
  linkReservar: string;
}): string {
  // "tu próxima cita de …" y no "tu …": con servicios en plural
  // ("Acrílicas") la segunda se lee "tu acrílicas". Solo la primera letra
  // a minúscula, para no estropear marcas ("Botox Allergan").
  const limpio = servicio?.trim();
  const que = limpio ? `tu próxima cita de ${limpio.charAt(0).toLowerCase()}${limpio.slice(1)}` : 'tu próxima visita';
  return `¡Hola ${primerNombre(nombre)}! Ya toca ${que} en ${negocio}. Aparta tu horario aquí cuando quieras: ${linkReservar}`;
}

export function mensajeResena({
  nombre,
  negocio,
  linkResena,
}: {
  nombre: string;
  negocio: string;
  linkResena: string;
}): string {
  return `¡Gracias por venir a ${negocio}, ${primerNombre(nombre)}! Si te gustó, ¿nos regalas una reseña en Google? Nos ayuda muchísimo: ${linkResena}`;
}

/** Link wa.me con el texto prellenado. null si el teléfono no sirve. */
export function waLink(phone: string | null | undefined, texto: string): string | null {
  const numero = phone ? toE164Mx(phone) : null;
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null;
}

/** mailto: con asunto y cuerpo prellenados, para quien dejó su correo. */
export function mailtoLink(email: string, asunto: string, texto: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`;
}

/**
 * El link de reseñas que pega el negocio. Solo https (es una frontera de
 * confianza: termina dentro de un mensaje y de un href), máximo 500
 * caracteres — igual que el check de db/046. Vacío = quitarlo.
 */
export function limpiarLinkResena(raw: string): { ok: true; url: string | null } | { ok: false } {
  const valor = raw.trim();
  if (!valor) return { ok: true, url: null };
  if (valor.length > 500) return { ok: false };
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' ? { ok: true, url: url.toString() } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/** Semanas para "no ha vuelto": entero de 1 a 52 (check de db/046). */
export function limpiarSemanas(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 52 ? n : null;
}
