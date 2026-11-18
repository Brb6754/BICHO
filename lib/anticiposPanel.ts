import { formatTime } from '@/lib/dates/tenantTime';

// Lo puro de la sección "Anticipos" del panel: leer el formulario y decir
// cómo va el anticipo de una cita. El núcleo (montos, apartar, liberar)
// vive en lib/anticipos/; esto solo traduce entre la pantalla y ese núcleo.

export const MIGRACION_ANTICIPOS = 'Falta correr la migración db/061_anticipos.sql';

const MAX_MXN = 100000;

export type FormAnticipo = {
  activado: boolean;
  montoGeneralMxn: number | null;
  minutosApartado: number;
  plazoReagendarHoras: number;
  politica: string | null;
  /** depositMxn null = usa el general; 0 = ese servicio no pide anticipo. */
  porServicio: { id: string; depositMxn: number | null }[];
};

/**
 * Pesos enteros desde lo que la gente teclea ("150", "$1,500", " 200 ").
 * '' → null. undefined si no es un monto válido.
 */
export function leerPesos(raw: unknown): number | null | undefined {
  const s = String(raw ?? '').replace(/[\s$,]/g, '');
  if (!s) return null;
  if (!/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return n <= MAX_MXN ? n : undefined;
}

function entero(raw: unknown, min: number, max: number): number | undefined {
  const s = String(raw ?? '').trim();
  if (!/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return n >= min && n <= max ? n : undefined;
}

export function leerFormAnticipo(fd: FormData): { ok: true; valor: FormAnticipo } | { ok: false; error: string } {
  const activado = fd.get('activado') === '1';

  const montoGeneralMxn = leerPesos(fd.get('monto_general'));
  if (montoGeneralMxn === undefined) return { ok: false, error: 'El monto general va en pesos, sin centavos. Por ejemplo: 150.' };

  const minutosApartado = entero(fd.get('apartado_min'), 5, 120);
  if (minutosApartado === undefined) return { ok: false, error: 'El tiempo para pagar va de 5 a 120 minutos.' };

  const plazoReagendarHoras = entero(fd.get('reagendar_horas'), 0, 720);
  if (plazoReagendarHoras === undefined) return { ok: false, error: 'Las horas para reagendar van de 0 a 720 (30 días).' };

  const politica = String(fd.get('politica') ?? '').trim();
  if (politica.length > 500) return { ok: false, error: 'La política es muy larga: máximo 500 letras.' };

  const porServicio: FormAnticipo['porServicio'] = [];
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith('servicio:')) continue;
    const depositMxn = leerPesos(v);
    if (depositMxn === undefined) return { ok: false, error: 'El anticipo de cada servicio va en pesos, sin centavos (o vacío).' };
    porServicio.push({ id: k.slice('servicio:'.length), depositMxn });
  }

  // Prendido sin ningún monto, nadie pagaría nada: mejor decirlo que guardar un interruptor que no hace nada.
  if (activado && !montoGeneralMxn && !porServicio.some((s) => (s.depositMxn ?? 0) > 0)) {
    return { ok: false, error: 'Para pedir anticipo, pon un monto general o el de al menos un servicio.' };
  }

  return { ok: true, valor: { activado, montoGeneralMxn, minutosApartado, plazoReagendarHoras, politica: politica || null, porServicio } };
}

/** Cómo va el anticipo de una cita, o null si no hay nada que decir. */
export function etiquetaAnticipo(
  cita: { status: string; deposit_status?: string | null; hold_expires_at?: string | null },
  timezone: string | null
): { texto: string; tono: 'pendiente' | 'pagado' } | null {
  if (cita.status !== 'confirmed') return null;
  if (cita.deposit_status === 'paid') return { texto: 'Anticipo pagado', tono: 'pagado' };
  if (cita.deposit_status === 'pending') {
    return { texto: cita.hold_expires_at ? `Falta anticipo · vence ${formatTime(cita.hold_expires_at, timezone)}` : 'Falta anticipo', tono: 'pendiente' };
  }
  return null;
}

/**
 * Pega deposit_status/hold_expires_at (de una consulta aparte, que falla
 * sin db/061) a las citas de la agenda. Sin filas, las citas no cambian.
 */
export function conAnticipo<T extends { id: string }>(
  citas: T[],
  filas: { id: string; deposit_status: string | null; hold_expires_at: string | null }[] | null | undefined
): (T & { deposit_status?: string | null; hold_expires_at?: string | null })[] {
  if (!filas?.length) return citas;
  const porId = new Map(filas.map((f) => [f.id, f]));
  return citas.map((c) => {
    const f = porId.get(c.id);
    return f ? { ...c, deposit_status: f.deposit_status, hold_expires_at: f.hold_expires_at } : c;
  });
}
