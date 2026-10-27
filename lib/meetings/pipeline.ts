import type { Resultado } from './kinds';

// El embudo de reuniones.
//
// La pregunta que contesta esta pantalla no es "¿qué reuniones hay?"
// sino "¿cuál se me está enfriando?". Por eso lo primero que calcula
// no es un total: es la lista de reuniones que YA PASARON y que nadie
// capturó. Mientras esa lista no esté vacía, el embudo de abajo está
// mintiendo — no porque el cálculo falle, sino porque le faltan datos
// que solo una persona puede poner.

export type MeetingEntry = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  tipo: string;
  modality: string | null;
  contactName: string;
  contactId: string | null;
  company: string | null;
  phone: string | null;
  address: string | null;
  outcome: Resultado | null;
  quoteId: string | null;
};

export type Embudo = {
  /** Ya pasaron y nadie dijo en qué quedaron. Lo primero que se enseña. */
  sinCapturar: MeetingEntry[];
  /** Todavía no pasan. Ordenadas de la más próxima a la más lejana. */
  proximas: MeetingEntry[];
  /** Capturadas, agrupadas por resultado. */
  porResultado: Record<Resultado, MeetingEntry[]>;
  /** Reuniones que terminaron en algo, sobre las que ya se capturaron. */
  tasaCierre: number | null;
};

const VACIO: Record<Resultado, MeetingEntry[]> = {
  interesado: [],
  cotizado: [],
  ganado: [],
  perdido: [],
};

export function buildEmbudo(entries: MeetingEntry[], now: Date): Embudo {
  const ahora = now.getTime();

  const sinCapturar: MeetingEntry[] = [];
  const proximas: MeetingEntry[] = [];
  const porResultado: Record<Resultado, MeetingEntry[]> = {
    interesado: [],
    cotizado: [],
    ganado: [],
    perdido: [],
  };

  for (const m of entries) {
    // Una reunión cancelada no entra a ningún lado: nunca ocurrió, así
    // que ni pide resultado ni cuenta para la tasa de cierre. Contarla
    // como perdida culparía al vendedor de una junta que el prospecto
    // movió.
    if (m.status === 'cancelled') continue;

    if (m.outcome) {
      porResultado[m.outcome].push(m);
      continue;
    }

    // El corte es el FIN de la reunión, no el inicio: una junta de dos
    // horas que empezó hace veinte minutos sigue ocurriendo, y pedir
    // su resultado a media junta es pedirlo antes de tiempo.
    if (new Date(m.endsAt).getTime() <= ahora) sinCapturar.push(m);
    else proximas.push(m);
  }

  const asc = (a: MeetingEntry, b: MeetingEntry) =>
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  const desc = (a: MeetingEntry, b: MeetingEntry) => -asc(a, b);

  proximas.sort(asc);
  // Las que ya pasaron, de la más reciente primero: lo que ocurrió
  // ayer se acuerda, lo de hace tres semanas ya se perdió.
  sinCapturar.sort(desc);
  for (const k of Object.keys(porResultado) as Resultado[]) porResultado[k].sort(desc);

  // Solo sobre reuniones con desenlace real. "Interesado" y "cotizado"
  // todavía están vivas: meterlas en el denominador haría que la tasa
  // de cierre BAJE cada vez que el vendedor agenda bien, que es
  // exactamente al revés.
  const ganadas = porResultado.ganado.length;
  const cerradas = ganadas + porResultado.perdido.length;

  return {
    sinCapturar,
    proximas,
    porResultado,
    tasaCierre: cerradas > 0 ? ganadas / cerradas : null,
  };
}

export { VACIO as EMBUDO_VACIO };
