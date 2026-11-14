'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { apartarOferta, apuntarseVip, type EntradaVip } from '@/lib/boost/publico';

// Puertas públicas de Boost, sin login (mismo modelo de confianza que
// /api/reservar): la validación y el filtro por negocio viven en
// lib/boost/publico.ts. service_role porque anon no toca estas tablas.

export async function apuntarseListaVip(slug: string, entrada: EntradaVip) {
  return apuntarseVip(createAdminClient(), slug, entrada);
}

export async function apartarHuecoBoost(slug: string, ofertaId: string) {
  const r = await apartarOferta(createAdminClient(), slug, ofertaId);
  if (r.ok) revalidatePath(`/t/${slug}/reservar/boost/${ofertaId}`);
  return r;
}
