import type { SupabaseClient } from '@supabase/supabase-js';

// Tope de mensajes: que nadie (un bot, un cliente insistente o alguien
// probando) dispare cientos de llamadas a Claude. Se cuenta sobre
// whatsapp_mensajes_procesados (db/057 le agrega teléfono y negocio), que
// ya recibe una fila por mensaje para el dedup.
//
// Los números, con criterio:
//   · 20 por teléfono por hora: una plática real de agendar o cotizar son
//     6–12 mensajes; 20 deja holgura para alguien que escribe en
//     ráfagas de frases cortas, y frena un bucle.
//   · 60 por teléfono por día: tres pláticas largas.
//   · 400 por negocio por día: un negocio chico recibe decenas, no
//     cientos; 400 mensajes con Haiku son centavos de dólar, así que el
//     tope protege contra abuso, no contra uso normal.
//   · 5 archivos (constancias) por teléfono por día: cada uno es una
//     llamada al modelo grande; un cliente necesita 1, 2 si la foto salió mal.
export const TOPE_TEL_HORA = 20;
export const TOPE_TEL_DIA = 60;
export const TOPE_NEGOCIO_DIA = 400;
export const TOPE_ARCHIVOS_TEL_DIA = 5;

export type Veredicto = 'ok' | 'avisar' | 'callar';

const HORA = 3_600_000;
const DIA = 24 * HORA;

async function contar(db: SupabaseClient, col: 'telefono' | 'tenant_id', valor: string, desdeMs: number): Promise<number | null> {
  const { count, error } = await db
    .from('whatsapp_mensajes_procesados')
    .select('wamid', { count: 'exact', head: true })
    .eq(col, valor)
    .gte('created_at', new Date(Date.now() - desdeMs).toISOString());
  return error ? null : (count ?? 0);
}

/**
 * Cuenta INCLUYENDO el mensaje actual (ya insertado en el dedup). Al
 * pasarse del tope se avisa UNA vez (el primer mensaje de más) y después
 * silencio: contestar cada mensaje de más sería seguir el juego.
 * Si no se puede contar (db/057 sin correr), no frena.
 */
export async function revisarTope(db: SupabaseClient, telefono: string, tenantId: string): Promise<Veredicto> {
  const [hora, dia, negocio] = await Promise.all([
    contar(db, 'telefono', telefono, HORA),
    contar(db, 'telefono', telefono, DIA),
    contar(db, 'tenant_id', tenantId, DIA),
  ]);
  const excesos = [
    hora === null ? 0 : hora - TOPE_TEL_HORA,
    dia === null ? 0 : dia - TOPE_TEL_DIA,
    negocio === null ? 0 : negocio - TOPE_NEGOCIO_DIA,
  ];
  if (excesos.every((e) => e <= 0)) return 'ok';
  return excesos.some((e) => e === 1) && excesos.every((e) => e <= 1) ? 'avisar' : 'callar';
}

/** ¿Este teléfono todavía puede mandar una constancia hoy? Cuenta filas tipo archivo. */
export async function puedeMandarArchivo(db: SupabaseClient, telefono: string): Promise<boolean> {
  const { count, error } = await db
    .from('whatsapp_mensajes_procesados')
    .select('wamid', { count: 'exact', head: true })
    .eq('telefono', telefono)
    .eq('archivo', true)
    .gte('created_at', new Date(Date.now() - DIA).toISOString());
  return error ? true : (count ?? 0) <= TOPE_ARCHIVOS_TEL_DIA;
}
