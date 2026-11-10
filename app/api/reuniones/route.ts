import { acceptsNewBookings } from '@/lib/billing/trial';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { esReunion, pideDireccion } from '@/lib/meetings/kinds';

// La única puerta de escritura del agendado público de reuniones.
//
// Mismo modelo que `/api/reservar`: escribe con `service_role` porque
// `create_booking` es SECURITY DEFINER y solo está otorgada a ese rol
// (la transacción tiene que crear contacto + customer + reunión de una
// sola vez para que un choque de horario no deje basura). Por eso todo
// lo que llega del navegador se valida aquí y nada se da por bueno:
// que el asesor y el tipo sean DE ESE negocio, y que el tipo sea de
// verdad una reunión.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 200;
const MAX_ADDRESS = 300;
const MAX_NOTES = 1000;

// Mismo stopgap en memoria que `/api/reservar`, con los mismos límites
// y la misma advertencia: en serverless cada instancia tiene su propio
// Map. El arreglo real es Vercel Firewall en el dashboard.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const stamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  stamps.push(now);
  requestLog.set(ip, stamps);
  return stamps.length > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Demasiados intentos, espera un momento.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const {
    slug,
    resource_id,
    meeting_type_id,
    starts_at,
    ends_at,
    name,
    phone,
    email,
    company,
    address,
    notes,
  } = body;

  if (
    typeof slug !== 'string' ||
    typeof resource_id !== 'string' ||
    typeof meeting_type_id !== 'string' ||
    typeof starts_at !== 'string' ||
    typeof ends_at !== 'string' ||
    typeof name !== 'string' ||
    typeof phone !== 'string' ||
    !slug ||
    !resource_id ||
    !meeting_type_id ||
    !name.trim() ||
    !phone.trim()
  ) {
    return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });
  }

  if (name.length > MAX_TEXT || phone.length > MAX_TEXT) {
    return NextResponse.json({ error: 'Uno de los campos es demasiado largo.' }, { status: 400 });
  }
  if (email !== undefined && email !== null && email !== '') {
    if (typeof email !== 'string' || email.length > MAX_TEXT || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'El correo no es válido.' }, { status: 400 });
    }
  }
  for (const [valor, max, etiqueta] of [
    [company, MAX_TEXT, 'La empresa'],
    [address, MAX_ADDRESS, 'La dirección'],
    [notes, MAX_NOTES, 'La nota'],
  ] as const) {
    if (valor !== undefined && valor !== null && valor !== '') {
      if (typeof valor !== 'string' || valor.length > max) {
        return NextResponse.json({ error: `${etiqueta} es demasiado larga.` }, { status: 400 });
      }
    }
  }

  const inicio = new Date(starts_at);
  const fin = new Date(ends_at);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) {
    return NextResponse.json({ error: 'Horario inválido.' }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, timezone')
    .eq('slug', slug)
    .single();
  if (!tenant) return NextResponse.json({ error: 'Negocio no encontrado.' }, { status: 404 });

  // El módulo en su propia consulta: sin db/039 corrida esto vuelve
  // apagado y la página ya no existe, en vez de tumbar la petición con
  // un error de columna.
  const { data: flag } = await db
    .from('tenants')
    .select('reuniones_enabled')
    .eq('id', tenant.id)
    .maybeSingle();
  if (flag?.reuniones_enabled !== true) {
    return NextResponse.json({ error: 'Este negocio no agenda reuniones.' }, { status: 404 });
  }

  const { data: billing } = await db.from('tenants').select('*').eq('id', tenant.id).maybeSingle();
  if (!acceptsNewBookings(billing)) {
    return NextResponse.json({ error: 'Este negocio no está tomando reuniones en línea por ahora.' }, { status: 403 });
  }

  const [{ data: resource }, { data: tipo }] = await Promise.all([
    db.from('resources').select('id').eq('id', resource_id).eq('tenant_id', tenant.id).maybeSingle(),
    db
      .from('service_types')
      .select('*')
      .eq('id', meeting_type_id)
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
  ]);
  if (!resource || !tipo || !tipo.active || !esReunion(tipo)) {
    return NextResponse.json({ error: 'Asesor o tipo de reunión inválido.' }, { status: 400 });
  }

  // La dirección se exige del lado del servidor y no solo en el
  // formulario: una visita a domicilio sin domicilio es una visita que
  // el asesor no puede hacer, y este endpoint es alcanzable sin cargar
  // nunca la página.
  const necesitaDireccion = pideDireccion(tipo.modality);
  const direccion = typeof address === 'string' ? address.trim() : '';
  if (necesitaDireccion && !direccion) {
    return NextResponse.json({ error: 'Falta la dirección de la visita.' }, { status: 400 });
  }

  const { data: bookingId, error } = await db.rpc('create_booking', {
    p_tenant_id: tenant.id,
    p_resource_id: resource_id,
    p_service_type_id: meeting_type_id,
    p_starts_at: starts_at,
    p_ends_at: ends_at,
    p_customer_name: name.trim(),
    p_customer_phone: phone.trim(),
    p_customer_email: typeof email === 'string' && email ? email.trim() : null,
    p_notes: typeof notes === 'string' && notes ? notes.trim() : null,
    p_kind: 'reunion',
    p_modality: tipo.modality ?? null,
    p_address: necesitaDireccion ? direccion : null,
    p_company: typeof company === 'string' && company ? company.trim() : null,
  });

  if (error) {
    // 23P01 = el exclude constraint de Postgres. Alguien tomó ese hueco
    // entre que esta persona lo vio y lo confirmó — incluida una cita
    // normal, porque citas y reuniones comparten tabla justo para eso.
    if (error.code === '23P01') {
      return NextResponse.json(
        { error: 'Ese horario se acaba de ocupar. Elige otro.' },
        { status: 409 }
      );
    }
    if (error.code === 'PGRST202') {
      return NextResponse.json(
        { error: 'Este negocio todavía no termina de configurar sus reuniones.' },
        { status: 503 }
      );
    }
    // El error de Postgres se pierde sin dejar rastro si no se escribe:
    // mismo motivo por el que `/api/reservar` loguea el suyo.
    console.error('[reuniones] create_booking falló', error);
    return NextResponse.json({ error: 'No se pudo agendar la reunión.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bookingId });
}
