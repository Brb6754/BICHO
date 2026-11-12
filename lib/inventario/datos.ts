import { createAdminClient } from '@/lib/supabase/admin';
import { dayKey } from '@/lib/dates/tenantTime';
import type { MovimientoInventario, Producto } from '@/lib/inventario/logica';

// Lo que la pantalla de Inventario necesita de la base. Lee con
// service_role filtrando por tenant_id, igual que lib/caja/datos.ts;
// quien llama ya pasó por `requireTenantStaff`.

export type DatosInventario =
  | { hoy: string; productos: Producto[]; movimientos: MovimientoInventario[] }
  | { faltaMigracion: true };

type FilaProducto = {
  id: string;
  nombre: string;
  unidad: string;
  stock: number | string;
  stock_minimo: number | string;
  costo_cents: number | null;
  precio_cents: number | null;
};

export function aProducto(f: FilaProducto): Producto {
  return {
    id: f.id,
    nombre: f.nombre,
    unidad: f.unidad,
    // numeric llega como número desde PostgREST; Number() por si algún día llega como texto.
    stock: Number(f.stock),
    stockMinimo: Number(f.stock_minimo),
    costoCents: f.costo_cents,
    precioCents: f.precio_cents,
  };
}

export async function cargarInventario(tenantId: string, timezone: string | null, now = new Date()): Promise<DatosInventario> {
  const db = createAdminClient();
  const [prodRes, movRes] = await Promise.all([
    db
      .from('inventario_productos')
      .select('id, nombre, unidad, stock, stock_minimo, costo_cents, precio_cents')
      .eq('tenant_id', tenantId)
      .order('nombre'),
    db
      .from('inventario_movimientos')
      .select('id, producto_id, tipo, cantidad, stock_despues, dia, nota')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // Sin db/049 las tablas no existen: la pantalla lo dice en vez de caerse.
  if (prodRes.error || movRes.error) return { faltaMigracion: true };

  return {
    hoy: dayKey(now, timezone),
    productos: (prodRes.data ?? []).map(aProducto),
    movimientos: (movRes.data ?? []).map((m) => ({
      id: m.id,
      productoId: m.producto_id,
      tipo: m.tipo,
      cantidad: Number(m.cantidad),
      stockDespues: Number(m.stock_despues),
      dia: m.dia,
      nota: m.nota ?? '',
    })),
  };
}
