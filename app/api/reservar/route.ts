import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingConfirmation } from '@/lib/email/sendBookingConfirmation';
import { sendBookingWhatsApp } from '@/lib/whatsapp/send';
import { tenantManageBookingUrl } from '@/lib/urls';
import { apartarCita } from '@/lib/anticipos/apartar';
import { obtenerLinkAnticipo } from '@/lib/anticipos/pago';

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

  const { slug, customer_name, customer_phone, customer_email } = body;
  if (typeof slug !== 'string' || !slug) {
    return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });
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

  // Validación, pertenencia al negocio y create_booking: compartido con
  // la recepcionista de WhatsApp (lib/bookings/crear.ts). apartarCita
  // además deja la cita apartada si el servicio pide anticipo (db/061);
  // sin anticipo o sin la migración, queda confirmada como siempre.
  const result = await apartarCita(supabase, tenant.id, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { bookingId } = result;
  const service = { name: result.serviceName };
  const starts_at = body.starts_at as string;
  // Ya validados como string no vacío por crearReserva.
  const customerName = customer_name as string;
  const customerPhone = customer_phone as string;

  // Apartada: falta el anticipo. Nada de "cita confirmada" todavía (esa
  // sale cuando llega el pago); al cliente se le da el link si lo hay.
  const anticipo =
    result.requiereAnticipo && result.venceEn
      ? {
          montoMxn: result.montoMxn,
          venceEn: result.venceEn.toISOString(),
          pagoUrl:
            (
              await obtenerLinkAnticipo(supabase, {
                tenantId: tenant.id,
                bookingId,
                montoMxn: result.montoMxn,
                descripcion: `Anticipo ${result.serviceName}`,
                vence: result.venceEn,
              })
            )?.url ?? null,
        }
      : null;

  // Awaited (not fire-and-forget) — Vercel serverless functions can stop
  // executing once the response is sent, so a truly "background" send
  // here isn't guaranteed to finish. sendBookingConfirmation never
  // throws on its own failures, so this can't turn a successful booking
  // into an error response just because the email had trouble.
  const manageUrl = tenantManageBookingUrl(slug, bookingId);

  if (customer_email) {
    await sendBookingConfirmation({
      customerEmail: customer_email as string,
      customerName: customerName,
      businessName: tenant.name,
      serviceName: service.name,
      startsAt: starts_at,
      manageUrl,
      accentColor: tenant.accent_color ?? undefined,
      timezone: tenant.timezone,
      anticipo,
    });
  }

  // La plantilla de WhatsApp dice "cita confirmada": con anticipo
  // pendiente sería falso, así que no sale hasta que se pague.
  if (anticipo) return NextResponse.json({ ok: true, bookingId, anticipo });

  // WhatsApp add-on. Read in its own query so that a database without
  // db/021 applied just behaves as "add-on off" instead of breaking
  // every booking. Awaited for the same reason as the email: a
  // serverless function can be frozen the moment it responds.
  const { data: addon } = await supabase
    .from('tenants')
    .select('whatsapp_enabled')
    .eq('id', tenant.id)
    .maybeSingle();

  if (addon?.whatsapp_enabled && customerPhone) {
    await sendBookingWhatsApp({
      tenantId: tenant.id,
      tenantName: tenant.name,
      whatsappEnabled: true,
      bookingId,
      customerPhone: customerPhone,
      customerName: customerName,
      serviceName: service.name,
      startsAt: starts_at,
      timezone: tenant.timezone,
      manageUrl,
    });
  }

  return NextResponse.json({ ok: true, bookingId, anticipo: null });
}
