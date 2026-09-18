'use server';

import { createClient } from '@/lib/supabase/server';
import { authErrorMessage } from '@/lib/auth/authErrors';

// Same shape as the other two login surfaces (admin, business owner):
// never redirect() from a Server Action — it skips proxy.ts's subdomain
// rewrite. The client navigates itself after a successful sign-in.

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return { error: authErrorMessage(error?.message, 'No pudimos iniciar sesión. Inténtalo de nuevo.') };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { error: authErrorMessage(error?.message, 'No pudimos enviar el enlace. Inténtalo de nuevo.') };
}
