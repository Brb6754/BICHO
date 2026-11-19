import type { SupabaseClient } from '@supabase/supabase-js';

// Configuración de anticipos de un negocio (columnas de db/061 en
// `tenants`). Se lee con `select('*')`: si la migración no está corrida
// las columnas simplemente no vienen y todo cae en "anticipo apagado",
// que es el comportamiento de antes — nunca una reserva rota.

export type ConfigAnticipo = {
  activado: boolean;
  /** Monto general en pesos; null = solo cobran los servicios con monto propio. */
  montoGeneralMxn: number | null;
  minutosApartado: number;
  plazoReagendarHoras: number;
  politica: string | null;
  /** Cómo pagar sin link (db/062): "Transferencia a la CLABE …". */
  instrucciones: string | null;
  timezone: string | null;
};

export const CONFIG_APAGADA: ConfigAnticipo = {
  activado: false,
  montoGeneralMxn: null,
  minutosApartado: 15,
  plazoReagendarHoras: 24,
  politica: null,
  instrucciones: null,
  timezone: null,
};

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const entero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null);

export function configDesdeFila(fila: Record<string, unknown> | null | undefined): ConfigAnticipo {
  if (!fila) return CONFIG_APAGADA;
  return {
    activado: fila.anticipo_enabled === true,
    montoGeneralMxn: entero(fila.anticipo_mxn),
    minutosApartado: entero(fila.anticipo_apartado_min) ?? CONFIG_APAGADA.minutosApartado,
    plazoReagendarHoras: entero(fila.anticipo_reagendar_horas) ?? CONFIG_APAGADA.plazoReagendarHoras,
    politica: texto(fila.anticipo_politica),
    instrucciones: texto(fila.anticipo_instrucciones),
    timezone: typeof fila.timezone === 'string' ? fila.timezone : null,
  };
}

export async function leerConfigAnticipo(supabase: SupabaseClient, tenantId: string): Promise<ConfigAnticipo> {
  const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle();
  if (error) return CONFIG_APAGADA;
  return configDesdeFila(data as Record<string, unknown> | null);
}

/**
 * Pesos de anticipo que pide `servicio`. 0 = no pide.
 * Apagado → 0. `deposit_mxn` del servicio manda si no es null (0 = sin
 * anticipo aunque haya monto general). Si es null, el monto general.
 */
export function montoAnticipo(config: ConfigAnticipo, servicio: { deposit_mxn?: number | null } | null | undefined): number {
  if (!config.activado) return 0;
  const propio = entero(servicio?.deposit_mxn);
  return Math.max(0, propio ?? config.montoGeneralMxn ?? 0);
}

export function mpConnectHabilitado(): boolean {
  return process.env.MP_CONNECT_ENABLED === '1';
}

/** Error de columna/tabla inexistente: db/061 todavía no corre aquí. */
export function faltaMigracion(error: { code?: string } | null | undefined): boolean {
  return ['42703', 'PGRST204', '42P01', 'PGRST205'].includes(error?.code ?? '');
}
