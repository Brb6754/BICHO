'use server';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugError } from '@/lib/onboarding/slug';
import { giroById } from '@/lib/onboarding/presets';
import { normalizeMxWhatsapp } from '@/lib/onboarding/phone';
import { sendSignupConfirmation, sendSignupNotice } from '@/lib/email/registro';
import { tenantConfirmEmailUrl, tenantShareUrl } from '@/lib/urls';

// Alta sin Bruno: un dueño crea su cuenta, su negocio y su página solo.
//
// Son endpoints públicos sin sesión (cualquiera que abra /registro los
// puede llamar), así que TODO se revalida aquí aunque el formulario ya lo
// haya hecho. Se escribe con service_role porque el dueño todavía no
// existe cuando se crea el negocio; RLS (db/002) es lo que lo limita a
// SU negocio desde el primer login en el panel.

const TRIAL_DAYS = 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// shortcut: limiter en memoria (mismo patrón que app/api/reservar) — en
// Vercel cada instancia tiene su Map; el real es Vercel Firewall sobre
// /registro o @upstash/ratelimit si llega spam.
const WINDOW_MS = 10 * 60_000;
const MAX_SIGNUPS = 5;
const MAX_CHECKS = 60;
const log = new Map<string, number[]>();

function limited(key: string, max: number): boolean {
  const now = Date.now();
  const hits = (log.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  log.set(key, hits);
  return hits.length > max;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function checkSlug(slug: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (limited(`check:${await clientIp()}`, MAX_CHECKS)) {
    return { ok: false, error: 'Demasiados intentos, espera un momento.' };
  }
  const value = typeof slug === 'string' ? slug.trim() : '';
  const err = slugError(value);
  if (err) return { ok: false, error: err };
  const { data } = await createAdminClient().from('tenants').select('id').eq('slug', value).maybeSingle();
  return data ? { ok: false, error: 'Esa dirección ya la tiene otro negocio.' } : { ok: true };
}

export type RegistroInput = {
  name: string;
  giro: string;
  slug: string;
  services: { name: string; minutes: number; priceMxn: number }[];
  days: number[];
  opens: string;
  closes: string;
  email: string;
  whatsapp: string;
  password: string;
  website: string; // honeypot
};

export type RegistroResult = { ok: true; slug: string; email: string } | { ok: false; error: string };

function validate(input: RegistroInput): string | null {
  const name = input.name?.trim() ?? '';
  if (name.length < 2 || name.length > 80) return 'El nombre del negocio debe tener entre 2 y 80 caracteres.';
  if (!giroById(input.giro)) return 'Elige el giro de tu negocio.';
  const slugErr = slugError(input.slug?.trim() ?? '');
  if (slugErr) return slugErr;
  if (!Array.isArray(input.services) || input.services.length < 1 || input.services.length > 30) {
    return 'Agrega al menos un servicio (máximo 30).';
  }
  for (const s of input.services) {
    const n = typeof s?.name === 'string' ? s.name.trim() : '';
    if (!n || n.length > 80) return 'Cada servicio necesita un nombre (máximo 80 caracteres).';
    if (!Number.isInteger(s.minutes) || s.minutes < 5 || s.minutes > 600) return `«${n}»: la duración va de 5 a 600 minutos.`;
    if (typeof s.priceMxn !== 'number' || !Number.isFinite(s.priceMxn) || s.priceMxn < 0 || s.priceMxn > 100000) {
      return `«${n}»: el precio va de $0 a $100,000.`;
    }
  }
  if (!Array.isArray(input.days) || input.days.length < 1 || input.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return 'Elige al menos un día de atención.';
  }
  if (!TIME_RE.test(input.opens) || !TIME_RE.test(input.closes) || input.opens >= input.closes) {
    return 'La hora de cierre tiene que ser después de la de apertura.';
  }
  const email = input.email?.trim() ?? '';
  if (!EMAIL_RE.test(email) || email.length > 200) return 'Revisa tu correo.';
  if (!normalizeMxWhatsapp(input.whatsapp)) return 'Tu WhatsApp debe tener 10 dígitos.';
  if (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 72) {
    return 'La contraseña debe tener al menos 10 caracteres.';
  }
  return null;
}

export async function registerBusiness(input: RegistroInput): Promise<RegistroResult> {
  // Bots que llenan todo: error genérico, nada se crea.
  if (input.website) return { ok: false, error: 'No se pudo crear tu cuenta.' };
  if (limited(`signup:${await clientIp()}`, MAX_SIGNUPS)) {
    return { ok: false, error: 'Demasiados intentos. Espera unos minutos.' };
  }

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const giro = giroById(input.giro)!;
  const name = input.name.trim();
  const slug = input.slug.trim();
  const email = input.email.trim().toLowerCase();
  const whatsapp = normalizeMxWhatsapp(input.whatsapp)!;
  const admin = createAdminClient();

  // Antes de crear la cuenta, para no dejar usuarios huérfanos por un
  // slug ocupado. La carrera real la cierra el unique de tenants.slug.
  const { data: taken } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle();
  if (taken) return { ok: false, error: 'Esa dirección ya la tiene otro negocio. Elige otra.' };

  // El dueño confirma su correo antes de entrar al panel. generateLink
  // (tipo signup) crea el usuario SIN confirmar y devuelve el token sin
  // mandar nada: el correo sale por Resend, no por el SMTP de Supabase
  // (tope de pocos correos/hora en Free). createTenantOwner (admin/
  // vendedor) sigue confirmando directo.
  // Un correo existente NUNCA se reutiliza: sería colgarle un negocio
  // ajeno a la cuenta de otra persona.
  const { data: created, error: userError } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password: input.password,
  });
  if (userError || !created?.user) {
    const exists = userError?.code === 'email_exists' || /already|registered|exists/i.test(userError?.message ?? '');
    return {
      ok: false,
      error: exists
        ? 'Ese correo ya tiene cuenta. Entra desde el panel de tu negocio o usa otro correo.'
        : 'No se pudo crear tu cuenta. Intenta de nuevo.',
    };
  }
  const userId = created.user.id;

  // Misma copia de plantilla que createTenant (admin/vendedor): desde aquí
  // la página es del negocio, no una referencia viva a la plantilla.
  const { data: template } = await admin
    .from('templates')
    .select('blocks, design')
    .eq('vertical', giro.vertical)
    .maybeSingle();

  const row: Record<string, unknown> = {
    name,
    slug,
    vertical: giro.vertical,
    status: 'trial',
    plan: 'standard',
    timezone: 'America/Mexico_City',
    resource_label: giro.resourceLabel,
    trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString(),
  };
  if (template?.blocks) {
    row.page_blocks = template.blocks;
    row.page_design = template.design ?? {};
  }

  // Columnas de migraciones posteriores son opcionales (mismo patrón que
  // createTenant): si db/042 aún no corre, se crea sin trial_ends_at.
  const OPTIONAL_GROUPS = [['trial_ends_at'], ['resource_label'], ['page_blocks', 'page_design']];
  let { data: tenant, error: tenantError } = await admin.from('tenants').insert(row).select('id').single();
  for (const group of OPTIONAL_GROUPS) {
    if (!tenantError || tenantError.code === '23505') break;
    if (!group.some((k) => k in row)) continue;
    group.forEach((k) => delete row[k]);
    ({ data: tenant, error: tenantError } = await admin.from('tenants').insert(row).select('id').single());
  }

  if (tenantError || !tenant) {
    await admin.auth.admin.deleteUser(userId);
    return {
      ok: false,
      error: tenantError?.code === '23505'
        ? 'Esa dirección se acaba de ocupar. Elige otra.'
        : 'No se pudo crear tu negocio. Intenta de nuevo.',
    };
  }
  const tenantId = tenant.id as string;

  const { error: linkError } = await admin
    .from('business_users')
    .insert({ tenant_id: tenantId, user_id: userId, role: 'owner' });
  if (linkError) {
    await admin.from('tenants').delete().eq('id', tenantId);
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: 'No se pudo crear tu negocio. Intenta de nuevo.' };
  }

  // Un recurso (el dueño) con su horario, y sus servicios. Si algo de
  // esto falla el negocio ya existe y el dueño lo completa en su panel;
  // no vale tumbar la cuenta por eso.
  const { data: resource, error: resError } = await admin
    .from('resources')
    .insert({ tenant_id: tenantId, name, active: true })
    .select('id')
    .single();
  const { error: servError } = await admin.from('service_types').insert(
    input.services.map((s) => ({
      tenant_id: tenantId,
      name: s.name.trim(),
      duration_minutes: s.minutes,
      price_cents: Math.round(s.priceMxn * 100),
      requires_staff: true,
      active: true,
    }))
  );
  let schedError = null;
  if (resource) {
    ({ error: schedError } = await admin.from('resource_schedules').insert(
      [...new Set(input.days)].map((day_of_week) => ({
        tenant_id: tenantId,
        resource_id: resource.id,
        day_of_week,
        starts_at: input.opens,
        ends_at: input.closes,
      }))
    ));
  }
  if (resError || servError || schedError) {
    console.error('registro: catálogo incompleto', slug, resError ?? servError ?? schedError);
  }

  // Fuera de `tenants` (lectura pública): ver db/043. Si la migración no
  // corrió, el teléfono igual le llega a Bruno en el aviso.
  const { error: contactError } = await admin
    .from('tenant_owner_contacts')
    .insert({ tenant_id: tenantId, whatsapp });
  if (contactError) console.error('registro: no se guardó el WhatsApp', slug, contactError);

  // Correos al final y sin poder tumbar el alta: el negocio ya existe.
  // Si la confirmación no sale, el dueño la reenvía desde la pantalla
  // final o desde el login. Sin sesión: el panel exige correo confirmado.
  const props = created.properties;
  try {
    await sendSignupConfirmation(email, name, tenantConfirmEmailUrl(slug, props.hashed_token, props.verification_type));
  } catch (err) {
    console.error('registro: confirmación no enviada', slug, err);
  }
  try {
    await sendSignupNotice({
      business: name,
      giro: giro.label,
      url: tenantShareUrl(slug),
      ownerEmail: email,
      ownerWhatsapp: whatsapp,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('registro: aviso a Bruno no enviado', slug, err);
  }

  return { ok: true, slug, email };
}

// Reenvía el correo de confirmación. Público (la pantalla final y el
// login no tienen sesión confirmada), así que: rate limit, y solo manda
// si el correo es el del OWNER de ese negocio y sigue sin confirmar.
// Responde igual en todos los casos para no revelar qué correos existen.
// magiclink y no signup: signup pide la contraseña; verificar un magic
// link también confirma a un usuario sin confirmar.
export async function resendConfirmation(slug: string, email: string): Promise<{ ok: boolean; error?: string }> {
  if (limited(`resend:${await clientIp()}`, 5)) {
    return { ok: false, error: 'Demasiados intentos. Espera unos minutos.' };
  }
  const cleanSlug = typeof slug === 'string' ? slug.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (slugError(cleanSlug) || !EMAIL_RE.test(cleanEmail)) return { ok: true };

  const admin = createAdminClient();
  const { data: tenant } = await admin.from('tenants').select('id, name').eq('slug', cleanSlug).maybeSingle();
  if (!tenant) return { ok: true };
  const { data: owners } = await admin
    .from('business_users')
    .select('user_id')
    .eq('tenant_id', tenant.id)
    .eq('role', 'owner');
  for (const { user_id } of owners ?? []) {
    const { data } = await admin.auth.admin.getUserById(user_id);
    const user = data?.user;
    if (!user || user.email?.toLowerCase() !== cleanEmail || user.email_confirmed_at) continue;
    // Solo usuarios que ya existen: generateLink magiclink crearía uno nuevo si no.
    const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: cleanEmail });
    if (error || !link?.properties) {
      console.error('resendConfirmation: generateLink', cleanSlug, error);
      break;
    }
    await sendSignupConfirmation(
      cleanEmail,
      tenant.name,
      tenantConfirmEmailUrl(cleanSlug, link.properties.hashed_token, link.properties.verification_type)
    );
    break;
  }
  return { ok: true };
}
