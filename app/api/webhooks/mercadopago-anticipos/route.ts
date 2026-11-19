import { createAdminClient } from '@/lib/supabase/admin';
import { verifyMercadoPagoSignature } from '@/lib/payments/mercadopagoSignature';
import { obtenerTokenVendedor } from '@/lib/payments/mpConnect';
import { leerReferenciaAnticipo } from '@/lib/payments/mpConnectPago';
import { confirmarAnticipo } from '@/lib/anticipos/confirmar';
import { faltaMigracion, mpConnectHabilitado } from '@/lib/anticipos/config';
import { avisarPorWhatsapp as avisar, pesosMxn as pesos } from '@/lib/anticipos/avisar';

// Webhook de pagos de ANTICIPOS (Mercado Pago Connect, cuenta del negocio).
// Separado del de suscripciones (/api/webhooks/mercadopago): otro secreto,
// otra app de MP y otro dueño del dinero.
//
// Orden: firma (sobre el request crudo, antes de parsear) -> resolver el
// negocio por user_id -> RE-CONSULTAR el pago con su token -> validar
// referencia, estado y moneda -> dedup por id de evento -> confirmar ->
// comprobante por WhatsApp. MP no firma el cuerpo, así que el cuerpo solo
// dice qué consultar; la decisión sale del pago re-consultado.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;

type Notificacion = { id?: string | number; type?: string; date_created?: string; user_id?: string | number; data?: { id?: string | number } };
type Pago = { id: number | string; status?: string; transaction_amount?: number; currency_id?: string; external_reference?: string | null; collector_id?: number | string };

// Solo id/tipo/fecha: el resto puede traer datos del pagador.
const log = (id: string, type: string, created: string | undefined, nota: string) =>
  console.log(`[mp-anticipos] ${nota} id=${id} type=${type} created=${created ?? '-'}`);

// HMAC-SHA256 sobre id:<data.id>;request-id:<x-request-id>;ts:<ts>; en lib/payments/mercadopagoSignature.ts
// @pagokit:signature-verified
export async function POST(request: Request) {
  if (!mpConnectHabilitado()) return new Response('not found', { status: 404 });
  const secret = process.env.MP_CONNECT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[mp-anticipos] MP_CONNECT_WEBHOOK_SECRET no está configurada');
    return new Response('webhook not configured', { status: 500 });
  }

  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declarado) && declarado > MAX_BODY_BYTES) return new Response('payload too large', { status: 413 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return new Response('payload too large', { status: 413 });

  // MP firma el data.id de la query string: se exige ahí para que la firma
  // ate el id que se va a consultar (el del cuerpo no está firmado).
  const url = new URL(request.url);
  const dataId = url.searchParams.get('data.id');
  const requestId = request.headers.get('x-request-id');
  const verificada = verifyMercadoPagoSignature({ signatureHeader: request.headers.get('x-signature'), requestId, dataId, secret });
  if (!verificada.ok || !dataId) {
    console.warn(`[mp-anticipos] firma rechazada reason=${verificada.ok ? 'missing_data_id' : verificada.reason}`);
    return new Response('invalid signature', { status: 401 });
  }

  let body: Notificacion = {};
  try {
    body = rawBody ? (JSON.parse(rawBody) as Notificacion) : {};
  } catch {
    return new Response('bad json', { status: 400 });
  }
  const type = body.type ?? url.searchParams.get('type') ?? 'unknown';
  const eventId = body.id != null ? String(body.id) : (requestId ?? `${type}:${dataId}`);
  if (type !== 'payment' || !/^\d{1,20}$/.test(dataId)) {
    log(eventId, type, body.date_created, 'ignorado');
    return Response.json({ received: true });
  }

  const db = createAdminClient();

  // El vendedor sale del user_id del evento; si una misma cuenta de MP está
  // conectada a varios negocios, la referencia del pago decide cuál.
  const mpUserId = body.user_id != null ? String(body.user_id) : null;
  if (!mpUserId) {
    log(eventId, type, body.date_created, 'sin user_id, ignorado');
    return Response.json({ received: true });
  }
  const { data: conexiones, error: errConexion } = await db.from('tenant_mp_connections').select('tenant_id').eq('mp_user_id', mpUserId);
  if (errConexion) {
    console.error(`[mp-anticipos] conexiones code=${errConexion.code}${faltaMigracion(errConexion) ? ' (falta db/061)' : ''}`);
    return new Response('connections unavailable', { status: 500 });
  }
  const candidatos = (conexiones ?? []).map((c) => String((c as { tenant_id: string }).tenant_id));
  if (!candidatos.length) {
    log(eventId, type, body.date_created, 'vendedor no conectado, ignorado');
    return Response.json({ received: true });
  }

  let pago: Pago;
  try {
    const token = await obtenerTokenVendedor(db, candidatos[0]);
    if (!token || token.mpUserId !== mpUserId) throw new Error('token del vendedor no coincide');
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!res.ok) throw new Error(`consulta del pago status=${res.status}`);
    pago = (await res.json()) as Pago;
  } catch (e) {
    console.error(`[mp-anticipos] no se pudo consultar el pago id=${eventId}: ${e instanceof Error ? e.message : 'desconocido'}`);
    return new Response('payment lookup failed', { status: 500 });
  }

  const ref = leerReferenciaAnticipo(pago.external_reference);
  if (!ref || !candidatos.includes(ref.tenantId) || (pago.collector_id != null && String(pago.collector_id) !== mpUserId)) {
    console.warn(`[mp-anticipos] referencia no corresponde al vendedor id=${eventId}`);
    return new Response('reference mismatch', { status: 400 });
  }
  if (pago.status !== 'approved' || pago.currency_id !== 'MXN' || typeof pago.transaction_amount !== 'number') {
    log(eventId, type, body.date_created, `pago no aprobado (${pago.status ?? '-'}), sin cambios`);
    return Response.json({ received: true });
  }

  // Dedup: ganar el insert es lo que da derecho a confirmar y avisar.
  const { error: errClaim } = await db.from('mp_anticipo_events').insert({ event_id: eventId, tenant_id: ref.tenantId });
  if (errClaim) {
    if (errClaim.code === '23505') {
      log(eventId, type, body.date_created, 'repetido, omitido');
      return Response.json({ received: true, duplicate: true });
    }
    console.error(`[mp-anticipos] dedup code=${errClaim.code}${faltaMigracion(errClaim) ? ' (falta db/061)' : ''}`);
    return new Response('dedup unavailable', { status: 500 });
  }

  const folio = String(pago.id);
  const r = await confirmarAnticipo(db, { tenantId: ref.tenantId, bookingId: ref.bookingId, paymentId: folio, montoMxn: pago.transaction_amount });
  if (!r.ok && r.motivo === 'error') {
    // Liberar el claim para que el reintento de MP sí se procese.
    await db.from('mp_anticipo_events').delete().eq('event_id', eventId);
    console.error(`[mp-anticipos] confirmar falló id=${eventId}`);
    return new Response('handler error', { status: 500 });
  }

  if (r.ok && !r.yaEstaba) {
    await avisar(db, ref, (c) =>
      `Recibimos tu anticipo de ${pesos(pago.transaction_amount!)} para ${c.servicio} el ${c.cuando}. ` +
      `Tu cita queda confirmada. Folio del pago: ${folio}.`
    );
  } else if (!r.ok && r.motivo === 'liberada') {
    // El dinero ya está en la cuenta del negocio y el horario pudo tomarlo otro.
    // Otra notificación del mismo pago traería otro id de evento: este claim evita un segundo aviso.
    const { error } = await db.from('mp_anticipo_events').insert({ event_id: `liberada:${folio}`, tenant_id: ref.tenantId });
    console.warn(`[mp-anticipos] pago tras liberar el apartado id=${eventId} tenant=${ref.tenantId} booking=${ref.bookingId}`);
    if (!error) {
      await avisar(db, ref, (c) =>
        `Recibimos tu pago de ${pesos(pago.transaction_amount!)} (folio ${folio}), pero llegó después de que venció el apartado de ` +
        `${c.servicio} del ${c.cuando}. El negocio te contactará para reagendar o devolverte el dinero.`
      );
    }
  } else if (!r.ok) {
    console.warn(`[mp-anticipos] no se confirmó id=${eventId} motivo=${r.motivo}`);
  }

  log(eventId, type, body.date_created, `procesado (${r.ok ? (r.yaEstaba ? 'ya pagado' : 'confirmado') : r.motivo})`);
  return Response.json({ received: true });
}
