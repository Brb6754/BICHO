'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { esReunion, type Modalidad, type Resultado } from '@/lib/meetings/kinds';

// Las acciones del módulo de reuniones.
//
// Todas pasan por `requireTenantStaff` y escriben con service_role, por
// el mismo motivo que cotizaciones y facturas: una Server Action es un
// endpoint POST real, y estas filas guardan el teléfono, la empresa y
// la dirección del domicilio de una persona. El layout protege la
// navegación, no la acción.

const RESULTADOS_VALIDOS: Resultado[] = ['interesado', 'cotizado', 'ganado', 'perdido'];

type Resp = { ok: true } | { ok: false; error: string };

// ── Capturar en qué quedó una reunión ───────────────────────────────
export async function setMeetingOutcome(
  slug: string,
  bookingId: string,
  outcome: Resultado | null
): Promise<Resp> {
  try {
    const { tenantId } = await requireTenantStaff(slug);
    if (outcome !== null && !RESULTADOS_VALIDOS.includes(outcome)) {
      return { ok: false, error: 'Ese resultado no existe.' };
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from('bookings')
      .update({ outcome })
      // El filtro por tenant va aunque service_role ignore RLS: sin él,
      // conocer un id ajeno bastaría para escribirle el pipeline a otro
      // negocio.
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .eq('kind', 'reunion')
      .select('id');

    if (error) {
      if (error.code === '42703') {
        return { ok: false, error: 'Falta correr db/039_reuniones.sql en Supabase.' };
      }
      return { ok: false, error: `No se pudo guardar: ${error.message}` };
    }
    // Un update cuyos filtros no matchean no es error para PostgREST —
    // el bug silencioso que ya costó un correo de "tu cita se movió"
    // sobre una cita cancelada. Por eso se revisa que haya fila.
    if (!data?.length) return { ok: false, error: 'Esa reunión no es de este negocio.' };

    revalidatePath(`/t/${slug}/dashboard/reuniones`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
}

export async function setMeetingNotes(
  slug: string,
  bookingId: string,
  notes: string
): Promise<Resp> {
  try {
    const { tenantId } = await requireTenantStaff(slug);
    const db = createAdminClient();
    const { data, error } = await db
      .from('bookings')
      .update({ outcome_notes: notes.trim().slice(0, 2000) || null })
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .eq('kind', 'reunion')
      .select('id');

    if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
    if (!data?.length) return { ok: false, error: 'Esa reunión no es de este negocio.' };

    revalidatePath(`/t/${slug}/dashboard/reuniones`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar.' };
  }
}

export async function cancelMeeting(bookingId: string, slug: string) {
  const { tenantId } = await requireTenantStaff(slug);
  const db = createAdminClient();
  const { error } = await db
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .eq('kind', 'reunion');
  if (error) throw new Error(`No se pudo cancelar la reunión: ${error.message}`);
  revalidatePath(`/t/${slug}/dashboard/reuniones`);
}

// ── Agendar una reunión a mano ──────────────────────────────────────
//
// El prospecto que llamó por teléfono, o al que el asesor le consiguió
// un hueco en persona. Sin esto el vendedor lleva su propia agenda en
// paralelo y la disponibilidad pública ofrece horas que ya no existen.
export async function createMeeting({
  slug,
  resourceId,
  meetingTypeId,
  startsAt,
  endsAt,
  name,
  phone,
  email,
  company,
  address,
  notes,
}: {
  slug: string;
  resourceId: string;
  meetingTypeId: string;
  startsAt: string;
  endsAt: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  notes?: string;
}): Promise<{ ok: true; bookingId: string } | { ok: false; error: string }> {
  let tenantId: string;
  try {
    ({ tenantId } = await requireTenantStaff(slug));
  } catch {
    return { ok: false, error: 'No tienes acceso a este negocio.' };
  }

  const nombre = name.trim().slice(0, 120);
  const tel = phone.trim().slice(0, 30);
  if (!nombre) return { ok: false, error: 'Escribe el nombre del prospecto.' };
  if (!tel) return { ok: false, error: 'Escribe un teléfono de contacto.' };

  const db = createAdminClient();

  // El asesor y el tipo de reunión tienen que ser de ESTE negocio:
  // create_booking recibe el tenant_id por parámetro y se fía de él.
  const [{ data: resource }, { data: tipo }] = await Promise.all([
    db.from('resources').select('id').eq('id', resourceId).eq('tenant_id', tenantId).maybeSingle(),
    db
      .from('service_types')
      .select('*')
      .eq('id', meetingTypeId)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ]);
  if (!resource || !tipo) return { ok: false, error: 'Asesor o tipo de reunión inválido.' };
  // Y tiene que ser un tipo de REUNIÓN: agendar un servicio por aquí
  // crearía una cita disfrazada, con empresa y dirección, en una
  // pantalla que no la va a mostrar nunca.
  if (!esReunion(tipo)) return { ok: false, error: 'Ese no es un tipo de reunión.' };

  const modality = (tipo.modality ?? null) as Modalidad | null;

  const { data: bookingId, error } = await db.rpc('create_booking', {
    p_tenant_id: tenantId,
    p_resource_id: resourceId,
    p_service_type_id: meetingTypeId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_customer_name: nombre,
    p_customer_phone: tel,
    p_customer_email: email?.trim() || null,
    p_notes: notes?.trim().slice(0, 2000) || null,
    p_kind: 'reunion',
    p_modality: modality,
    p_address: modality === 'sitio' ? address?.trim().slice(0, 300) || null : null,
    p_company: company?.trim().slice(0, 160) || null,
  });

  if (error) {
    // 23P01 = el exclude constraint. El asesor ya tiene algo ahí: una
    // cita o una reunión, porque las dos viven en la misma tabla justo
    // para que esto no se pueda colar.
    if (error.code === '23P01') {
      return { ok: false, error: 'Ese horario se acaba de ocupar. Elige otro.' };
    }
    if (error.code === 'PGRST202') {
      return { ok: false, error: 'Falta correr db/039_reuniones.sql en Supabase.' };
    }
    return { ok: false, error: `No se pudo agendar: ${error.message}` };
  }

  revalidatePath(`/t/${slug}/dashboard/reuniones`);
  revalidatePath(`/t/${slug}/dashboard/customers`);
  return { ok: true, bookingId: bookingId as string };
}

// ── Tipos de reunión ────────────────────────────────────────────────
export async function createMeetingType({
  slug,
  name,
  durationMinutes,
  modality,
}: {
  slug: string;
  name: string;
  durationMinutes: number;
  modality: Modalidad;
}): Promise<Resp> {
  try {
    const { tenantId } = await requireTenantStaff(slug);
    const nombre = name.trim().slice(0, 120);
    if (!nombre) return { ok: false, error: 'Ponle un nombre al tipo de reunión.' };
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 480) {
      return { ok: false, error: 'La duración tiene que estar entre 1 y 480 minutos.' };
    }

    const db = createAdminClient();
    const { error } = await db.from('service_types').insert({
      tenant_id: tenantId,
      name: nombre,
      duration_minutes: Math.round(durationMinutes),
      // Una reunión de venta no se cobra. El precio existe porque la
      // tabla la comparte con los servicios; aquí es cero y no se
      // enseña en ningún lado.
      price_cents: 0,
      requires_staff: true,
      active: true,
      kind: 'reunion',
      modality,
    });

    if (error) {
      if (error.code === '42703') {
        return { ok: false, error: 'Falta correr db/039_reuniones.sql en Supabase.' };
      }
      return { ok: false, error: `No se pudo crear: ${error.message}` };
    }

    revalidatePath(`/t/${slug}/dashboard/reuniones/tipos`);
    revalidatePath(`/t/${slug}/dashboard/reuniones`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo crear.' };
  }
}

export async function setMeetingTypeActive(slug: string, typeId: string, active: boolean) {
  const { tenantId } = await requireTenantStaff(slug);
  const db = createAdminClient();
  const { error } = await db
    .from('service_types')
    .update({ active })
    .eq('id', typeId)
    .eq('tenant_id', tenantId)
    .eq('kind', 'reunion');
  if (error) throw new Error(`No se pudo actualizar: ${error.message}`);
  revalidatePath(`/t/${slug}/dashboard/reuniones/tipos`);
}

export async function deleteMeetingType(typeId: string, slug: string) {
  const { tenantId } = await requireTenantStaff(slug);
  const db = createAdminClient();
  const { error } = await db
    .from('service_types')
    .delete()
    .eq('id', typeId)
    .eq('tenant_id', tenantId)
    .eq('kind', 'reunion');
  // 23503 = hay reuniones que lo usan. `service_type_id` es `on delete
  // restrict` (db/001) a propósito: borrar el tipo borraría el nombre
  // de reuniones que ya ocurrieron. Se desactiva, no se borra.
  if (error?.code === '23503') {
    throw new Error(
      'Ya hay reuniones agendadas con este tipo. Desactívalo en vez de borrarlo: deja de ofrecerse y las que ya existen conservan su nombre.'
    );
  }
  if (error) throw new Error(`No se pudo borrar: ${error.message}`);
  revalidatePath(`/t/${slug}/dashboard/reuniones/tipos`);
}
