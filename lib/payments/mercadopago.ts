import { randomUUID } from 'node:crypto';
import { PLAN_PRICE_MXN } from '@/lib/billing/trial';

// Cliente mínimo de la API de Mercado Pago (REST con fetch, sin SDK).
// Server-only: lee MP_ACCESS_TOKEN, que jamás debe llegar al navegador.
// Nunca se maneja un dato de tarjeta aquí: el checkout vive en MP (init_point).

const MP_API = 'https://api.mercadopago.com';

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error('MP_ACCESS_TOKEN no está configurada en este ambiente.');
  return t;
}

async function mpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    // Solo el status: el cuerpo de error de MP puede traer el correo del pagador.
    throw new Error(`Mercado Pago respondió ${res.status} en ${path.split('?')[0]}`);
  }
  return (await res.json()) as T;
}

export type MpPreapproval = {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  external_reference?: string | null;
  init_point?: string;
};

export type MpAuthorizedPayment = {
  id: number | string;
  preapproval_id: string;
  status?: string;
  payment?: { status?: string } | null;
};

/**
 * Suscripción mensual sin plan asociado, con pago pendiente: MP devuelve
 * un init_point al que se redirige al dueño para que ponga su tarjeta allá.
 * transaction_amount va en PESOS con 2 decimales (MXN, ISO 4217 exponente 2),
 * no en centavos como Stripe.
 */
export async function createTenantPreapproval(input: {
  tenantId: string;
  payerEmail: string;
  backUrl: string;
}): Promise<MpPreapproval> {
  return mpFetch<MpPreapproval>('/preapproval', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      reason: 'bicho — plan mensual',
      external_reference: input.tenantId,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(PLAN_PRICE_MXN.toFixed(2)),
        currency_id: 'MXN',
      },
    }),
  });
}

export function getPreapproval(id: string): Promise<MpPreapproval> {
  return mpFetch<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`);
}

export function getAuthorizedPayment(id: string): Promise<MpAuthorizedPayment> {
  return mpFetch<MpAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(id)}`);
}
