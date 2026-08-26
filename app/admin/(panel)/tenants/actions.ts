'use server';

import { createAdminClient } from '@/lib/supabase/admin';

// Same slug format the DB enforces (db/001, tenants.slug_format check) —
// validated here too so the error message is friendly instead of a raw
// constraint violation.
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Called directly from the client (NewTenantForm.tsx) — no redirect()
// here, same reasoning as every other action in this codebase: it would
// bypass middleware.ts's subdomain rewrite. The client navigates itself
// after getting the new tenant's id back.
export async function createTenant(
  input: { name: string; slug: string; vertical: string }
): Promise<{ ok: true; tenantId: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  const slug = input.slug.trim();

  if (!name) {
    return { ok: false, error: 'Falta el nombre del negocio.' };
  }
  if (!SLUG_REGEX.test(slug)) {
    return { ok: false, error: 'El slug solo puede tener minúsculas, números y guiones (no al inicio ni al final).' };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    return { ok: false, error: 'Ese slug ya está en uso por otro tenant.' };
  }

  const { data, error } = await admin
    .from('tenants')
    .insert({ name, slug, vertical: input.vertical, status: 'trial', plan: 'standard' })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: 'No se pudo crear el tenant.' };
  }

  return { ok: true, tenantId: data.id as string };
}
