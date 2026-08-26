'use server';

import { createClient } from '@/lib/supabase/server';

// These return a result instead of calling redirect() themselves.
// redirect() inside a Server Action pre-renders the target route without
// going through middleware.ts — it never sees our /dashboard →
// /t/{slug}/dashboard rewrite, so it 404s. The actual navigation happens
// client-side instead (see LoginForm.tsx / SignOutButton.tsx), which
// triggers a real request that middleware does process correctly.

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
// actually landed (this tenant's own subdomain), and there's no
// reliable server-side way to reconstruct that without duplicating
// middleware.ts/proxy.ts's own subdomain logic here too.
export async function requestPasswordReset(email: string, redirectTo: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error: error?.message ?? null };
}
