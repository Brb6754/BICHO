import type { SupabaseClient } from '@supabase/supabase-js';

// ¿Los precios ya traen el IVA? (db/059)
//
// Las columnas se leen en consulta APARTE: sin la migración, la consulta
// principal sigue funcionando y aquí se cae al valor por omisión.

const faltaColumna = (e: { code?: string } | null) => e?.code === '42703' || e?.code === 'PGRST204';

/** El ajuste del negocio. Sin db/059 vale true: los catálogos de bicho se capturan con IVA. */
export async function preciosIncluyenIva(db: SupabaseClient, tenantId: string): Promise<boolean> {
  const { data, error } = await db.from('tenants').select('precios_incluyen_iva').eq('id', tenantId).maybeSingle();
  if (error || !data) return true;
  return (data as { precios_incluyen_iva?: boolean }).precios_incluyen_iva !== false;
}

/**
 * Las cotizaciones (de esa lista) que se emitieron con precios con IVA.
 * Sin db/059 ninguna lo recuerda: se calculan como se emitieron, sumando.
 */
export async function cotizacionesConIva(db: SupabaseClient, quoteIds: string[]): Promise<Set<string>> {
  if (!quoteIds.length) return new Set();
  const { data, error } = await db.from('quotes').select('id, prices_include_tax').in('id', quoteIds);
  if (error) {
    if (!faltaColumna(error)) console.error('cotizacionesConIva', error);
    return new Set();
  }
  return new Set((data ?? []).filter((q: { prices_include_tax?: boolean }) => q.prices_include_tax).map((q: { id: string }) => q.id));
}

export { faltaColumna };
