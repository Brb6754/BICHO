// Turning a Stripe failure into something a sales rep can act on.
//
// Two audiences, two strings, and they are not the same string. The rep
// sees Spanish, second person, and always a next action — "tu banco
// rechazó la tarjeta, prueba con otra" is useful; "card_declined" is
// not. The server log gets the machine-readable code so an incident can
// be searched. This file is pure data + pure functions on purpose: no
// SDK import, no DB access, nothing that can fail while we are already
// handling a failure.
//
// Rule 6: nothing in here ever formats a whole Stripe object into a
// message. Only the code and the declineCode, both of which are
// enumerated values, never PII.

export type PaymentErrorCode =
  | 'card_declined'
  | 'insufficient_funds'
  | 'expired_card'
  | 'incorrect_cvc'
  | 'processing_error'
  | 'authentication_required'
  | 'rate_limit'
  | 'invalid_request'
  | 'api_error'
  | 'connection_error'
  | 'not_configured'
  | 'no_payment_method'
  | 'unknown';

export type PaymentError = {
  code: PaymentErrorCode;
  /** Spanish, shown to the rep. Always says what to do next. */
  message: string;
  /** Can the same call be retried unchanged, or does a human have to act? */
  retryable: boolean;
  /** Stripe's own decline_code, kept for the log. Never shown raw. */
  declineCode?: string;
};

const MESSAGES: Record<PaymentErrorCode, { message: string; retryable: boolean }> = {
  card_declined: {
    message: 'Tu banco rechazó la tarjeta. Prueba con otra o llama a tu banco para autorizar el cargo.',
    retryable: false,
  },
  insufficient_funds: {
    message: 'La tarjeta no tiene fondos suficientes. Prueba con otra tarjeta.',
    retryable: false,
  },
  expired_card: {
    message: 'La tarjeta ya venció. Registra la nueva desde "Cambiar tarjeta".',
    retryable: false,
  },
  incorrect_cvc: {
    message: 'El código de seguridad no coincide. Vuelve a capturar la tarjeta.',
    retryable: false,
  },
  processing_error: {
    message: 'Hubo un problema al procesar la tarjeta. Vuelve a intentar en un momento.',
    retryable: true,
  },
  authentication_required: {
    message: 'Tu banco pide confirmar el cargo. Abre la app de tu banco y autoriza, luego vuelve a intentar.',
    retryable: true,
  },
  rate_limit: {
    message: 'Demasiados intentos seguidos. Espera unos segundos y vuelve a intentar.',
    retryable: true,
  },
  invalid_request: {
    message: 'No pudimos completar la operación con los datos actuales. Avísale al equipo de bicho.',
    retryable: false,
  },
  api_error: {
    message: 'Stripe tuvo un problema de su lado. Vuelve a intentar en unos minutos.',
    retryable: true,
  },
  connection_error: {
    message: 'No pudimos conectar con Stripe. Revisa tu internet y vuelve a intentar.',
    retryable: true,
  },
  not_configured: {
    message: 'Los pagos todavía no están configurados en este ambiente. Avísale al equipo de bicho.',
    retryable: false,
  },
  no_payment_method: {
    message: 'Todavía no hay una tarjeta guardada. Registra una para activar tu suscripción.',
    retryable: false,
  },
  unknown: {
    message: 'Algo falló al procesar el pago. Vuelve a intentar; si sigue igual, avísale al equipo de bicho.',
    retryable: true,
  },
};

export function paymentError(code: PaymentErrorCode, declineCode?: string): PaymentError {
  const base = MESSAGES[code] ?? MESSAGES.unknown;
  return { code, message: base.message, retryable: base.retryable, declineCode };
}

// Stripe's decline_code is far more specific than its `code`, and it is
// the one that tells the rep whether to call the bank or just use a
// different card. Mapped before the coarser type check for that reason.
const DECLINE_CODE_MAP: Record<string, PaymentErrorCode> = {
  insufficient_funds: 'insufficient_funds',
  expired_card: 'expired_card',
  incorrect_cvc: 'incorrect_cvc',
  invalid_cvc: 'incorrect_cvc',
  processing_error: 'processing_error',
  authentication_required: 'authentication_required',
  card_velocity_exceeded: 'card_declined',
  generic_decline: 'card_declined',
  do_not_honor: 'card_declined',
  lost_card: 'card_declined',
  stolen_card: 'card_declined',
};

const STRIPE_CODE_MAP: Record<string, PaymentErrorCode> = {
  card_declined: 'card_declined',
  expired_card: 'expired_card',
  incorrect_cvc: 'incorrect_cvc',
  processing_error: 'processing_error',
  authentication_required: 'authentication_required',
  payment_intent_authentication_failure: 'authentication_required',
  resource_missing: 'invalid_request',
  parameter_invalid_integer: 'invalid_request',
};

// The shape is duck-typed rather than `instanceof Stripe.errors.*` so
// this file stays free of the SDK import: a Server Action catching an
// error has no idea which layer threw it, and importing the SDK into a
// module that only formats strings is how a client bundle accidentally
// grows a payments dependency.
type StripeLikeError = {
  type?: string;
  code?: string;
  decline_code?: string;
  statusCode?: number;
  message?: string;
};

export function toPaymentError(err: unknown): PaymentError {
  if (!err || typeof err !== 'object') return paymentError('unknown');
  const e = err as StripeLikeError;

  const declineCode = typeof e.decline_code === 'string' ? e.decline_code : undefined;
  if (declineCode && DECLINE_CODE_MAP[declineCode]) {
    return paymentError(DECLINE_CODE_MAP[declineCode], declineCode);
  }

  if (typeof e.code === 'string' && STRIPE_CODE_MAP[e.code]) {
    return paymentError(STRIPE_CODE_MAP[e.code], declineCode);
  }

  switch (e.type) {
    case 'StripeCardError':
      return paymentError('card_declined', declineCode);
    case 'StripeRateLimitError':
      return paymentError('rate_limit');
    case 'StripeInvalidRequestError':
      return paymentError('invalid_request');
    case 'StripeConnectionError':
      return paymentError('connection_error');
    case 'StripeAPIError':
      return paymentError('api_error');
    case 'StripeAuthenticationError':
      // Our key is wrong or revoked. This is never the rep's fault and
      // must never read like it is.
      return paymentError('not_configured');
    default:
      break;
  }

  if (e.statusCode === 429) return paymentError('rate_limit');
  if (typeof e.statusCode === 'number' && e.statusCode >= 500) return paymentError('api_error');

  return paymentError('unknown');
}

// What goes to console.error. Deliberately not the error object: a
// Stripe error carries the full request payload on `raw`, which for a
// payment-method call includes cardholder details. Rule 6 applies to
// error logs exactly as much as it applies to webhook logs.
export function describeForLog(err: PaymentError, operation: string): string {
  const decline = err.declineCode ? ` decline=${err.declineCode}` : '';
  return `[payments] ${operation} failed code=${err.code}${decline}`;
}
