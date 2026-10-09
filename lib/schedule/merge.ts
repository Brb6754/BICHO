// Unir los rangos de un mismo día.
//
// POR QUÉ UNIR Y NO REEMPLAZAR.
//
// Dos rangos encimados el mismo día no son dos turnos: son uno mal
// capturado. Y la disponibilidad se calcula sobre estas filas, así que
// 09:00–20:00 junto a 10:00–18:00 no produce "un horario raro", produce
// la MISMA hora ofrecida dos veces en la página de reservas.
//
// La tentación es que el rango nuevo reemplace a cualquiera que toque.
// Es destructivo: la propia pantalla le dice al negocio que parta el día
// en dos cuando cierra a mediodía (9:00–14:00 y 16:00–20:00), así que
// alguien que corrige la tarde a 13:00–18:00 perdería la mañana entera
// sin que nada se lo avise. Unir nunca borra tiempo abierto.
//
// Los rangos que apenas se tocan (14:00–18:00 después de 09:00–14:00)
// también se unen: para quien reserva, eso es estar abierto de corrido.

export type Rango = { starts_at: string; ends_at: string };

/** Postgres devuelve 'HH:MM:SS'; un <input type="time"> manda 'HH:MM'. */
export function hhmm(t: string): string {
  return t.trim().slice(0, 5);
}

/**
 * Devuelve los rangos unidos y ordenados. Compara las horas como texto,
 * que con 'HH:MM' de 24 horas y cero a la izquierda ordena igual que el
 * reloj — y evita construir fechas, que es de donde salen los errores de
 * zona horaria que este proyecto ya pagó varias veces.
 */
export function mergeRanges(rangos: Rango[]): Rango[] {
  const limpios = rangos
    .map((r) => ({ starts_at: hhmm(r.starts_at), ends_at: hhmm(r.ends_at) }))
    // Un rango invertido o vacío no describe nada abierto.
    .filter((r) => r.starts_at < r.ends_at)
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : a.starts_at > b.starts_at ? 1 : 0));

  const salida: Rango[] = [];
  for (const r of limpios) {
    const ultimo = salida[salida.length - 1];
    // `<=` y no `<`: 09:00–14:00 seguido de 14:00–18:00 es estar abierto
    // de corrido, no dos turnos.
    if (ultimo && r.starts_at <= ultimo.ends_at) {
      if (r.ends_at > ultimo.ends_at) ultimo.ends_at = r.ends_at;
    } else {
      salida.push({ ...r });
    }
  }
  return salida;
}

/** True si las dos listas describen exactamente lo mismo. */
export function mismosRangos(a: Rango[], b: Rango[]): boolean {
  if (a.length !== b.length) return false;
  const clave = (r: Rango) => `${hhmm(r.starts_at)}-${hhmm(r.ends_at)}`;
  const ordA = a.map(clave).sort();
  const ordB = b.map(clave).sort();
  return ordA.every((x, i) => x === ordB[i]);
}
