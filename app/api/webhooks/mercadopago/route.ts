import { createAdminClient } from '@/lib/supabase/admin';
import { verifyMercadoPagoSignature } from '@/lib/payments/mercadopagoSignature';
import { getAuthorizedPayment, getPreapproval } from '@/lib/payments/mercadopago';
import { billingPatchFor, preapprovalSignal, type MpSignal } from '@/lib/billing/trial';
import { grantReferralCredit } from '@/lib/referidos/grant';

// Webhook de Mercado Pago para la suscripción mensual de cada negocio.
// URL: https://reservas-saas-sigma.vercel.app/api/webhooks/mercadopago
// (proxy.ts no reescribe /api, así que resuelve en cualquier host).
//
// Orden: firma -> dedup -> re-consultar el recurso en la API de MP ->
// recién ahí tocar `tenants`. El cuerpo NO está firmado por MP, así que
// solo se usa para saber qué consultar, nunca para decidir el estado.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MpNotification = { id?: string | number; type?: string; action?: string; date_created?: string; data?: { id?: string | number } };

// Solo id/tipo/fecha: el resto puede traer datos del pagador.
function logEvent(id: string, type: string, created: string | undefined, note: string): void {
  console.log(`[mp-webhook] ${note} id=${id} type=${type} created=${created ?? '-'}`);
}

// HMAC-SHA256 sobre id:<data.id>;request-id:<x-request-id>;ts:<ts>; en lib/payments/mercadopagoSignature.ts
// @pagokit:signature-verified
export async function POST(request: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[mp-webhook] MP_WEBHOOK_SECRET is not set');
    return new Response('webhook not configured', { status: 500 });
  }

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return new Response('payload too large', { status: 413 });

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return new Response('payload too large', { status: 413 });

  let body: MpNotification = {};
  try {
    body = rawBody ? (JSON.parse(rawBody) as MpNotification) : {};
  } catch {
    return new Response('bad json', { status: 400 });
  }

  // MP firma el data.id que manda en la query string; el del cuerpo es respaldo.
  const url = new URL(request.url);
  const dataId = url.searchParams.get('data.id') ?? (body.data?.id != null ? String(body.data.id) : null);
  const requestId = request.headers.get('x-request-id');

  const verified = verifyMercadoPagoSignature({
    signatureHeader: request.headers.get('x-signature'),
    requestId,
    dataId,
    secret,
  });
  if (!verified.ok) {
    console.warn(`[mp-webhook] rejected signature reason=${verified.reason}`);
    return new Response('invalid signature', { status: 400 });
  }

  const type = body.type ?? url.searchParams.get('type') ?? 'unknown';
  const eventId = body.id != null ? String(body.id) : (requestId ?? `${type}:${dataId}`);

  if (!dataId || (type !== 'subscription_preapproval' && type !== 'subscription_authorized_payment')) {
    logEvent(eventId, type, body.date_created, 'ignored');
    return Response.json({ received: true });
  }

  const admin = createAdminClient();

  // Dedup: ganar el insert es lo que da derecho a procesar.
  const { error: claimError } = await admin.from('webhook_events_processed').insert({
    provider: 'mercadopago',
    event_id: eventId,
    event_type: type,
    event_created_at: body.date_created ?? null,
  });
  if (claimError) {
    if (claimError.code === '23505') {
      logEvent(eventId, type, body.date_created, 'duplicate, skipped');
      return Response.json({ received: true, duplicate: true });
    }
    console.error(`[mp-webhook] dedup insert failed code=${claimError.code}`);
    return new Response('dedup unavailable', { status: 500 });
  }

  try {
    let signal: MpSignal;
    let preapprovalId: string;

    if (type === 'subscription_preapproval') {
      preapprovalId = dataId;
      const pre = await getPreapproval(preapprovalId);
      signal = preapprovalSignal(pre.id, pre.status);
      await applySignal(admin, pre.external_reference ?? null, signal);
    } else {
      const ap = await getAuthorizedPayment(dataId);
      preapprovalId = ap.preapproval_id;
      const pre = await getPreapproval(preapprovalId);
      const payStatus = ap.payment?.status ?? '';
      signal =
        payStatus === 'approved'
          ? { preapprovalId, kind: 'authorized', mpStatus: pre.status }
          : payStatus === 'rejected'
            ? { preapprovalId, kind: 'failed', mpStatus: `payment_${payStatus}` }
            : { preapprovalId, kind: 'pending', mpStatus: pre.status };
      // Un cobro aprobado sobre una suscripción ya cancelada no reactiva nada.
      if (signal.kind === 'authorized' && pre.status !== 'authorized') signal = preapprovalSignal(pre.id, pre.status);
      await applySignal(admin, pre.external_reference ?? null, signal);
    }
  } catch (error) {
    // Liberar el claim para que el reintento de MP sí se procese.
    await admin.from('webhook_events_processed').delete().eq('provider', 'mercadopago').eq('event_id', eventId);
    console.error(`[mp-webhook] handler failed id=${eventId} type=${type}: ${error instanceof Error ? error.message : 'unknown'}`);
    return new Response('handler error', { status: 500 });
  }

  logEvent(eventId, type, body.date_created, 'processed');
  return Response.json({ received: true });
}

async function applySignal(admin: ReturnType<typeof createAdminClient>, tenantId: string | null, signal: MpSignal) {
  // external_reference lo puso nuestro servidor al crear el preapproval.
  if (!tenantId || !UUID_RE.test(tenantId)) return;

  const { data: tenant, error } = await admin.from('tenants').select('*').eq('id', tenantId).maybeSingle();
  if (error) throw new Error(`tenant lookup failed code=${error.code}`);
  if (!tenant) return;

  // shortcut: sin orden de eventos; un cobro rechazado que llegue tarde, después de
  // uno aprobado, abre gracia por error (el siguiente aprobado la cierra). Si pasa en
  // la práctica, comparar la fecha del authorized_payment antes de aplicar.
  const patch = billingPatchFor(tenant, signal);
  if (!patch) return;

  const { error: updateError } = await admin.from('tenants').update(patch).eq('id', tenantId);
  if (updateError) throw new Error(`tenant update failed code=${updateError.code}`);

  // Referidos (db/052): el primer cobro autorizado le gana un mes a quien lo refirió.
  if (signal.kind === 'authorized') await grantReferralCredit(admin, tenantId);
}
