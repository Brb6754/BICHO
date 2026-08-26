'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

// Real writes, no redirect() involved — safe from the Server-Action
// redirect-bypasses-middleware issue documented in CLAUDE.md.

export async function setTenantStatus(tenantId: string, status: string) {
  const admin = createAdminClient();
  await admin.from('tenants').update({ status }).eq('id', tenantId);
  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath('/admin/tenants');
}

export async function setTenantPlan(tenantId: string, formData: FormData) {
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
};

// Called directly from the client (BrandEditor.tsx) via
// .bind(null, tenantId), same pattern as updateTemplateBlocks.
export async function updateTenantBranding(tenantId: string, branding: TenantBranding) {
  const admin = createAdminClient();
  const { error } = await admin.from('tenants').update(branding).eq('id', tenantId);
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
