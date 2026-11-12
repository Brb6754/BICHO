'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { productosDe } from '@/lib/products';
import { dayKey } from '@/lib/dates/tenantTime';
import { METODOS, pesosACentavos, type Metodo } from '@/lib/caja/resumen';
import { TIPOS_MOVIMIENTO, mensajeDeError, parseCantidad, type TipoMovimiento } from '@/lib/inventario/logica';

// Escritura del Inventario. Mismo patrón que caja/actions.ts:
// `requireTenantStaff` (sesión + membresía en ESTE negocio), módulo
// prendido, luego service_role con `tenant_id` en cada filtro. El stock
// solo lo cambia la función SQL `inventario_mover` (db/049), nunca un
// update desde aquí.

type Resultado = { ok: true } | { ok: false; error: string };

export type ProductoInput = {
  id?: string;
  nombre: string;
  unidad: string;
  stockInicial?: string;
  stockMinimo: string;
  costo: string;
  precio: string;
};

export type MovimientoInput = {
  productoId: string;
  tipo: TipoMovimiento;
  cantidad: string;
  dia: string;
  nota: string;
  /** Solo venta con Caja prendida. */
  enCaja?: { monto: string; metodo: Metodo } | null;
};

async function acceso(slug: string) {
  const staff = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.inventario) throw new Error('El Inventario no está activo en este negocio.');
  return { ...staff, cajaActiva: productos.caja };
}

function listo(slug: string): Resultado {
  revalidatePath(`/t/${slug}/dashboard/inventario`);
  revalidatePath(`/t/${slug}/dashboard`);
  return { ok: true };
}

function fallo(e: unknown): Resultado {
  return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar.' };
}

/** Pesos opcionales: vacío → null; texto inválido → undefined (error). */
function pesosOpcionales(texto: string): number | null | undefined {
  const limpio = (texto ?? '').trim();
  if (!limpio) return null;
  if (limpio.replace(/[\s$,]/g, '') === '0') return 0;
  return pesosACentavos(limpio) ?? undefined;
}

export async function guardarProducto(slug: string, input: ProductoInput): Promise<Resultado> {
  try {
    const { tenantId, timezone } = await acceso(slug);

    const nombre = (input.nombre ?? '').trim().slice(0, 80);
    if (!nombre) return { ok: false, error: 'Escribe el nombre del producto.' };
    const unidad = (input.unidad ?? '').trim().slice(0, 20) || 'pieza';
    const stockMinimo = parseCantidad(input.stockMinimo || '0', true);
    if (stockMinimo === null) return { ok: false, error: 'El mínimo tiene que ser un número, por ejemplo 2.' };
    const costo = pesosOpcionales(input.costo);
    const precio = pesosOpcionales(input.precio);
    if (costo === undefined || precio === undefined) return { ok: false, error: 'Escribe los montos como 150 o 1,250.50.' };

    const fila = {
      nombre,
      unidad,
      stock_minimo: stockMinimo,
      costo_cents: costo,
      precio_cents: precio,
      updated_at: new Date().toISOString(),
    };
    const db = createAdminClient();

    if (input.id) {
      const { data, error } = await db
        .from('inventario_productos')
        .update(fila)
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
        .select('id');
      if (error) throw new Error(`No se pudo guardar: ${error.message}`);
      if (!data?.length) return { ok: false, error: 'Ese producto ya no existe.' };
      return listo(slug);
    }

    const stockInicial = parseCantidad(input.stockInicial || '0', true);
    if (stockInicial === null) return { ok: false, error: 'El stock tiene que ser un número, por ejemplo 5.' };

    const { data: nuevo, error } = await db
      .from('inventario_productos')
      .insert({ ...fila, tenant_id: tenantId })
      .select('id')
      .single();
    if (error) throw new Error(`No se pudo guardar: ${error.message}`);

    // El stock inicial entra como un ajuste: así queda en el historial.
    if (stockInicial > 0) {
      const { error: errMov } = await db.rpc('inventario_mover', {
        p_tenant: tenantId,
        p_producto: nuevo.id,
        p_tipo: 'ajuste',
        p_cantidad: stockInicial,
        p_dia: dayKey(new Date(), timezone),
        p_nota: 'Stock inicial',
      });
      if (errMov) throw new Error(mensajeDeError(errMov.message));
    }
    return listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

export async function borrarProducto(slug: string, id: string): Promise<Resultado> {
  try {
    const { tenantId } = await acceso(slug);
    // Los movimientos se van en cascada (db/049); lo anotado en Caja se queda.
    const { error } = await createAdminClient().from('inventario_productos').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) throw new Error(`No se pudo borrar: ${error.message}`);
    return listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

export async function registrarMovimiento(slug: string, input: MovimientoInput): Promise<Resultado> {
  try {
    const { tenantId, timezone, cajaActiva } = await acceso(slug);

    if (!TIPOS_MOVIMIENTO.includes(input.tipo)) return { ok: false, error: 'Tipo inválido.' };
    const cantidad = parseCantidad(input.cantidad, input.tipo === 'ajuste');
    if (cantidad === null) return { ok: false, error: 'Escribe una cantidad válida, por ejemplo 2 o 1.5.' };
    const hoy = dayKey(new Date(), timezone);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dia) || Number.isNaN(Date.parse(input.dia))) {
      return { ok: false, error: 'Elige una fecha válida.' };
    }
    if (input.dia > hoy) return { ok: false, error: 'No se pueden anotar movimientos de días que no han pasado.' };

    let cajaCents: number | null = null;
    let cajaMetodo: Metodo = 'efectivo';
    if (input.tipo === 'venta' && input.enCaja) {
      if (!cajaActiva) return { ok: false, error: 'La Caja no está activa en este negocio.' };
      cajaCents = pesosACentavos(input.enCaja.monto ?? '');
      if (cajaCents === null) return { ok: false, error: 'Escribe cuánto cobraste, por ejemplo 150.' };
      if (!METODOS.includes(input.enCaja.metodo)) return { ok: false, error: 'Elige cómo te pagaron.' };
      cajaMetodo = input.enCaja.metodo;
    }

    const db = createAdminClient();
    const { data: prod } = await db
      .from('inventario_productos')
      .select('unidad')
      .eq('id', input.productoId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!prod) return { ok: false, error: 'Ese producto ya no existe.' };

    const { error } = await db.rpc('inventario_mover', {
      p_tenant: tenantId,
      p_producto: input.productoId,
      p_tipo: input.tipo,
      p_cantidad: cantidad,
      p_dia: input.dia,
      p_nota: (input.nota ?? '').trim().slice(0, 200),
      p_caja_cents: cajaCents,
      p_caja_metodo: cajaMetodo,
    });
    if (error) return { ok: false, error: mensajeDeError(error.message, prod.unidad) };

    if (cajaCents !== null) revalidatePath(`/t/${slug}/dashboard/caja`);
    return listo(slug);
  } catch (e) {
    return fallo(e);
  }
}
