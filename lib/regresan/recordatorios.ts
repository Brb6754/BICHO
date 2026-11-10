// Qué citas reciben el recordatorio automático.
//
// El cron corre UNA vez al día (vercel.json): el plan Hobby de Vercel no
// permite crons más frecuentes, y uno por hora haría fallar el deploy.
// Con una corrida diaria, "24 h antes" se aproxima con una ventana de 36 h
// hacia adelante: a las 9:00 sale el recordatorio de todo lo de hoy
// después de las 9:00 y de mañana hasta las 21:00. Si algún día el plan
// es Pro, basta cambiar el schedule a cada hora y VENTANA_HORAS a 25.
export const VENTANA_HORAS = 36;

// Una cita agendada hace un rato ya recibió su confirmación; un
// "recordatorio" diez minutos después es ruido (y un WhatsApp cobrado).
export const MINIMO_DESDE_RESERVA_HORAS = 3;

const HORA_MS = 60 * 60 * 1000;

export function ventanaRecordatorio(now: Date): { desde: string; hasta: string } {
  return {
    desde: now.toISOString(),
    hasta: new Date(now.getTime() + VENTANA_HORAS * HORA_MS).toISOString(),
  };
}

export function tocaRecordatorio(
  cita: { starts_at: string; created_at?: string | null; status: string; reminder_sent_at?: string | null },
  now: Date
): boolean {
  if (cita.status !== 'confirmed' || cita.reminder_sent_at) return false;
  const inicio = new Date(cita.starts_at).getTime();
  if (inicio <= now.getTime() || inicio > now.getTime() + VENTANA_HORAS * HORA_MS) return false;
  if (cita.created_at && now.getTime() - new Date(cita.created_at).getTime() < MINIMO_DESDE_RESERVA_HORAS * HORA_MS) {
    return false;
  }
  return true;
}
