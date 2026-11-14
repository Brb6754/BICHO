import type { SupabaseClient } from '@supabase/supabase-js';
import { acceptsNewBookings } from '@/lib/billing/trial';
import { esServicio } from '@/lib/meetings/kinds';

// Crear una cita desde afuera del panel: la página pública
// (app/api/reservar) y la recepcionista de WhatsApp. Las dos puertas
// tienen que validar exactamente lo mismo — que el recurso y el servicio
// sean de ESTE negocio, que el negocio esté tomando reservas, longitudes,
// fechas — así que viven aquí una sola vez.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT_LENGTH = 200;
const MAX_NOTES_LENGTH = 1000;

export type ResultadoReserva =
  | { ok: true; bookingId: string; serviceName: string }
  | { ok: false; status: number; error: string };

export async function crearReserva(
  supabase: SupabaseClient,
  tenantId: string,
  input: Record<string, unknown>
): Promise<ResultadoReserva> {
  const { resource_id, service_type_id, starts_at, ends_at, customer_name, customer_phone, customer_email, notes } = input;

  if (
    typeof resource_id !== 'string' ||
    typeof service_type_id !== 'string' ||
    typeof starts_at !== 'string' ||
    typeof ends_at !== 'string' ||
    typeof customer_name !== 'string' ||
    typeof customer_phone !== 'string' ||
    !resource_id ||
    !service_type_id ||
    !starts_at ||
    !ends_at ||
    !customer_name.trim() ||
    !customer_phone.trim()
  ) {
    return { ok: false, status: 400, error: 'Faltan datos.' };
  }

  if (customer_name.length > MAX_TEXT_LENGTH || customer_phone.length > MAX_TEXT_LENGTH) {
    return { ok: false, status: 400, error: 'Uno de los campos es demasiado largo.' };
  }
  if (customer_email !== undefined && customer_email !== null) {
    if (typeof customer_email !== 'string' || customer_email.length > MAX_TEXT_LENGTH || !EMAIL_REGEX.test(customer_email)) {
      return { ok: false, status: 400, error: 'El correo no es válido.' };
    }
  }
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string' || notes.length > MAX_NOTES_LENGTH) {
      return { ok: false, status: 400, error: 'La nota es demasiado larga.' };
    }
  }

  const startsAtDate = new Date(starts_at);
  const endsAtDate = new Date(ends_at);
  if (Number.isNaN(startsAtDate.getTime()) || Number.isNaN(endsAtDate.getTime()) || endsAtDate <= startsAtDate) {
    return { ok: false, status: 400, error: 'Horario inválido.' };
  }

  // Prueba vencida y sin pagar: la página ya muestra el aviso, esto cierra la puerta de la API.
  const { data: billing } = await supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle();
  if (!acceptsNewBookings(billing)) {
    return { ok: false, status: 403, error: 'Este negocio no está tomando reservas en línea por ahora.' };
  }

  // Don't trust client-supplied resource_id/service_type_id blindly —
  // confirm they actually belong to this tenant before booking against them.
  const { data: resource } = await supabase
    .from('resources')
    .select('id')
    .eq('id', resource_id)
    .eq('tenant_id', tenantId)
    .single();
  const { data: service } = await supabase
    .from('service_types')
    // `*` para poder distinguir un servicio de un tipo de reunión
    // (db/039) sin que la consulta truene donde la migración no esté.
    .select('*')
    .eq('id', service_type_id)
    .eq('tenant_id', tenantId)
    .single();

  // Un tipo de reunión no se puede agendar por aquí: estas puertas son
  // públicas y no capturan empresa ni dirección, así que una reunión
  // creada por esta vía nacería sin los datos que la hacen útil.
  if (!resource || !service || !esServicio(service)) {
    return { ok: false, status: 400, error: 'Recurso o servicio inválido.' };
  }

  let { data: bookingId, error } = await supabase.rpc('create_booking', {
    p_tenant_id: tenantId,
    p_resource_id: resource_id,
    p_service_type_id: service_type_id,
    p_starts_at: starts_at,
    p_ends_at: ends_at,
    p_customer_name: customer_name,
    p_customer_phone: customer_phone,
    p_customer_email: customer_email ?? null,
    p_notes: notes ?? null,
  });

  // PGRST202 = PostgREST couldn't find a function matching this exact
  // parameter set — db/010 (email/notes params) isn't applied in this
  // environment yet. Fall back to the pre-010 signature so bookings
  // still work during the rollout window, just without those two
  // optional fields. (Not Postgres's own 42883 undefined_function code —
  // PostgREST resolves the function name before the call ever reaches
  // Postgres, so a missing-overload failure surfaces as its own code.)
  if (error?.code === 'PGRST202') {
    ({ data: bookingId, error } = await supabase.rpc('create_booking', {
      p_tenant_id: tenantId,
      p_resource_id: resource_id,
      p_service_type_id: service_type_id,
      p_starts_at: starts_at,
      p_ends_at: ends_at,
      p_customer_name: customer_name,
      p_customer_phone: customer_phone,
    }));
  }

  if (error) {
    // 23P01 = exclusion_violation — someone else took this slot between
    // the browser loading it and submitting.
    if (error.code === '23P01') {
      return { ok: false, status: 409, error: 'Ese horario ya no está disponible, elige otro.' };
    }
    console.error('create_booking failed', error);
    return { ok: false, status: 500, error: 'No se pudo agendar la cita.' };
  }

  return { ok: true, bookingId: bookingId as string, serviceName: service.name as string };
}
