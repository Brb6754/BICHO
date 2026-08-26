import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Where a Supabase password-recovery link actually lands: it carries a
// one-time `code` (PKCE flow — @supabase/ssr's whole reason to exist is
// making this work correctly server-side) that has to be exchanged for a
// real session HERE, in a Route Handler, before the reset-password page
// can call auth.updateUser() — a Server Component can't set the cookie
// this exchange produces, only a Route Handler or Server Action can.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/reset-password';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
