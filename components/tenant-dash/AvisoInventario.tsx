import { createClient } from '@/lib/supabase/server';
import { aProducto } from '@/lib/inventario/datos';
import { seAcaba } from '@/lib/inventario/logica';

// Para el aviso del Resumen: los nombres de los productos que se están
// acabando. Lee con el JWT de la dueña (RLS de db/049). Cualquier error
// —sin la migración, por ejemplo— devuelve una lista vacía: el Resumen
// nunca se cae por esto.
export async function productosPorAcabarse(tenantId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inventario_productos')
    .select('id, nombre, unidad, stock, stock_minimo, costo_cents, precio_cents')
    .eq('tenant_id', tenantId);
  if (error || !data) return [];
  return data.map(aProducto).filter(seAcaba).map((p) => p.nombre);
}
