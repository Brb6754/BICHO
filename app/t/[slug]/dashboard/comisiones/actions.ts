'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { productosDe } from '@/lib/products';
import { dayKey } from '@/lib/dates/tenantTime';
import { bpATexto, pctABp, periodoDe } from '@/lib/comisiones/calculo';
import { cargarComisiones } from '@/lib/comisiones/datos';

// Escritura de Comisiones. Mismo patrón que caja/actions.ts: una Server
// Action es un endpoint POST real, así que primero `requireTenantStaff`
// (sesión + membresía en ESTE negocio), luego service_role con
// `tenant_id` en cada filtro, y el módulo tiene que estar prendido.

type Resultado = { ok: true } | { ok: false; error: string };

async function acceso(slug: string) {
  const staff = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.comisiones) throw new Error('Comisiones no está activo en este negocio.');
  return { ...staff, cajaActiva: productos.caja };
}

function fallo(e: unknown): Resultado {
  return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar.' };
}

async function recursoDelNegocio(tenantId: string, resourceId: string) {
  const { data, error } = await createAdminClient()
    .from('resources')
    .select('id, name')
    .eq('id', resourceId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer la persona: ${error.message}`);
  return data;
}

export async function guardarPorcentaje(slug: string, resourceId: string, pct: string): Promise<Resultado> {
  try {
    const { tenantId } = await acceso(slug);
    const pctBp = pctABp(pct ?? '');
    if (pctBp === null) return { ok: false, error: 'Escribe un porcentaje entre 0 y 100, por ejemplo 30 o 12.5.' };
    // Sin esto un upsert por resource_id podría reescribir la fila de otro negocio.
    if (!(await recursoDelNegocio(tenantId, resourceId))) return { ok: false, error: 'Esa persona ya no existe.' };

    const { error } = await createAdminClient()
      .from('comision_tasas')
      .upsert(
        { resource_id: resourceId, tenant_id: tenantId, pct_bp: pctBp, updated_at: new Date().toISOString() },
        { onConflict: 'resource_id' }
      );
    if (error) throw new Error(`No se pudo guardar: ${error.message}`);
    revalidatePath(`/t/${slug}/dashboard/comisiones`);
    return { ok: true };
  } catch (e) {
    return fallo(e);
  }
}

export async function marcarPagado(
  slug: string,
  input: { resourceId: string; desde: string; hasta: string; registrarEnCaja: boolean }
): Promise<Resultado> {
  try {
    const { tenantId, timezone, userId, cajaActiva } = await acceso(slug);
    // periodoDe valida y ordena las fechas; si no coinciden, venían mal.
    const rango = periodoDe('rango', '', input.desde, input.hasta);
    if (rango.desde !== input.desde || rango.hasta !== input.hasta) return { ok: false, error: 'Periodo inválido.' };

    // Los montos se recalculan aquí, nunca se toman del navegador.
    const datos = await cargarComisiones(tenantId, timezone, rango);
    if ('faltaMigracion' in datos) return { ok: false, error: 'Falta correr db/050_comisiones.sql en Supabase.' };
    const fila = datos.filas.find((f) => f.resourceId === input.resourceId);
    if (!fila) return { ok: false, error: 'Esa persona ya no existe.' };
    if (fila.comisionCents <= 0) return { ok: false, error: 'No hay comisión que pagar en este periodo.' };

    const db = createAdminClient();
    const { data: pago, error } = await db
      .from('comision_pagos')
      .insert({
        tenant_id: tenantId,
        resource_id: fila.resourceId,
        desde: rango.desde,
        hasta: rango.hasta,
        citas: fila.citas,
        vendido_cents: fila.vendidoCents,
        pct_bp: fila.pctBp,
        comision_cents: fila.comisionCents,
        created_by: userId,
      })
      .select('id')
      .single();
    if (error) {
      // 23505 = índice único (persona, desde, hasta): ya se pagó.
      if (error.code === '23505') return { ok: false, error: `Ya está pagado el periodo de ${fila.nombre}.` };
      throw new Error(`No se pudo guardar el pago: ${error.message}`);
    }

    if (input.registrarEnCaja && cajaActiva) {
      const { data: mov, error: errCaja } = await db
        .from('caja_movimientos')
        .insert({
          tenant_id: tenantId,
          tipo: 'gasto',
          categoria: 'sueldos',
          concepto: `Comisión ${fila.nombre} ${rango.desde} a ${rango.hasta} (${bpATexto(fila.pctBp)}%)`.slice(0, 120),
          monto_cents: fila.comisionCents,
          metodo: 'efectivo',
          dia: dayKey(new Date(), timezone),
        })
        .select('id')
        .single();
      if (errCaja) {
        // Sin el gasto, el pago tampoco: que la dueña lo reintente entero.
        await db.from('comision_pagos').delete().eq('id', pago.id).eq('tenant_id', tenantId);
        throw new Error(`No se pudo registrar en Caja: ${errCaja.message}`);
      }
      const { error: errLiga } = await db
        .from('comision_pagos')
        .update({ caja_movimiento_id: mov.id })
        .eq('id', pago.id)
        .eq('tenant_id', tenantId);
      if (errLiga) throw new Error(`El pago y el gasto se guardaron, pero no se ligaron: ${errLiga.message}`);
      revalidatePath(`/t/${slug}/dashboard/caja`);
    }

    revalidatePath(`/t/${slug}/dashboard/comisiones`);
    return { ok: true };
  } catch (e) {
    return fallo(e);
  }
}
