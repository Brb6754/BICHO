'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { isReservedSlug } from '@/lib/domains';
import { getActor } from '@/lib/auth/access';
import { syncResellerSubscriptionQuantity } from '@/lib/payments/resellerSubscription';

// Same slug format the DB enforces (db/001, tenants.slug_format check) —
// validated here too so the error message is friendly instead of a raw
// constraint violation.
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;


// Called directly from the client (NewTenantForm.tsx) — no redirect()
// here, same reasoning as every other action in this codebase: it would
// bypass middleware.ts's subdomain rewrite. The client navigates itself
// after getting the new tenant's id back.
export async function createTenant(
  input: {
    name: string;
    slug: string;
    vertical: string;
    resellerId?: string | null;
    // What the rep will charge this business per month. Their number, not
    // bicho's: bicho only ever bills the rep their wholesale price.
    retailPriceMxn?: number | null;
  }
): Promise<{ ok: true; tenantId: string } | { ok: false; error: string }> {
  // Both panels create businesses: the internal team and a sales rep
  // (who is always credited with the ones they create — a rep can't
  // attribute a business to somebody else).
  const actor = await getActor();
  if (!actor) {
    return { ok: false, error: 'Tu sesión expiró. Vuelve a entrar.' };
  }

  const name = input.name.trim();
  const slug = input.slug.trim();

  if (!name) {
    return { ok: false, error: 'Falta el nombre del negocio.' };
  }
  // A slug is a subdomain. Taking one of ours would make the business
  // unreachable — the proxy would route that host somewhere else and
  // nobody would see an error, the page would just never load.
  if (isReservedSlug(slug)) {
    return { ok: false, error: `«${slug}» es un nombre reservado del sistema. Elige otro.` };
  }

  if (!SLUG_REGEX.test(slug)) {
    return { ok: false, error: 'El slug solo puede tener minúsculas, números y guiones (no al inicio ni al final).' };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    return { ok: false, error: 'Ese slug ya está en uso por otro negocio.' };
  }

  // Snapshot the template into the tenant. THIS is what makes a
  // template a starting point rather than a live dependency: from here
  // on the business owns its page, and a later edit to the template
  // can't rewrite a page that is already serving customers.
  const { data: template } = await admin
    .from('templates')
    .select('blocks, design')
    .eq('vertical', input.vertical)
    .maybeSingle();

  const row: Record<string, unknown> = {
    name,
    slug,
    vertical: input.vertical,
    status: 'trial',
    plan: 'standard',
  };
  if (template?.blocks) {
    row.page_blocks = template.blocks;
    row.page_design = template.design ?? {};
  }
  const resellerId = actor.kind === 'reseller' ? actor.resellerId : (input.resellerId ?? null);
  if (resellerId) {
    row.reseller_id = resellerId;
    if (typeof input.retailPriceMxn === 'number' && input.retailPriceMxn >= 0) {
      row.retail_price_mxn = Math.round(input.retailPriceMxn);
    }
  }

  // Columns added by later migrations are optional here: page_blocks/
  // page_design come from db/015 and reseller_id from db/016, and an
  // environment that hasn't run one of them must still be able to
  // create a business. Each failed insert drops the next optional group
  // and retries, rather than failing the whole creation.
  const OPTIONAL_GROUPS = [['reseller_id', 'retail_price_mxn'], ['page_blocks', 'page_design']];

  let { data, error } = await admin.from('tenants').insert(row).select('id').single();
  for (const group of OPTIONAL_GROUPS) {
    if (!error) break;
    if (!group.some((key) => key in row)) continue;
    group.forEach((key) => delete row[key]);
    ({ data, error } = await admin.from('tenants').insert(row).select('id').single());
  }

  if (error || !data) {
    return { ok: false, error: 'No se pudo crear el negocio.' };
  }

  // Keep the rep's Stripe quantity honest from the very first business.
  //
  // A business is created with status 'trial', so today this resync is
  // almost always a no-op: nothing billable changed. It is here anyway
  // because the invariant that matters is "every write to tenants that
  // could affect a rep's active count is followed by a resync" — an
  // invariant that only holds if it has no exceptions. The day someone
  // changes the default status, or adds a "create as active" path, this
  // line is what stops the bill from silently falling behind.
  //
  // The function recomputes the count from the database and never throws.
  if (resellerId) {
    await syncResellerSubscriptionQuantity(resellerId);
  }

  return { ok: true, tenantId: data.id as string };
}
