'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { productosDe } from '@/lib/products';
import { dayKey } from '@/lib/dates/tenantTime';
import { CATEGORIAS_GASTO, METODOS, pesosACentavos, type CategoriaGasto, type Metodo } from '@/lib/caja/resumen';

// Escritura de la Caja.
//
// Mismo patrón que cotizaciones y clientes: una Server Action es un
// endpoint POST real, así que primero `requireTenantStaff` (sesión +
// membresía en ESTE negocio), luego service_role con `tenant_id` en
// cada filtro. Y el módulo tiene que estar prendido: es un extra que se
// cobra.

type Resultado = { ok: true } | { ok: false; error: string };

export type MovimientoInput = {
  id?: string;
  tipo: 'venta' | 'gasto';
  concepto: string;
  monto: string;
  metodo: Metodo;
  categoria?: CategoriaGasto | null;
  dia: string;
};

async function acceso(slug: string) {
  const staff = await requireTenantStaff(slug);
  if (!(await productosDe(slug)).caja) throw new Error('La Caja no está activa en este negocio.');
  return staff;
}

function listo(slug: string): Resultado {
  revalidatePath(`/t/${slug}/dashboard/caja`);
  return { ok: true };
}

function fallo(e: unknown): Resultado {
  return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar.' };
}

function validarDia(dia: string, hoy: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(Date.parse(dia))) return 'Elige una fecha válida.';
  if (dia > hoy) return 'No se pueden anotar movimientos de días que no han pasado.';
  return null;
}

export async function guardarMovimiento(slug: string, input: MovimientoInput): Promise<Resultado> {
  try {
    const { tenantId, timezone } = await acceso(slug);

    if (input.tipo !== 'venta' && input.tipo !== 'gasto') return { ok: false, error: 'Tipo inválido.' };
    const montoCents = pesosACentavos(input.monto ?? '');
    if (montoCents === null) return { ok: false, error: 'Escribe un monto válido, por ejemplo 250 o 1,250.50.' };
    if (!METODOS.includes(input.metodo)) return { ok: false, error: 'Elige cómo se pagó.' };
    const categoria = input.tipo === 'gasto' ? input.categoria : null;
    if (input.tipo === 'gasto' && (!categoria || !CATEGORIAS_GASTO.includes(categoria))) {
      return { ok: false, error: 'Elige en qué se gastó.' };
    }
    const concepto = (input.concepto ?? '').trim().slice(0, 120);
    if (input.tipo === 'venta' && !concepto) return { ok: false, error: 'Escribe qué vendiste.' };
    const errorDia = validarDia(input.dia, dayKey(new Date(), timezone));
    if (errorDia) return { ok: false, error: errorDia };

    const fila = {
      tipo: input.tipo,
      concepto,
      monto_cents: montoCents,
      metodo: input.metodo,
      categoria,
      dia: input.dia,
      updated_at: new Date().toISOString(),
    };

    const db = createAdminClient();
    if (input.id) {
      const { data, error } = await db
        .from('caja_movimientos')
        .update(fila)
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
        .is('booking_id', null)
        .select('id');
      if (error) throw new Error(`No se pudo guardar: ${error.message}`);
      if (!data?.length) return { ok: false, error: 'Ese movimiento ya no existe.' };
    } else {
      const { error } = await db.from('caja_movimientos').insert({ ...fila, tenant_id: tenantId });
      if (error) throw new Error(`No se pudo guardar: ${error.message}`);
    }
    return listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

export async function borrarMovimiento(slug: string, id: string): Promise<Resultado> {
  try {
    const { tenantId } = await acceso(slug);
    const { error } = await createAdminClient()
      .from('caja_movimientos')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('booking_id', null);
    if (error) throw new Error(`No se pudo borrar: ${error.message}`);
    return listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

/**
 * Las ventas de citas no viven en caja_movimientos: se calculan de la
 * cita completada. Editarla o quitarla guarda UNA fila con booking_id
 * que gana sobre el cálculo (ver db/045).
 */
async function ajustarCita(
  slug: string,
  bookingId: string,
  cambios: { monto_cents: number; metodo: Metodo; anulada: boolean }
): Promise<Resultado> {
  const { tenantId, timezone } = await acceso(slug);
  const db = createAdminClient();

  const { data: cita } = await db
    .from('bookings')
    .select('id, starts_at, status')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!cita || cita.status !== 'completed') return { ok: false, error: 'Esa cita ya no está marcada como completada.' };

  const { data: existente } = await db
    .from('caja_movimientos')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('booking_id', bookingId)
    .maybeSingle();

  const fila = { ...cambios, updated_at: new Date().toISOString() };
  const { error } = existente
    ? await db.from('caja_movimientos').update(fila).eq('id', existente.id).eq('tenant_id', tenantId)
    : await db.from('caja_movimientos').insert({
        ...fila,
        tenant_id: tenantId,
        tipo: 'venta',
        booking_id: bookingId,
        dia: dayKey(cita.starts_at, timezone),
      });
  if (error) throw new Error(`No se pudo guardar: ${error.message}`);
  return listo(slug);
}

export async function ajustarVentaDeCita(
  slug: string,
  bookingId: string,
  input: { monto: string; metodo: Metodo }
): Promise<Resultado> {
  try {
    // Aquí 0 sí vale: una cortesía es una cita cobrada en cero.
    const limpio = (input.monto ?? '').replace(/[\s$,]/g, '');
    const montoCents = limpio === '0' ? 0 : pesosACentavos(input.monto ?? '');
    if (montoCents === null) return { ok: false, error: 'Escribe un monto válido, por ejemplo 250.' };
    if (!METODOS.includes(input.metodo)) return { ok: false, error: 'Elige cómo se pagó.' };
    return await ajustarCita(slug, bookingId, { monto_cents: montoCents, metodo: input.metodo, anulada: false });
  } catch (e) {
    return fallo(e);
  }
}

export async function quitarVentaDeCita(slug: string, bookingId: string): Promise<Resultado> {
  try {
    return await ajustarCita(slug, bookingId, { monto_cents: 0, metodo: 'efectivo', anulada: true });
  } catch (e) {
    return fallo(e);
  }
}
