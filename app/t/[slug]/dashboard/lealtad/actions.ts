'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { estadoTarjeta, nuevoToken } from '@/lib/lealtad/tarjeta';
import { REGLA_DEFAULT } from '@/lib/lealtad/datos';

// Acciones del módulo de Lealtad. Todas: requireTenantStaff + módulo
// prendido + service_role filtrando SIEMPRE por tenant_id (sin ese
// filtro, conocer un id ajeno bastaría para sellarle la tarjeta a otro
// negocio).

type Resp = { ok: true } | { ok: false; error: string };

const FALTA = 'Falta correr db/047_lealtad.sql en Supabase.';

async function acceso(slug: string) {
  const staff = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.lealtad) throw new Error('Este negocio no tiene el módulo de Lealtad.');
  return staff;
}

function fallo(e: unknown): Resp {
  return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar.' };
}

function err(error: { code?: string; message: string }): Resp {
  // 42P01 tabla no existe / PGRST205 PostgREST no la ve.
  if (error.code === '42P01' || error.code === 'PGRST205') return { ok: false, error: FALTA };
  return { ok: false, error: `No se pudo guardar: ${error.message}` };
}

function listo(slug: string): Resp {
  revalidatePath(`/t/${slug}/dashboard/lealtad`);
  return { ok: true };
}

export async function guardarRegla(slug: string, requeridos: number, premio: string): Promise<Resp> {
  try {
    const { tenantId } = await acceso(slug);
    const n = Math.floor(Number(requeridos));
    const p = premio.trim().slice(0, 120);
    if (!Number.isFinite(n) || n < 2 || n > 30) return { ok: false, error: 'Pon entre 2 y 30 sellos.' };
    if (!p) return { ok: false, error: 'Escribe el premio.' };

    const { error } = await createAdminClient()
      .from('loyalty_programs')
      .upsert({ tenant_id: tenantId, stamps_required: n, reward: p, active: true, updated_at: new Date().toISOString() });
    return error ? err(error) : listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

export async function darTarjeta(slug: string, contactId: string): Promise<Resp> {
  try {
    const { tenantId } = await acceso(slug);
    const db = createAdminClient();
    const { data: contacto } = await db
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!contacto) return { ok: false, error: 'Ese cliente no es de este negocio.' };

    const { error } = await db
      .from('loyalty_cards')
      .upsert({ tenant_id: tenantId, contact_id: contactId, token: nuevoToken() }, { onConflict: 'tenant_id,contact_id', ignoreDuplicates: true });
    return error ? err(error) : listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

async function tarjetaDelNegocio(tenantId: string, cardId: string) {
  const { data } = await createAdminClient()
    .from('loyalty_cards')
    .select('id')
    .eq('id', cardId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return data;
}

export async function sumarSello(slug: string, cardId: string): Promise<Resp> {
  try {
    const { tenantId, userId } = await acceso(slug);
    if (!(await tarjetaDelNegocio(tenantId, cardId))) return { ok: false, error: 'Esa tarjeta no es de este negocio.' };
    const { error } = await createAdminClient()
      .from('loyalty_stamps')
      .insert({ tenant_id: tenantId, card_id: cardId, source: 'manual', created_by: userId });
    return error ? err(error) : listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

export async function canjear(slug: string, cardId: string): Promise<Resp> {
  try {
    const { tenantId, userId } = await acceso(slug);
    const db = createAdminClient();
    if (!(await tarjetaDelNegocio(tenantId, cardId))) return { ok: false, error: 'Esa tarjeta no es de este negocio.' };

    const [{ data: programa }, { count: sellos }, { data: canjes }] = await Promise.all([
      db.from('loyalty_programs').select('stamps_required, reward').eq('tenant_id', tenantId).maybeSingle(),
      db.from('loyalty_stamps').select('id', { count: 'exact', head: true }).eq('card_id', cardId).eq('tenant_id', tenantId),
      db.from('loyalty_redemptions').select('stamps_used').eq('card_id', cardId).eq('tenant_id', tenantId),
    ]);
    const requeridos = programa?.stamps_required ?? REGLA_DEFAULT.requeridos;
    const usados = (canjes ?? []).reduce((s, c) => s + c.stamps_used, 0);
    if (!estadoTarjeta(sellos ?? 0, usados, requeridos).completa) {
      return { ok: false, error: 'Esta tarjeta todavía no está completa.' };
    }
    // shortcut: dos canjes simultáneos de la misma tarjeta podrían pasar los
    // dos; el historial lo deja ver. Pasar a una función SQL con lock si pasa.
    const { error } = await db.from('loyalty_redemptions').insert({
      tenant_id: tenantId,
      card_id: cardId,
      stamps_used: requeridos,
      reward: programa?.reward ?? REGLA_DEFAULT.premio,
      redeemed_by: userId,
    });
    return error ? err(error) : listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function guardarPromo(
  slug: string,
  promo: { title: string; details: string; code: string; starts_on: string; ends_on: string }
): Promise<Resp> {
  try {
    const { tenantId } = await acceso(slug);
    const title = promo.title.trim().slice(0, 80);
    const details = promo.details.trim().slice(0, 240) || null;
    const code = promo.code.trim().toUpperCase().replace(/\s+/g, '') || null;
    if (!title) return { ok: false, error: 'Escribe el nombre de la promoción.' };
    if (!FECHA.test(promo.starts_on) || !FECHA.test(promo.ends_on)) return { ok: false, error: 'Elige las fechas.' };
    if (promo.ends_on < promo.starts_on) return { ok: false, error: 'La fecha final va después de la inicial.' };
    if (code && !/^[A-Z0-9_-]{2,30}$/.test(code)) return { ok: false, error: 'El código: letras, números o guiones, 2 a 30.' };

    const { error } = await createAdminClient().from('promotions').insert({
      tenant_id: tenantId,
      title,
      details,
      code,
      starts_on: promo.starts_on,
      ends_on: promo.ends_on,
    });
    if (error) return err(error);
    revalidatePath(`/t/${slug}/reservar`);
    return listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

export async function alternarPromo(slug: string, promoId: string, active: boolean): Promise<Resp> {
  try {
    const { tenantId } = await acceso(slug);
    const { data, error } = await createAdminClient()
      .from('promotions')
      .update({ active })
      .eq('id', promoId)
      .eq('tenant_id', tenantId)
      .select('id');
    if (error) return err(error);
    if (!data?.length) return { ok: false, error: 'Esa promoción no es de este negocio.' };
    revalidatePath(`/t/${slug}/reservar`);
    return listo(slug);
  } catch (e) {
    return fallo(e);
  }
}

export async function borrarPromo(slug: string, promoId: string): Promise<Resp> {
  try {
    const { tenantId } = await acceso(slug);
    const { error } = await createAdminClient().from('promotions').delete().eq('id', promoId).eq('tenant_id', tenantId);
    if (error) return err(error);
    revalidatePath(`/t/${slug}/reservar`);
    return listo(slug);
  } catch (e) {
    return fallo(e);
  }
}
