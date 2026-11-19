import { formatTime } from '@/lib/dates/tenantTime';

// Lo puro de la sección "Anticipos" del panel: leer el formulario y decir
// cómo va el anticipo de una cita. El núcleo (montos, apartar, liberar)
// vive en lib/anticipos/; esto solo traduce entre la pantalla y ese núcleo.

export const MIGRACION_ANTICIPOS = 'Falta correr la migración db/061_anticipos.sql';
export const MIGRACION_INSTRUCCIONES = 'Se guardó todo menos «Cómo te pagan»: falta correr db/062_anticipo_instrucciones.sql';

const MAX_MXN = 100000;

export type FormAnticipo = {
  activado: boolean;
  montoGeneralMxn: number | null;
  minutosApartado: number;
  plazoReagendarHoras: number;
  politica: string | null;
  /** Cómo pagar sin link (db/062). */
  instrucciones: string | null;
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

  const instrucciones = String(fd.get('instrucciones') ?? '').trim();
  if (instrucciones.length > 500) return { ok: false, error: '«Cómo te pagan» es muy largo: máximo 500 letras.' };

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

  return { ok: true, valor: { activado, montoGeneralMxn, minutosApartado, plazoReagendarHoras, politica: politica || null, instrucciones: instrucciones || null, porServicio } };
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
  filas: { id: string; deposit_status: string | null; hold_expires_at: string | null; deposit_mxn?: number | null }[] | null | undefined
): (T & { deposit_status?: string | null; hold_expires_at?: string | null; deposit_mxn?: number | null })[] {
  if (!filas?.length) return citas;
  const porId = new Map(filas.map((f) => [f.id, f]));
  return citas.map((c) => {
    const f = porId.get(c.id);
    return f ? { ...c, deposit_status: f.deposit_status, hold_expires_at: f.hold_expires_at, deposit_mxn: f.deposit_mxn ?? null } : c;
  });
}

/** Un apartado esperando pago, como lo pinta "Apartados por cobrar". */
export type Apartado = {
  id: string;
  nombre: string;
  servicio: string;
  startsAt: string;
  montoMxn: number;
  venceEn: string | null;
};

export type FilaApartado = {
  id: string;
  starts_at: string;
  deposit_mxn?: number | null;
  hold_expires_at?: string | null;
  customers?: { name?: string | null } | null;
  service_types?: { name?: string | null } | null;
};

export const apartadoDe = (f: FilaApartado): Apartado => ({
  id: f.id,
  nombre: f.customers?.name ?? 'Clienta',
  servicio: f.service_types?.name ?? 'Cita',
  startsAt: f.starts_at,
  montoMxn: f.deposit_mxn ?? 0,
  venceEn: f.hold_expires_at ?? null,
});

/** "Se libera a las 16:30 (en 12 min)". Vencido pero sin barrer: todavía se puede marcar pagado. */
export function textoVence(venceEn: string | null, ahora: Date, timezone: string | null): string {
  if (!venceEn) return 'Esperando el anticipo';
  const min = Math.round((new Date(venceEn).getTime() - ahora.getTime()) / 60_000);
  if (min <= 0) return 'Ya se venció el tiempo: se libera en cualquier momento';
  const falta = min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
  return `Se libera a las ${formatTime(venceEn, timezone)} (en ${falta})`;
}

/**
 * Demo: marca las 2 siguientes citas confirmadas como apartadas sin pagar
 * y la tercera como pagada, para enseñar los anticipos sin escribir nada.
 */
export function conAnticiposDemo<T extends { id: string; status: string; starts_at: string }>(
  citas: T[],
  ahora: Date
): (T & { deposit_status?: string | null; hold_expires_at?: string | null; deposit_mxn?: number | null })[] {
  const proximas = citas
    .filter((c) => c.status === 'confirmed' && new Date(c.starts_at) > ahora)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 3);
  const vence = (min: number) => new Date(ahora.getTime() + min * 60_000).toISOString();
  return conAnticipo(
    citas,
    proximas.map((c, i) =>
      i < 2
        ? { id: c.id, deposit_status: 'pending', hold_expires_at: vence(i ? 95 : 12), deposit_mxn: i ? 200 : 100 }
        : { id: c.id, deposit_status: 'paid', hold_expires_at: null, deposit_mxn: 100 }
    )
  );
}
