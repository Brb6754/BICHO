'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireTenantManager } from '@/lib/auth/access';
import { isMissingResellersTable } from '@/lib/resellers';
import {
  syncBothSidesOfReassignment,
  syncResellerSubscriptionQuantity,
} from '@/lib/payments/resellerSubscription';
import { refundResellerCharge } from '@/lib/payments/refunds';

// Everything here is internal-team only: reps are registered, paid and
// switched off by bicho, never by themselves. requireAdmin() is the
// first line of every action for that reason (a Server Action is a
// reachable endpoint for anyone with a session — see lib/auth/access).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ResellerInput = {
  name: string;
  email: string;
  phone: string;
  zone: string;
  // What bicho charges THIS rep per active business, per month. The rep
  // resells at their own price and keeps the difference.
  wholesalePriceMxn: number;
  // Only a prefill for the rep's own form.
  defaultRetailPriceMxn: number;
  // Day of the month bicho bills them.
  billingDay: number;
  notes: string;
};

function validate(input: ResellerInput): string | null {
  if (!input.name.trim()) return 'Falta el nombre del vendedor.';
  if (!EMAIL_REGEX.test(input.email.trim())) return 'El correo no es válido.';
  if (!Number.isFinite(input.wholesalePriceMxn) || input.wholesalePriceMxn < 0 || input.wholesalePriceMxn > 100000) {
    return 'El precio mayorista debe ser un monto entre 0 y 100,000 pesos.';
  }
  if (
    !Number.isFinite(input.defaultRetailPriceMxn) ||
    input.defaultRetailPriceMxn < 0 ||
    input.defaultRetailPriceMxn > 100000
  ) {
    return 'El precio sugerido de venta debe ser un monto entre 0 y 100,000 pesos.';
  }
  if (!Number.isInteger(input.billingDay) || input.billingDay < 1 || input.billingDay > 28) {
    return 'El día de cobro debe ser un número del 1 al 28.';
  }
  return null;
}

function row(input: ResellerInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim() || null,
    zone: input.zone.trim() || null,
    wholesale_price_mxn: Math.round(input.wholesalePriceMxn),
    default_retail_price_mxn: Math.round(input.defaultRetailPriceMxn),
    billing_day: Math.round(input.billingDay),
    notes: input.notes.trim() || null,
  };
}

export async function createReseller(
  input: ResellerInput
): Promise<{ ok: true; resellerId: string } | { ok: false; error: string }> {
  await requireAdmin();

  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const admin = createAdminClient();
  const { data, error } = await admin.from('resellers').insert(row(input)).select('id').single();

  if (error || !data) {
    if (isMissingResellersTable(error)) {
      return { ok: false, error: 'Falta correr db/016_resellers.sql en Supabase.' };
    }
    return { ok: false, error: error?.message ?? 'No se pudo registrar al vendedor.' };
  }

  revalidatePath('/admin/vendedores');
  return { ok: true, resellerId: data.id as string };
}

export async function updateReseller(resellerId: string, input: ResellerInput): Promise<{ error: string | null }> {
  await requireAdmin();

  const problem = validate(input);
  if (problem) return { error: problem };

  const admin = createAdminClient();
  const { error } = await admin.from('resellers').update(row(input)).eq('id', resellerId);
  if (error) {
    // Surfaced, never swallowed — the silent-save bug this codebase
    // already hit once with BrandEditor.
    return { error: error.message };
  }

  revalidatePath(`/admin/vendedores/${resellerId}`);
  revalidatePath('/admin/vendedores');
  return { error: null };
}

export async function setResellerActive(resellerId: string, active: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('resellers').update({ active }).eq('id', resellerId);
  if (error) throw new Error(`No se pudo cambiar el estado del vendedor: ${error.message}`);

  // A rep switched off here must not keep paying. The resync reads
  // `active` and sets cancel_at_period_end accordingly, so switching
  // them off ends the subscription at the period they already paid for
  // (rather than cancelling mid-period and stranding that money), and
  // switching them back on undoes it.
  await syncResellerSubscriptionQuantity(resellerId);

  revalidatePath(`/admin/vendedores/${resellerId}`);
  revalidatePath('/admin/vendedores');
}

// Gives the rep a login for vendedores.{dominio}. Same pattern (and the
// same password caveat) as createTenantOwner: the password is typed by
// the person sitting in front of the panel, this only forwards it to
// Supabase Auth. Reuses an existing auth user if that email already has
// an account, instead of failing.
export async function createResellerLogin(
  resellerId: string,
  input: { email: string; password: string }
): Promise<{ ok: true; email: string; reused: boolean } | { ok: false; error: string }> {
  await requireAdmin();

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return { ok: false, error: 'Correo inválido.' };
  if (!input.password || input.password.length < 10) {
    return { ok: false, error: 'La contraseña debe tener al menos 10 caracteres.' };
  }

  const admin = createAdminClient();
  let userId: string;
  let reused = false;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (createError) {
    const alreadyRegistered = createError.status === 422 || /already|exists/i.test(createError.message);
    if (!alreadyRegistered) return { ok: false, error: createError.message };
    const { data: usersPage } = await admin.auth.admin.listUsers();
    const existing = usersPage?.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) {
      return { ok: false, error: 'Ese correo ya está registrado pero no se pudo encontrar el usuario.' };
    }
    userId = existing.id;
    reused = true;
  } else if (created.user) {
    userId = created.user.id;
  } else {
    return { ok: false, error: 'No se pudo crear el usuario.' };
  }

  const { error: linkError } = await admin.from('resellers').update({ user_id: userId }).eq('id', resellerId);
  if (linkError) {
    // 23505 = unique_violation on resellers.user_id: that auth user is
    // already linked to a different rep, which would otherwise silently
    // hand one person two identities.
    const message =
      linkError.code === '23505'
        ? 'Ese usuario ya está vinculado a otro vendedor.'
        : `Usuario listo pero no se pudo vincular: ${linkError.message}`;
    return { ok: false, error: message };
  }

  revalidatePath(`/admin/vendedores/${resellerId}`);
  return { ok: true, email, reused };
}

// Attribution from the tenant side: used by the tenant detail page so a
// business that came in directly can be credited later, or moved.
export async function setTenantReseller(tenantId: string, resellerId: string | null) {
  await requireAdmin();
  const admin = createAdminClient();

  // Read the OLD owner before overwriting it. Moving a business changes
  // two bills, not one: the previous rep stops paying for it and the new
  // one starts. Syncing only the new rep is the obvious version of this
  // bug, and it leaves the previous rep paying for a business they no
  // longer have — which nobody notices until they complain.
  const { data: before } = await admin
    .from('tenants')
    .select('reseller_id')
    .eq('id', tenantId)
    .maybeSingle();
  const previousResellerId = (before?.reseller_id as string | null) ?? null;

  const { error } = await admin.from('tenants').update({ reseller_id: resellerId }).eq('id', tenantId);
  if (error) throw new Error(`No se pudo asignar el vendedor: ${error.message}`);

  // Awaited for the same reason as in setTenantStatus: a floating
  // promise does not survive the end of a serverless invocation.
  await syncBothSidesOfReassignment(previousResellerId, resellerId);

  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath('/admin/vendedores');
}

// The price the REP charges one of their businesses. Written by the rep
// (or by the internal team on their behalf), never by the business.
// requireTenantManager keeps a rep inside their own businesses.
export async function setTenantRetailPrice(
  tenantId: string,
  priceMxn: number | null
): Promise<{ error: string | null }> {
  await requireTenantManager(tenantId);

  if (priceMxn !== null && (!Number.isFinite(priceMxn) || priceMxn < 0 || priceMxn > 100000)) {
    return { error: 'El precio debe ser un monto entre 0 y 100,000 pesos.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('tenants')
    .update({ retail_price_mxn: priceMxn === null ? null : Math.round(priceMxn) })
    .eq('id', tenantId);

  if (error) {
    return {
      error: /retail_price_mxn/.test(error.message)
        ? 'Falta correr db/017_reseller_pricing.sql en Supabase.'
        : error.message,
    };
  }

  revalidatePath(`/vendedor/negocios/${tenantId}`);
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { error: null };
}

// Reverse a monthly charge. Internal team only: a rep refunding their
// own bill would be a rep deciding not to pay it. Everything that makes
// a refund safe or unsafe (already refunded, in dispute, a rail that
// cannot be reversed, an amount larger than what was paid) lives in
// lib/payments/refunds.ts so it is one set of rules, not a UI handler's
// opinion.
export async function refundResellerMonth(
  resellerId: string,
  stripeInvoiceId: string,
  amountMxn?: number | null
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();

  // The panel collects whole pesos because every other price in this app
  // is in whole pesos; Stripe needs centavos. Same x100 as everywhere
  // else, and the only place in this file where it happens.
  const amountCentavos =
    typeof amountMxn === 'number' && amountMxn > 0 ? Math.round(amountMxn) * 100 : null;

  const result = await refundResellerCharge({ resellerId, stripeInvoiceId, amountCentavos });

  revalidatePath(`/admin/vendedores/${resellerId}`);
  revalidatePath('/vendedor/suscripcion');

  return result.ok
    ? { ok: true, message: `Reembolsado ${(result.amountCentavos / 100).toLocaleString('es-MX')} MXN.` }
    : { ok: false, message: result.error };
}
