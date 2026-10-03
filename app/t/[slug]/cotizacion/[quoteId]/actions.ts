'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

// Lo único que el cliente puede hacer desde el enlace: aceptar.
//
// Sin sesión, igual que "Ver mi cita": el uuid de la cotización es la
// llave. Y filtra SIEMPRE por tenant además de por id, para que un id
// de otro negocio no pueda tocar nada aquí aunque alguien lo adivinara.
export async function acceptQuote(
  slug: string,
  quoteId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();

  const { data: tenant } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
  if (!tenant) return { ok: false, error: 'No encontramos ese negocio.' };

  // Solo una cotización viva se puede aceptar. Un update cuyos filtros
  // no cazan ninguna fila NO es un error para PostgREST — este proyecto
  // ya tuvo ese bug con el reagendado, donde una cita cancelada "se
  // movía" y mandaba correo. De ahí el .select() y la comprobación.
  const { data, error } = await db
    .from('quotes')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', quoteId)
    .eq('tenant_id', tenant.id)
    .in('status', ['sent', 'viewed', 'draft'])
    .select('id');

  if (error) return { ok: false, error: 'No se pudo registrar. Intenta de nuevo.' };
  if (!data?.length) return { ok: false, error: 'Esta cotización ya no está disponible.' };

  revalidatePath(`/t/${slug}/cotizacion/${quoteId}`);
  return { ok: true };
}
