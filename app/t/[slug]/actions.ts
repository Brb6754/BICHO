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

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return { error: error?.message ?? null };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
