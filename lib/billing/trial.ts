// Estado de cobro de un negocio, calculado (nunca guardado) a partir de
// su fila en `tenants`. Puro: sin red ni reloj implícito, para poder
// probarlo con fechas fijas.

export const TRIAL_GRACE_DAYS = 3;
const DAY_MS = 86_400_000;

export type TenantBillingRow = {
  status?: string | null;
  trial_ends_at?: string | null;
  past_due_since?: string | null;
  mp_preapproval_id?: string | null;
};

export type TenantAccess =
  | { kind: 'active' }
  | { kind: 'trial'; daysLeft: number }
  // reason: se acabó la prueba, o falló/canceló el cobro de un negocio activo.
  | { kind: 'grace'; daysLeft: number; reason: 'trial_ended' | 'payment_failed' }
  | { kind: 'suspended' };

function daysUntil(endMs: number, now: Date): number {
  return Math.max(0, Math.ceil((endMs - now.getTime()) / DAY_MS));
}

export function tenantAccess(row: TenantBillingRow | null | undefined, now: Date = new Date()): TenantAccess {
  if (!row) return { kind: 'active' };

  // Negocios de antes del cobro (demos, altas a mano) no tienen fecha de
  // prueba ni suscripción: nunca se bloquean, aunque un admin los haya
  // marcado suspended (eso hoy no bloquea nada y no vamos a empezar aquí).
  const managed = Boolean(row.trial_ends_at || row.mp_preapproval_id || row.past_due_since);
  if (!managed) return { kind: 'active' };

  if (row.status === 'suspended' || row.status === 'cancelled') return { kind: 'suspended' };

  if (row.status === 'active') {
    if (!row.past_due_since) return { kind: 'active' };
    const end = Date.parse(row.past_due_since) + TRIAL_GRACE_DAYS * DAY_MS;
    if (Number.isNaN(end)) return { kind: 'active' };
    return now.getTime() < end
      ? { kind: 'grace', daysLeft: daysUntil(end, now), reason: 'payment_failed' }
      : { kind: 'suspended' };
  }

  // status 'trial' (o cualquier otro valor con fecha de prueba).
  const trialEnd = row.trial_ends_at ? Date.parse(row.trial_ends_at) : NaN;
  if (Number.isNaN(trialEnd)) return { kind: 'active' };
  if (now.getTime() < trialEnd) return { kind: 'trial', daysLeft: daysUntil(trialEnd, now) };
  const graceEnd = trialEnd + TRIAL_GRACE_DAYS * DAY_MS;
  return now.getTime() < graceEnd
    ? { kind: 'grace', daysLeft: daysUntil(graceEnd, now), reason: 'trial_ended' }
    : { kind: 'suspended' };
}

/** La página pública deja de aceptar reservas nuevas solo en pausa. */
export function acceptsNewBookings(row: TenantBillingRow | null | undefined, now: Date = new Date()): boolean {
  return tenantAccess(row, now).kind !== 'suspended';
}

// ============================================================
// Transición por un aviso de Mercado Pago (ya re-consultado en su API).
// ============================================================

export type MpSignal = {
  preapprovalId: string;
  // authorized: suscripción vigente o cobro aprobado.
  // failed: cobro rechazado. cancelled: suscripción cancelada/pausada.
  // pending: aún no termina el checkout; no cambia nada.
  kind: 'authorized' | 'failed' | 'cancelled' | 'pending';
  mpStatus: string;
};

export type TenantBillingPatch = Partial<{
  status: string;
  mp_preapproval_id: string;
  mp_subscription_status: string;
  past_due_since: string | null;
}>;

/** Devuelve el UPDATE a aplicar sobre `tenants`, o null si no hay nada que hacer. */
export function billingPatchFor(current: TenantBillingRow, signal: MpSignal, now: Date = new Date()): TenantBillingPatch | null {
  if (signal.kind === 'authorized') {
    // Adopta este preapproval aunque sea uno nuevo (el dueño reintentó).
    return {
      status: 'active',
      mp_preapproval_id: signal.preapprovalId,
      mp_subscription_status: signal.mpStatus,
      past_due_since: null,
    };
  }

  // Un preapproval viejo o abandonado no puede tocar al vigente.
  if (current.mp_preapproval_id !== signal.preapprovalId) return null;
  if (signal.kind === 'pending') return null;

  // failed / cancelled: solo un negocio activo entra en gracia; uno en
  // prueba ya tiene su propio reloj (trial_ends_at).
  const patch: TenantBillingPatch = { mp_subscription_status: signal.mpStatus };
  if (current.status === 'active' && !current.past_due_since) patch.past_due_since = now.toISOString();
  return patch;
}

/** Mapea los estados de MP a la señal. Desconocido = pending (no actúa). */
export function preapprovalSignal(preapprovalId: string, status: string): MpSignal {
  const kind = status === 'authorized' ? 'authorized' : status === 'cancelled' || status === 'paused' ? 'cancelled' : 'pending';
  return { preapprovalId, kind, mpStatus: status };
}
