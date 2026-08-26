'use server';

import { createClient } from '@/lib/supabase/server';

// Same pattern as app/t/[slug]/actions.ts: no redirect() in here — it
// bypasses middleware.ts's subdomain rewrite when called from a Server
// Action. Actual navigation happens client-side (see LoginForm.tsx).

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return { error: error?.message ?? null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

// redirectTo comes from the client (window.location.origin) rather than
// being built here — it has to match wherever this specific request
// actually landed (admin subdomain, in this file's case), and there's no
// reliable server-side way to reconstruct that without duplicating
// middleware.ts/proxy.ts's own subdomain logic here too.
export async function requestPasswordReset(email: string, redirectTo: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error: error?.message ?? null };
}
