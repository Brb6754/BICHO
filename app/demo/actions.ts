'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendDemoRequestNotice } from '@/lib/email/sendDemoRequestNotice';

// A Server Action is a real, unauthenticated POST endpoint — this one has
// to be, since anyone visiting the landing page can submit it. So every
// field is validated here and not only in the form: the browser is not
// where this runs.
//
// Limits mirror the CHECK constraints in db/019_demo_requests.sql. Two
// layers on purpose: the database is the one that cannot be bypassed,
// these are the ones that produce a message a person can act on.
const LIMITS = {
  name: 120,
  business: 160,
  email: 200,
  phone: 30,
  vertical: 60,
  city: 120,
  plan: 60,
  message: 2000,
} as const;

export type DemoRequestInput = {
  name: string;
  business: string;
  email: string;
  phone: string;
  vertical: string;
  city: string;
  plan: string;
  message: string;
  // Honeypot. A real person never sees this field, so anything in it is
  // a bot filling every input it finds. Cheaper and less hostile than a
  // captcha, which this form does not warrant.
  website: string;
};

export type DemoRequestResult = { ok: true } | { ok: false; error: string };

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// Deliberately loose: the point is to catch a typo like "juan@" or a
// missing domain, not to adjudicate RFC 5322. A lead rejected by an
// over-strict regex is a lost customer.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitDemoRequest(input: DemoRequestInput): Promise<DemoRequestResult> {
  if (clean(input.website, 200)) {
    // Silent success for bots: telling them what tripped the trap only
    // helps them get past it next time. Nothing is stored or sent.
    return { ok: true };
  }

  const name = clean(input.name, LIMITS.name);
  const business = clean(input.business, LIMITS.business);
  const email = clean(input.email, LIMITS.email);
  const phone = clean(input.phone, LIMITS.phone);
  const vertical = clean(input.vertical, LIMITS.vertical);
  const city = clean(input.city, LIMITS.city);
  const plan = clean(input.plan, LIMITS.plan);
  const message = clean(input.message, LIMITS.message);

  if (name.length < 2) return { ok: false, error: 'Falta tu nombre.' };
  if (business.length < 2) return { ok: false, error: 'Falta el nombre de tu negocio.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Ese correo no se ve bien. Revísalo, por favor.' };
  if (phone.replace(/\D/g, '').length < 7) {
    return { ok: false, error: 'Deja un teléfono con el que te podamos contactar.' };
  }

  const lead = { name, business, email, phone, vertical, city, plan, message };

  const admin = createAdminClient();
  const { error } = await admin.from('demo_requests').insert({
    name,
    business,
    email,
    phone,
    vertical: vertical || null,
    city: city || null,
    plan: plan || null,
    message: message || null,
  });

  // The email is a notification, not the record — but it's also the only
  // channel left if the table isn't there, so it's awaited (a serverless
  // function can be frozen the moment it returns a response, and a
  // fire-and-forget send would be lost) and its result actually matters.
  const emailed = await sendDemoRequestNotice(lead);

  if (error) {
    console.error('submitDemoRequest insert failed', error);
    // Migration 019 not run yet, or the table is otherwise unreachable.
    // If the email got through, the lead is not lost and there is no
    // reason to make the visitor retype everything.
    if (emailed) return { ok: true };
    return {
      ok: false,
      error:
        'No pudimos guardar tu solicitud. Escríbenos directo a nonameynk@gmail.com y te contactamos hoy mismo.',
    };
  }

  return { ok: true };
}
