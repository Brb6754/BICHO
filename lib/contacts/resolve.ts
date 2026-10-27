import type { SupabaseClient } from '@supabase/supabase-js';

// Resolver una persona a un contacto, desde código de aplicación.
//
// `create_booking` hace esto dentro de su propia transacción (db/038),
// porque ahí la cita y el contacto tienen que nacer o morir juntos. Las
// cotizaciones y las facturas no tienen esa restricción —si algo falla
// después, un contacto de más no rompe nada— así que les basta esto.
//
// La regla es la misma en los dos lados y no puede divergir: **el
// teléfono normalizado a dígitos es la identidad**.

/**
 * Solo los dígitos. "618 123 4567", "+52 618-1234567" y "6181234567"
 * tienen que resolver al mismo contacto, o volvemos al problema que
 * esta tabla vino a resolver: una fila por cada forma de escribirlo.
 *
 * Cadena vacía → null, para no amontonar contactos "sin teléfono" bajo
 * una misma llave que en realidad son personas distintas.
 */
export function normalizeContactPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

export type ContactSeed = {
  name: string;
  phone?: string | null;
  email?: string | null;
};

/**
 * Devuelve el id del contacto de esta persona, creándolo si hace falta.
 * Devuelve null solo si algo falla — quien llama decide si eso importa,
 * y en general no debería: una cotización sin contacto sigue siendo una
 * cotización válida.
 *
 * NUNCA sobreescribe el nombre de un contacto que ya existe. El de la
 * ficha lo curó una persona; el de un formulario público puede venir
 * en minúsculas o incompleto. Solo rellena huecos (un correo que
 * faltaba), nunca reemplaza.
 */
export async function resolveContact(
  db: SupabaseClient,
  tenantId: string,
  seed: ContactSeed
): Promise<string | null> {
  const nombre = seed.name?.trim();
  if (!nombre) return null;

  const phone = normalizeContactPhone(seed.phone);
  const email = seed.email?.trim() || null;

  if (phone) {
    const { data: existente } = await db
      .from('contacts')
      .select('id, email')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .maybeSingle();

    if (existente) {
      if (email && !existente.email) {
        await db
          .from('contacts')
          .update({ email, updated_at: new Date().toISOString() })
          .eq('id', existente.id);
      }
      return existente.id;
    }
  }

  const { data: creado, error } = await db
    .from('contacts')
    .insert({ tenant_id: tenantId, name: nombre, phone, email })
    .select('id')
    .single();

  if (error) {
    // 23505 = otra escritura simultánea ganó la carrera por ese
    // teléfono. El índice único hizo su trabajo; ahora leemos el que
    // quedó en vez de fallar.
    if (error.code === '23505' && phone) {
      const { data } = await db
        .from('contacts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .maybeSingle();
      return data?.id ?? null;
    }
    return null;
  }

  return creado?.id ?? null;
}
