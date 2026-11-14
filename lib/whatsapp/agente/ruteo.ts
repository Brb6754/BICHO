import type { SupabaseClient } from '@supabase/supabase-js';
import { planDe } from '@/lib/billing/planes';

// ¿A qué negocio le escribe esta persona?
//
//   1. Llegó al número PROPIO de un negocio → ese negocio.
//   2. Llegó al número de la PLATAFORMA:
//      a. el mensaje trae el código del link de la página de reservas
//         (wa.me/<num>?text=Hola%20<slug>) → ese negocio, aunque antes
//         haya hablado con otro;
//      b. si no, la conversación más reciente de ese teléfono EN ESE
//         número;
//      c. si no, no se sabe: se le pregunta.
//   3. Llegó a un número que no es ninguno de los dos → se ignora.

export type TenantAgente = {
  id: string;
  slug: string;
  name: string;
  timezone: string | null;
  plan?: string | null;
  agente_whatsapp_enabled?: boolean | null;
  whatsapp_phone_number_id?: string | null;
  direccion?: string | null;
  page_blocks?: unknown;
};

export type Ruteo =
  | { tipo: 'tenant'; tenant: TenantAgente; porPlataforma: boolean }
  | { tipo: 'sin_resolver' }
  | { tipo: 'ignorar' };

/** Add-on del plan Pro: el switch prendido Y el plan Pro, las dos cosas. */
export function planPermiteAgente(plan: unknown): boolean {
  return planDe(plan) === 'pro';
}

export function agenteDisponible(t: Pick<TenantAgente, 'plan' | 'agente_whatsapp_enabled'>): boolean {
  return t.agente_whatsapp_enabled === true && planPermiteAgente(t.plan);
}

const RE_CODIGO = /^\s*hola\s+([a-z0-9][a-z0-9-]{0,62})(?![a-z0-9-])/i;

/** "Hola salon-maria" → "salon-maria". Cualquier otra cosa → null. */
export function slugDelCodigo(texto: string | null | undefined): string | null {
  const m = RE_CODIGO.exec(texto ?? '');
  return m ? m[1].toLowerCase() : null;
}

export async function resolverTenant(
  db: SupabaseClient,
  { phoneNumberId, from, texto }: { phoneNumberId: string; from: string; texto: string | null }
): Promise<Ruteo> {
  const { data: propio } = await db.from('tenants').select('*').eq('whatsapp_phone_number_id', phoneNumberId).maybeSingle();
  if (propio) return { tipo: 'tenant', tenant: propio as TenantAgente, porPlataforma: false };

  const plataforma = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!plataforma || phoneNumberId !== plataforma) return { tipo: 'ignorar' };

  const slug = slugDelCodigo(texto);
  if (slug) {
    const { data } = await db.from('tenants').select('*').eq('slug', slug).maybeSingle();
    if (data) return { tipo: 'tenant', tenant: data as TenantAgente, porPlataforma: true };
  }

  const { data: previa } = await db
    .from('whatsapp_conversaciones')
    .select('tenant_id')
    .eq('telefono', from)
    .eq('phone_number_id', phoneNumberId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previa?.tenant_id) {
    const { data } = await db.from('tenants').select('*').eq('id', previa.tenant_id).maybeSingle();
    if (data) return { tipo: 'tenant', tenant: data as TenantAgente, porPlataforma: true };
  }

  return { tipo: 'sin_resolver' };
}
