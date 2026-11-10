import { acceptsNewBookings } from '@/lib/billing/trial';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingConfirmation } from '@/lib/email/sendBookingConfirmation';
import { sendBookingWhatsApp } from '@/lib/whatsapp/send';
import { tenantManageBookingUrl } from '@/lib/urls';
import { esServicio } from '@/lib/meetings/kinds';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT_LENGTH = 200;
const MAX_NOTES_LENGTH = 1000;

// In-memory sliding window, keyed by IP — a real stopgap (it does throttle
// abuse from a single warm serverless instance, or in a single-instance/
// self-hosted deployment), but NOT a substitute for a real distributed
// limiter once this runs on Vercel: each serverless invocation can land on
// a different instance with its own empty Map, and cold starts reset it
// entirely. Recommended real fix on Vercel: turn on Vercel Firewall rate
// limiting for this route in the project dashboard (no code, works
// correctly across instances) — or wire up @upstash/ratelimit if a Redis
// store is available. This is defense-in-depth underneath that, not a
// replacement for it.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
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

  const { slug, resource_id, service_type_id, starts_at, ends_at, customer_name, customer_phone, customer_email, notes } =
    body;

  if (
    typeof slug !== 'string' ||
    typeof resource_id !== 'string' ||
    typeof service_type_id !== 'string' ||
    typeof starts_at !== 'string' ||
    typeof ends_at !== 'string' ||
    typeof customer_name !== 'string' ||
    typeof customer_phone !== 'string' ||
    !slug ||
    !resource_id ||
    !service_type_id ||
    !starts_at ||
    !ends_at ||
    !customer_name.trim() ||
    !customer_phone.trim()
  ) {
    return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });
  }

  if (customer_name.length > MAX_TEXT_LENGTH || customer_phone.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Uno de los campos es demasiado largo.' }, { status: 400 });
  }
  if (customer_email !== undefined && customer_email !== null) {
    if (typeof customer_email !== 'string' || customer_email.length > MAX_TEXT_LENGTH || !EMAIL_REGEX.test(customer_email)) {
      return NextResponse.json({ error: 'El correo no es válido.' }, { status: 400 });
    }
  }
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string' || notes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json({ error: 'La nota es demasiado larga.' }, { status: 400 });
    }
  }

  const startsAtDate = new Date(starts_at);
  const endsAtDate = new Date(ends_at);
  if (Number.isNaN(startsAtDate.getTime()) || Number.isNaN(endsAtDate.getTime()) || endsAtDate <= startsAtDate) {
    return NextResponse.json({ error: 'Horario inválido.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: tenant } = await supabase
    .from('tenants')
    // whatsapp_enabled is selected separately from the rest so a missing
    // column (db/021 not run yet) can't take down the whole booking
    // query — the same defensive split used for theme_mode/page_blocks.
    .select('id, name, accent_color, timezone')
    .eq('slug', slug)
    .single();
  if (!tenant) {
    return NextResponse.json({ error: 'Negocio no encontrado.' }, { status: 404 });
  }

  // Prueba vencida y sin pagar: la página ya muestra el aviso, esto cierra la puerta de la API.
  const { data: billing } = await supabase.from('tenants').select('*').eq('id', tenant.id).maybeSingle();
  if (!acceptsNewBookings(billing)) {
    return NextResponse.json({ error: 'Este negocio no está tomando reservas en línea por ahora.' }, { status: 403 });
  }

  // Don't trust client-supplied resource_id/service_type_id blindly —
  // confirm they actually belong to this tenant before booking against them.
  const { data: resource } = await supabase
    .from('resources')
    .select('id')
    .eq('id', resource_id)
    .eq('tenant_id', tenant.id)
    .single();
  const { data: service } = await supabase
    .from('service_types')
    // `*` para poder distinguir un servicio de un tipo de reunión
    // (db/039) sin que la consulta truene donde la migración no esté.
    .select('*')
    .eq('id', service_type_id)
    .eq('tenant_id', tenant.id)
    .single();

  // Un tipo de reunión no se puede agendar por aquí: este endpoint es
  // público y no captura empresa ni dirección, así que una reunión
  // creada por esta vía nacería sin los datos que la hacen útil.
  if (!resource || !service || !esServicio(service)) {
    return NextResponse.json({ error: 'Recurso o servicio inválido.' }, { status: 400 });
  }

  let { data: bookingId, error } = await supabase.rpc('create_booking', {
    p_tenant_id: tenant.id,
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
      p_tenant_id: tenant.id,
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
      return NextResponse.json({ error: 'Ese horario ya no está disponible, elige otro.' }, { status: 409 });
    }
    console.error('create_booking failed', error);
    return NextResponse.json({ error: 'No se pudo agendar la cita.' }, { status: 500 });
  }

  // Awaited (not fire-and-forget) — Vercel serverless functions can stop
  // executing once the response is sent, so a truly "background" send
  // here isn't guaranteed to finish. sendBookingConfirmation never
  // throws on its own failures, so this can't turn a successful booking
  // into an error response just because the email had trouble.
  const manageUrl = tenantManageBookingUrl(slug, bookingId);

  if (customer_email) {
    await sendBookingConfirmation({
      customerEmail: customer_email,
      customerName: customer_name,
      businessName: tenant.name,
      serviceName: service.name,
      startsAt: starts_at,
      manageUrl,
      accentColor: tenant.accent_color ?? undefined,
      timezone: tenant.timezone,
    });
  }

  // WhatsApp add-on. Read in its own query so that a database without
  // db/021 applied just behaves as "add-on off" instead of breaking
  // every booking. Awaited for the same reason as the email: a
  // serverless function can be frozen the moment it responds.
  const { data: addon } = await supabase
    .from('tenants')
    .select('whatsapp_enabled')
    .eq('id', tenant.id)
    .maybeSingle();

  if (addon?.whatsapp_enabled && customer_phone) {
    await sendBookingWhatsApp({
      tenantId: tenant.id,
      tenantName: tenant.name,
      whatsappEnabled: true,
      bookingId,
      customerPhone: customer_phone,
      customerName: customer_name,
      serviceName: service.name,
      startsAt: starts_at,
      timezone: tenant.timezone,
      manageUrl,
    });
  }

  return NextResponse.json({ ok: true, bookingId });
}
