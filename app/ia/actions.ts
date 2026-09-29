'use server';

import { createAdminClient } from '@/lib/supabase/admin';

// A Server Action is a real, unauthenticated POST endpoint — this one has
// to be, since anyone reading the campaign page can submit it. So the
// email is validated here and not only in the form: the browser is not
// where this runs.
//
// Everything exported from a 'use server' module must be an async
// function. A plain `const` export here fails at module evaluation and
// tsc does NOT catch it — this project has already been bitten by that
// once (app/admin/(panel)/solicitudes).

const MAX_EMAIL = 200;
const MAX_SOURCE = 80;

export type SubscribeResult =
  | { ok: true; already: boolean }
  | { ok: false; error: string };

// Deliberately loose: the job is to catch "juan@" or a missing domain,
// not to adjudicate RFC 5322. A subscriber rejected by an over-strict
// regex is a subscriber lost to a regex.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNoti(input: {
  email: string;
  source: string;
  // Honeypot. A real person never sees this field, so anything in it is
  // a bot filling every input it finds. Cheaper and less hostile than a
  // captcha, which one email field does not warrant.
  website: string;
}): Promise<SubscribeResult> {
  if (typeof input.website === 'string' && input.website.trim()) {
    // Silent success for bots: telling them what tripped the trap only
    // helps them get past it next time. Nothing is stored.
    return { ok: true, already: false };
  }

  const email = (typeof input.email === 'string' ? input.email : '').trim().slice(0, MAX_EMAIL);
  const source = (typeof input.source === 'string' ? input.source : '').trim().slice(0, MAX_SOURCE);

  if (!email) return { ok: false, error: 'Escribe tu correo.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Ese correo no se ve completo. Revísalo.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('newsletter_subscribers')
    .insert({ email: email.toLowerCase(), source: source || null });

  if (error) {
    // 23505 is the unique constraint on email. Someone subscribing twice
    // did the right thing and should be told they are already on the
    // list — not shown an error for it.
    if (error.code === '23505') return { ok: true, already: true };

    // 42P01 / PGRST205 mean db/025 has not been run yet. Say that
    // plainly rather than "algo salió mal": it is the one failure here
    // with an exact fix, and a visitor who sees a generic error just
    // leaves.
    if (error.code === '42P01' || error.code === 'PGRST205') {
      console.error('subscribeToNoti: falta correr db/025_newsletter_subscribers.sql');
      return { ok: false, error: 'La suscripción todavía no está activa. Escríbenos y te agregamos a mano.' };
    }

    console.error('subscribeToNoti failed', error);
    return { ok: false, error: 'No se pudo guardar tu correo. Intenta de nuevo.' };
  }

  return { ok: true, already: false };
}
