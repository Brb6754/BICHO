import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Where a Supabase password-recovery link actually lands: it carries a
// one-time `code` (PKCE flow — @supabase/ssr's whole reason to exist is
// making this work correctly server-side) that has to be exchanged for a
// real session HERE, in a Route Handler, before the reset-password page
// can call auth.updateUser() — a Server Component can't set the cookie
// this exchange produces, only a Route Handler or Server Action can.
//
// También recibe la confirmación de correo del registro (/registro):
// `token_hash` + `type` salidos de admin.generateLink. verifyOtp confirma
// el correo y deja la sesión en este host.
const OTP_TYPES: EmailOtpType[] = ['signup', 'magiclink', 'email'];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next') ?? '/reset-password';
  // Solo paths propios: "//otro.com" sería un redirect abierto.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/reset-password';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      const msg = 'El enlace ya venció o ya se usó. Pide otro desde aquí con tu correo.';
      return NextResponse.redirect(`${origin}${next.replace(/\/dashboard$/, '/login')}?error=${encodeURIComponent(msg)}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
