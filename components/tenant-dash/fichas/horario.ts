// Cuentas chicas del horario para las pantallas de la agenda. Sin React.

export type Franja = { day_of_week: number; starts_at: string; ends_at: string };

// La semana de un negocio empieza en lunes; la base guarda 0=domingo (Postgres).
export const SEMANA = [
  { dow: 1, corto: 'Lun', largo: 'Lunes' },
  { dow: 2, corto: 'Mar', largo: 'Martes' },
  { dow: 3, corto: 'Mié', largo: 'Miércoles' },
  { dow: 4, corto: 'Jue', largo: 'Jueves' },
  { dow: 5, corto: 'Vie', largo: 'Viernes' },
  { dow: 6, corto: 'Sáb', largo: 'Sábado' },
  { dow: 0, corto: 'Dom', largo: 'Domingo' },
];

/** "09:00:00" → "9:00". */
export function hora(valor: string): string {
  const [h, m] = valor.split(':');
  return `${Number(h)}:${m}`;
}

/** "13:30" → 13.5 */
export function horas(valor: string): number {
  const [h, m] = valor.split(':').map(Number);
  return h + (m || 0) / 60;
}

/**
 * La semana de alguien en una línea: "Lun a Vie 9:00–18:00 · Sáb 10:00–14:00".
 * Los días seguidos con las mismas horas se juntan; sin horario, "Sin horario".
 */
export function resumirHorario(franjas: Franja[]): string {
  const porDia = SEMANA.map((d) => {
    const suyas = franjas
      .filter((f) => f.day_of_week === d.dow)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((f) => `${hora(f.starts_at)}–${hora(f.ends_at)}`)
      .join(' y ');
    return { corto: d.corto, horas: suyas };
  });

  const tramos: { desde: string; hasta: string; horas: string }[] = [];
  for (const d of porDia) {
    const ultimo = tramos[tramos.length - 1];
    if (d.horas && ultimo && ultimo.horas === d.horas && ultimo.hasta === porDia[porDia.indexOf(d) - 1]?.corto) {
      ultimo.hasta = d.corto;
    } else if (d.horas) {
      tramos.push({ desde: d.corto, hasta: d.corto, horas: d.horas });
    }
  }
  if (!tramos.length) return 'Sin horario';
  return tramos
    .map((t) => {
      const dias = t.desde === t.hasta ? t.desde : `${t.desde} a ${t.hasta}`;
      return `${dias} ${t.horas}`;
    })
    .join(' · ');
}

/** De qué hora a qué hora pintar la regla de la semana: lo que cubren las franjas, en horas enteras. */
export function reglaDe(franjas: { starts_at: string; ends_at: string }[]): { desde: number; hasta: number } {
  if (!franjas.length) return { desde: 9, hasta: 19 };
  const desde = Math.floor(Math.min(...franjas.map((f) => horas(f.starts_at))));
  const hasta = Math.ceil(Math.max(...franjas.map((f) => horas(f.ends_at))));
  return { desde: Math.max(0, desde), hasta: Math.min(24, Math.max(hasta, desde + 1)) };
}
