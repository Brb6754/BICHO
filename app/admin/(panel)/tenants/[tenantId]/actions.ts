'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireTenantManager } from '@/lib/auth/access';
import { syncSubscriptionForTenant } from '@/lib/payments/resellerSubscription';

// Real writes, no redirect() involved — safe from the Server-Action
// redirect-bypasses-middleware issue documented in CLAUDE.md.

// Lifecycle (suspend/reactivate) and plan stay with the internal team:
// a sales rep manages the business's page and access, not its account
// standing with the platform.
export async function setTenantStatus(tenantId: string, status: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from('tenants').update({ status }).eq('id', tenantId);

  // This line is the whole reason billing stays correct. bicho charges
  // each rep for their ACTIVE businesses, so suspending or reactivating
  // one is a change to somebody's bill. syncSubscriptionForTenant
  // recomputes the count from the database and sends the new quantity to
  // Stripe; it resolves the rep itself and does nothing for a business
  // that came in directly (reseller_id is null).
  //
  // Awaited, not fired and forgotten: on Vercel nothing is guaranteed to
  // keep running once the response is sent, so a floating promise here
  // would silently skip the resync on exactly the deploys that matter.
  // It never throws — a Stripe outage must not stop the internal team
  // from suspending a business.
  await syncSubscriptionForTenant(tenantId);

  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath('/admin/tenants');
  revalidatePath('/admin/vendedores');
}

export async function setTenantPlan(tenantId: string, formData: FormData) {
  await requireAdmin();
  const plan = formData.get('plan') as string;
  const admin = createAdminClient();
  await admin.from('tenants').update({ plan }).eq('id', tenantId);
  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath('/admin/tenants');
}

export type TenantBranding = {
  description: string | null;
  theme: string;
  theme_mode: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_heading: string;
  font_body: string;
  logo_url: string | null;
  logo_mobile_url: string | null;
  favicon_url: string | null;
  cover_image_url: string | null;
  profile_image_url: string | null;
  // db/024. Nullable because a business that sets neither keeps exactly
  // the old behaviour ("Profesional", no address line).
  resource_label: string | null;
  resource_question: string | null;
  location: string | null;
};

// Called directly from the client (BrandEditor.tsx) via
// .bind(null, tenantId), same pattern as updateTemplateBlocks.
export async function updateTenantBranding(tenantId: string, branding: TenantBranding) {
  await requireTenantManager(tenantId);
  const admin = createAdminClient();
  let { error } = await admin.from('tenants').update(branding).eq('id', tenantId);

  // 42703 is "column does not exist": db/024 hasn't been run yet. Retry
  // without the two columns it adds, so a pending migration costs the
  // two new fields rather than every colour on the form. Same fallback
  // this project already uses for page_blocks and reseller_id.
  if (error?.code === '42703') {
    const { resource_label: _rl, location: _loc, resource_question: _rq, ...rest } = branding;
    ({ error } = await admin.from('tenants').update(rest).eq('id', tenantId));
  }

  if (error) {
    // Was silently swallowed before — BrandEditor would show "Guardado ✓"
    // even when the write never happened, which is exactly how this bug
    // was reported: edit colors, save, come back later, find the old
    // (default) values still there with no indication anything failed.
    throw new Error(`No se pudo guardar la marca: ${error.message}`);
  }
  revalidatePath(`/admin/tenants/${tenantId}`);

  const { data: tenant } = await admin.from('tenants').select('slug').eq('id', tenantId).single();
  if (tenant) {
    revalidatePath(`/t/${tenant.slug}/reservar`);
  }
}

// Called directly from the client (OwnerCreator.tsx / NewTenantForm.tsx)
// with whatever email/password the person managing the panel typed into
// the form themselves — this code never receives a credential chosen or
// entered by Claude, only forwards what the browser form submitted,
// exactly like any other account-creation form on the web.
export async function createTenantOwner(
  tenantId: string,
  input: { email: string; password: string }
): Promise<{ ok: true; email: string; reused: boolean } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Correo inválido.' };
  }
  if (!password || password.length < 10) {
    return { ok: false, error: 'La contraseña debe tener al menos 10 caracteres.' };
  }

  // Creating a login is the most powerful thing in this file: gate it
  // before touching the auth admin API.
  await requireTenantManager(tenantId);

  const admin = createAdminClient();

  let userId: string;
  let reused = false;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    // Ya existe un usuario con ese correo (pasó varias veces durante
    // pruebas de este proyecto) — se reutiliza como dueño en vez de
    // fallar, en vez de obligar a usar un correo distinto.
    const alreadyRegistered = createError.status === 422 || /already|exists/i.test(createError.message);
    if (!alreadyRegistered) {
      return { ok: false, error: createError.message };
    }
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

  const { error: linkError } = await admin
    .from('business_users')
    .upsert({ tenant_id: tenantId, user_id: userId, role: 'owner' }, { onConflict: 'tenant_id,user_id' });

  if (linkError) {
    return { ok: false, error: `Usuario listo pero no se pudo vincular como dueño: ${linkError.message}` };
  }

  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true, email, reused };
}

// Saves THIS business's own page. Writes to tenants.page_blocks, never
// to templates.blocks — that separation (db/015) is the whole point:
// a template is a starting point, and a business editing its own page
// must not reach back and rewrite the page of every other business on
// the same vertical.
export async function updateTenantPage(tenantId: string, blocks: unknown) {
  await requireTenantManager(tenantId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tenants')
    .update({ page_blocks: blocks })
    .eq('id', tenantId)
    .select('slug')
    .single();
  if (error) {
    // Surfaced, not swallowed — the silent-save bug this codebase
    // already hit once with BrandEditor.
    throw new Error('No se pudo guardar la página: ' + error.message);
  }
  revalidatePath('/admin/tenants/' + tenantId);
  // The customer-facing page is the thing that actually changed.
  // revalidatePath takes the real file route, not the rewritten
  // public URL — see the note in CLAUDE.md.
  if (data?.slug) revalidatePath('/t/' + data.slug + '/reservar');
}

// The WhatsApp add-on switch. Guarded by requireTenantManager, so the
// internal team can flip it for anyone and a reseller only for the
// businesses they brought — the same rule that governs branding and the
// owner's login.
//
// This is a billing switch, not a preference: while it is on, every
// confirmation costs real money (see db/021_whatsapp_addon.sql), so it
// has to be impossible to turn on for someone else's business.
export async function setTenantWhatsapp(tenantId: string, enabled: boolean) {
  await requireTenantManager(tenantId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tenants')
    .update({ whatsapp_enabled: enabled })
    .eq('id', tenantId)
    .select('id');

  if (error) {
    // 42703 = column missing: db/021 hasn't been run in this environment.
    if (error.code === '42703') {
      throw new Error('Falta correr db/021_whatsapp_addon.sql en Supabase.');
    }
    throw new Error(`No se pudo cambiar WhatsApp: ${error.message}`);
  }
  if (!data || data.length === 0) throw new Error('Ese negocio ya no existe.');

  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath(`/vendedor/negocios/${tenantId}`);
}

/**
 * Qué productos tiene contratado el negocio.
 *
 * Pasa por `requireTenantManager`, igual que el interruptor de
 * WhatsApp: un vendedor puede prender y apagar productos en los
 * negocios que él trajo, nunca en los de otro. Es un interruptor de
 * cobro, no una preferencia.
 */
export async function setTenantProduct(
  tenantId: string,
  producto: 'reservas' | 'cotizaciones' | 'facturacion',
  enabled: boolean
) {
  await requireTenantManager(tenantId);

  const columna =
    producto === 'reservas'
      ? 'reservas_enabled'
      : producto === 'cotizaciones'
        ? 'quotes_enabled'
        : 'facturacion_enabled';

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tenants')
    .update({ [columna]: enabled })
    .eq('id', tenantId)
    .select('id');

  if (error) {
    // 42703 = la columna no existe todavía en este ambiente.
    if (error.code === '42703') {
      throw new Error(
        producto === 'facturacion'
          ? 'Falta correr db/035_facturacion_product.sql en Supabase.'
          : 'Falta correr db/027_quotes.sql y db/028_product_flags.sql en Supabase.'
      );
    }
    throw new Error(`No se pudo cambiar el producto: ${error.message}`);
  }
  if (!data || data.length === 0) throw new Error('Ese negocio ya no existe.');

  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath(`/vendedor/negocios/${tenantId}`);
}
