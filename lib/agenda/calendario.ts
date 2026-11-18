import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { formatTime } from '@/lib/dates/tenantTime';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';

// La aritmética del calendario de la Agenda (Día / Semana / Mes), sin React,
// para poder probarla.
//
// Las fechas viajan como "llaves de día" YYYY-MM-DD en el calendario LOCAL
// del negocio (las de lib/dates/tenantTime). date-fns solo hace cuentas de
// calendario sobre un Date a mediodía local: así el huso del proceso nunca
// mueve un día al de junto.

export type Vista = 'dia' | 'semana' | 'mes';

const desdeLlave = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
const aLlave = (d: Date) => format(d, 'yyyy-MM-dd');
const LUNES = { weekStartsOn: 1 } as const;

/** Los 7 días (lunes a domingo) de la semana de `k`. */
export function semanaDe(k: string): string[] {
  const ini = startOfWeek(desdeLlave(k), LUNES);
  return eachDayOfInterval({ start: ini, end: addDays(ini, 6) }).map(aLlave);
}

/** La cuadrícula del mes de `k`: semanas completas de lunes a domingo. */
export function mesDe(k: string): string[][] {
  const d = desdeLlave(k);
  const dias = eachDayOfInterval({
    start: startOfWeek(startOfMonth(d), LUNES),
    end: endOfWeek(endOfMonth(d), LUNES),
  }).map(aLlave);
  const semanas: string[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  return semanas;
}

/**
 * Qué días pide el servidor para la fecha `k`: la cuadrícula entera de su
 * mes. Cubre también la semana de `k` aunque cruce de mes, porque la
 * cuadrícula siempre trae semanas completas.
 */
export function rangoDeCarga(k: string): { desde: string; hasta: string } {
  const semanas = mesDe(k);
  return { desde: semanas[0][0], hasta: semanas[semanas.length - 1][6] };
}

/** ‹ › : un día, una semana o un mes. */
export function moverFecha(k: string, vista: Vista, paso: 1 | -1): string {
  const d = desdeLlave(k);
  if (vista === 'dia') return aLlave(addDays(d, paso));
  if (vista === 'semana') return aLlave(addWeeks(d, paso));
  // Del 31 de enero a febrero cae en el último día de febrero (date-fns).
  return aLlave(addMonths(d, paso));
}

export function mismoMes(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

const valida = /^\d{4}-\d{2}-\d{2}$/;
/** El ?fecha= de la URL, o `hoy` si no es una fecha que exista. */
export function fechaDeParam(param: string | undefined, hoy: string): string {
  if (!param || !valida.test(param)) return hoy;
  return aLlave(desdeLlave(param)) === param ? param : hoy;
}

/** Minutos desde la medianoche, en la hora del negocio. */
export function minutosDelDia(iso: string, tz: string | null): number {
  const [h, m] = formatTime(iso, tz).split(':').map(Number);
  return h * 60 + m;
}

export const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

type ConHoras = { starts_at: string; ends_at: string };

/**
 * Las horas que dibuja la línea de tiempo: de 9 a 19 por omisión, y más
 * si alguna cita empieza antes o termina después. Una agenda que corta la
 * cita de las 8:00 se lee como si esa cita no existiera.
 */
export function horasVisibles(citas: ConHoras[], tz: string | null, base = { desde: 9, hasta: 19 }) {
  let { desde, hasta } = base;
  for (const c of citas) {
    const ini = minutosDelDia(c.starts_at, tz);
    let fin = minutosDelDia(c.ends_at, tz);
    if (fin <= ini) fin = 24 * 60; // termina pasada la medianoche
    desde = Math.min(desde, Math.floor(ini / 60));
    hasta = Math.max(hasta, Math.ceil(fin / 60));
  }
  return { desde, hasta };
}

export type Bloque<T> = {
  cita: T;
  /** Minutos desde el inicio visible, y duración en minutos. */
  inicio: number;
  duracion: number;
  /** Carril que ocupa y cuántos carriles tiene su grupo de encimadas. */
  carril: number;
  carriles: number;
  /** Índice del grupo de citas encimadas al que pertenece. */
  grupo: number;
};

/**
 * Coloca las citas de UNA columna (una persona en un día, o un día entero
 * en la semana). Las que se enciman se reparten en carriles lado a lado,
 * como en cualquier calendario: cada grupo de citas que se tocan comparte
 * el mismo número de carriles, el mínimo que necesita.
 */
export function posicionar<T extends ConHoras>(citas: T[], tz: string | null, desdeHora: number): Bloque<T>[] {
  const orden = [...citas].sort((a, b) => a.starts_at.localeCompare(b.starts_at) || b.ends_at.localeCompare(a.ends_at));
  const bloques: Bloque<T>[] = [];
  let grupo: Bloque<T>[] = [];
  let finGrupo = -1;
  let finCarril: number[] = [];
  let nGrupo = 0;

  const cerrar = () => {
    for (const b of grupo) b.carriles = finCarril.length;
    if (grupo.length) nGrupo++;
    grupo = [];
    finCarril = [];
  };

  for (const cita of orden) {
    const ini = minutosDelDia(cita.starts_at, tz) - desdeHora * 60;
    const dur = Math.max(1, Math.round((new Date(cita.ends_at).getTime() - new Date(cita.starts_at).getTime()) / 60000));
    if (ini >= finGrupo) cerrar();
    let carril = finCarril.findIndex((fin) => fin <= ini);
    if (carril === -1) {
      carril = finCarril.length;
      finCarril.push(0);
    }
    finCarril[carril] = ini + dur;
    finGrupo = Math.max(finGrupo, ini + dur);
    const b = {
      cita,
      inicio: ini,
      duracion: dur,
      carril,
      carriles: 1,
      grupo: nGrupo,
    };
    grupo.push(b);
    bloques.push(b);
  }
  cerrar();
  return bloques;
}

/** Un "+N" que junta las citas que no caben a lo ancho de una columna. */
export type Mas<T> = {
  inicio: number;
  carril: number;
  carriles: number;
  ocultas: T[];
};

/**
 * En una columna angosta (la Semana en la compu) más de `max` citas
 * encimadas no se leen: cada una quedaría de 30 px con el nombre partido.
 * Se enseñan las primeras `max - 1` carriles y el último lo ocupa un
 * "+N" que abre el día.
 */
export function recortarCarriles<T>(bloques: Bloque<T>[], max: number): { visibles: Bloque<T>[]; mas: Mas<T>[] } {
  const visibles: Bloque<T>[] = [];
  const porGrupo = new Map<number, Mas<T>>();
  for (const b of bloques) {
    if (b.carriles <= max) {
      visibles.push(b);
    } else if (b.carril < max - 1) {
      visibles.push({ ...b, carriles: max });
    } else {
      const m = porGrupo.get(b.grupo) ?? {
        inicio: b.inicio,
        carril: max - 1,
        carriles: max,
        ocultas: [],
      };
      m.inicio = Math.min(m.inicio, b.inicio);
      m.ocultas.push(b.cita);
      porGrupo.set(b.grupo, m);
    }
  }
  return { visibles, mas: [...porGrupo.values()] };
}

/** La media hora en la que cae un toque a `px` del tope de la línea de tiempo. */
export function horaDelToque(px: number, pxPorHora: number, desdeHora: number): string {
  const medias = Math.max(0, Math.floor(px / (pxPorHora / 2)));
  return aHora(desdeHora * 60 + medias * 30);
}

// Un color por persona, de la paleta de los módulos: cálidos primero y
// ninguno que se confunda con el rojo de "ahora" o de "cancelada".
const COLORES_PERSONA = [
  COLOR_MODULO.agenda,
  COLOR_MODULO.regresan,
  COLOR_MODULO.recordatorios,
  COLOR_MODULO.lealtad,
  COLOR_MODULO.inventario,
  COLOR_MODULO.comisiones,
  COLOR_MODULO.caja,
  COLOR_MODULO.boost,
];
export function colorPersona(i: number): string {
  return COLORES_PERSONA[((i % COLORES_PERSONA.length) + COLORES_PERSONA.length) % COLORES_PERSONA.length];
}

export const ESTADOS: Record<string, string> = {
  confirmed: 'Confirmada',
  completed: 'Vino',
  no_show: 'No vino',
  cancelled: 'Cancelada',
};

/** "Noviembre 2026", "16 – 22 de noviembre", "30 nov – 6 dic". El día lo pone quien llama. */
export function tituloPeriodo(k: string, vista: 'semana' | 'mes'): string {
  if (vista === 'mes') {
    const t = format(desdeLlave(k), "LLLL yyyy", { locale: es });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  const [ini, fin] = [semanaDe(k)[0], semanaDe(k)[6]].map(desdeLlave);
  return ini.getMonth() === fin.getMonth()
    ? `${format(ini, 'd')} – ${format(fin, "d 'de' LLLL", { locale: es })}`
    : `${format(ini, 'd LLL', { locale: es })} – ${format(fin, 'd LLL', { locale: es })}`;
}

/** "lun", "mar"… y el número del día, para encabezados de columna. */
export function diaCorto(k: string): { semana: string; numero: string } {
  const d = desdeLlave(k);
  return {
    semana: format(d, 'EEE', { locale: es }).replace('.', ''),
    numero: format(d, 'd'),
  };
}
